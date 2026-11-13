#!/usr/bin/env python3
"""Split exported OSM JSON into fixed 2km tiles, without changing OSM elements.

Rules: docs/rules/map-tiles.md
No network calls, clipping, simplification or game-specific processing.
pip install ijson pyproj shapely
"""
from __future__ import annotations
import argparse
from collections import Counter, OrderedDict
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import shutil
import tempfile
import ijson
from pyproj import Transformer
from shapely.geometry import Point, LineString, Polygon, box
from shapely.errors import GEOSException
from shapely.validation import make_valid

LAT, LON = 35.78444, 139.90061
TILE_M = 2000
LIMIT_BYTES = 95_000_000
TRANSFORM = Transformer.from_crs('EPSG:4326', 'EPSG:6677', always_xy=True)
E0, N0 = TRANSFORM.transform(LON, LAT)
AREA_KEYS = {'building', 'landuse', 'leisure', 'amenity', 'natural', 'shop', 'tourism'}


def grid_index(coord: float, origin: float) -> int:
    return math.floor((coord - origin + TILE_M / 2) / TILE_M)


def geometry_candidates(element: dict):
    """Project for placement calculations ONLY. Never modify input element."""
    if element.get('type') == 'node':
        lat, lon = element.get('lat'), element.get('lon')
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            return None, []
        east, north = TRANSFORM.transform(lon, lat)
        if not math.isfinite(east) or not math.isfinite(north):
            return None, []
        return Point(east, north), [(grid_index(east, E0), grid_index(north, N0))]
    if element.get('type') != 'way':
        return None, []
    geo = element.get('geometry') or []
    if len(geo) < 2:
        return None, []
    try:
        east, north = TRANSFORM.transform([p['lon'] for p in geo], [p['lat'] for p in geo])
        coords = list(zip(east, north))
        if not all(math.isfinite(x) and math.isfinite(y) for x, y in coords):
            return None, []
        tags = element.get('tags') or {}
        polygonal = (len(coords) >= 4 and coords[0] == coords[-1]
                     and (tags.get('area') == 'yes' or any(k in tags for k in AREA_KEYS)))
        shape = Polygon(coords) if polygonal else LineString(coords)
        if not shape.is_valid:
            shape = make_valid(shape)  # Test geometry only; source JSON is untouched.
        if shape.is_empty:
            return None, []
        west, south, eastmost, northmost = shape.bounds
        # Conservative candidate range includes a neighboring tile if a way
        # touches a tile boundary; point ownership remains half-open.
        eps = 0.000001
        xmin, xmax = grid_index(west - eps, E0), grid_index(eastmost + eps, E0)
        ymin, ymax = grid_index(south - eps, N0), grid_index(northmost + eps, N0)
        return shape, [(x, y) for x in range(xmin, xmax + 1)
                       for y in range(ymin, ymax + 1)]
    except (ValueError, TypeError, KeyError, GEOSException):
        return None, []


def assigned_tiles(element: dict) -> list[tuple[int, int]]:
    shape, candidates = geometry_candidates(element)
    if shape is None:
        return []
    if element.get('type') == 'node':
        return candidates
    tiles = []
    for x, y in candidates:
        west = E0 + TILE_M * x - TILE_M / 2
        south = N0 + TILE_M * y - TILE_M / 2
        try:
            hit = shape.intersects(box(west, south, west + TILE_M, south + TILE_M))
        except GEOSException as exc:
            raise ValueError(f"Invalid geometry: OSM {element.get('type')}/{element.get('id')}") from exc
        if hit:
            tiles.append((x, y))
    return tiles


def input_header(path: Path) -> dict:
    """Read root metadata before elements; never load the huge array."""
    result = {}
    with path.open('rb') as stream:
        for prefix, event, value in ijson.parse(stream, use_float=True):
            if prefix == 'elements' and event == 'start_array':
                break
            if prefix in {'source', 'license', 'radius_m'} and event in {'string', 'number'}:
                result[prefix] = int(value) if prefix == 'radius_m' else value
            elif prefix == 'center.item' and event == 'number':
                result.setdefault('center', []).append(float(value))
    return result


class Spool:
    """Temporary NDJSON shards, with a limited number of open file handles."""
    def __init__(self, directory: Path, max_open: int = 128):
        self.directory = directory
        self.handles = OrderedDict()
        self.max_open = max_open
        self.counts = Counter()

    def add(self, key: tuple[int, int], record: str) -> None:
        handle = self.handles.pop(key, None)
        if handle is None:
            if len(self.handles) == self.max_open:
                _, old = self.handles.popitem(last=False)
                old.close()
            handle = (self.directory / f'{key[0]}_{key[1]}.ndjson').open('a', encoding='utf-8')
        self.handles[key] = handle
        handle.write(record + '\n')
        self.counts[key] += 1

    def close(self) -> None:
        for handle in self.handles.values():
            handle.close()
        self.handles.clear()


def split(source: Path, destination: Path, *, timestamp: str | None = None,
          force: bool = False, max_file_bytes: int = LIMIT_BYTES) -> dict:
    if not source.is_file():
        raise FileNotFoundError(source)
    if destination.exists() and not force:
        raise FileExistsError(f'{destination} exists; use --force to replace')
    stamp = timestamp or datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    if len(stamp) != 14 or not stamp.isdecimal():
        raise ValueError('Timestamp must be UTC YYYYMMDDHHMMSS')
    datetime.strptime(stamp, '%Y%m%d%H%M%S')
    header = input_header(source)
    if header.get('center') and header['center'] != [LAT, LON]:
        raise ValueError(f"Unexpected source center: {header['center']}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.tiles-stage-', dir=destination.parent))
    shards = stage / 'shards'
    shards.mkdir()
    output = stage / 'output'
    output.mkdir()
    spool = Spool(shards)
    counts = Counter()
    try:
        # Read once to collect relations and their member IDs. This avoids
        # retaining 2M+ way records or position maps in memory.
        relations = []
        member_keys = set()
        with source.open('rb') as stream:
            for obj in ijson.items(stream, 'elements.item', use_float=True):
                if obj.get('type') != 'relation':
                    continue
                relations.append(obj)
                for member in obj.get('members', []):
                    if member.get('type') in ('node', 'way', 'relation'):
                        member_keys.add((member['type'], member['ref']))
        member_tiles = {}
        with source.open('rb') as stream:
            for obj in ijson.items(stream, 'elements.item', use_float=True):
                typ = obj.get('type')
                if typ == 'relation':
                    continue
                counts['input_' + str(typ)] += 1
                tiles = assigned_tiles(obj)
                if not tiles:
                    counts['unplaced_' + str(typ)] += 1
                    continue
                key = (typ, obj.get('id'))
                if key in member_keys:
                    member_tiles[key] = set(tiles)
                record = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
                for tile in tiles:
                    spool.add(tile, record)
                counts['placed_' + str(typ)] += 1

        # Input relations have member references but no independent geometry.
        # Place a relation wherever its present member elements were placed.
        # Unresolvable relations are reported, not assigned invented geometry.
        pending = relations
        for _ in range(len(relations) + 1):
            changed = False
            remaining = []
            for obj in pending:
                tiles = set()
                for m in obj.get('members', []):
                    tiles.update(member_tiles.get((m.get('type'), m.get('ref')), ()))
                if not tiles:
                    remaining.append(obj)
                    continue
                record = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
                for tile in sorted(tiles):
                    spool.add(tile, record)
                counts['placed_relation'] += 1
                if ('relation', obj.get('id')) in member_keys:
                    member_tiles[('relation', obj['id'])] = tiles
                changed = True
            pending = remaining
            if not changed:
                break
        counts['input_relation'] = len(relations)
        counts['unplaced_relation'] = len(pending)
        spool.close()
        if not spool.counts:
            raise ValueError('No tiles generated')
        generated = datetime.strptime(stamp, '%Y%m%d%H%M%S').replace(
            tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')
        index = {
            'schemaVersion': 1, 'tileSizeM': TILE_M,
            'coordinateSystem': 'EPSG:6677',
            'origin': {'lat': LAT, 'lon': LON, 'placement': 'tile_0_0_center'},
            'generatedAt': generated,
            'source': header.get('source', 'OpenStreetMap contributors'),
            'license': header.get('license', 'ODbL-1.0'),
            'sourceCoverageRadiusM': header.get('radius_m'),
            'tiles': {}
        }
        for (x, y), n in sorted(spool.counts.items()):
            filename = f'tile_{x}_{y}_{stamp}.json'
            path = output / filename
            metadata = {
                'schemaVersion': 1, 'source': index['source'], 'license': index['license'],
                'tile': {'id': f'{x}_{y}', 'gridX': x, 'gridY': y,
                         'sizeM': TILE_M, 'generatedAt': generated}
            }
            prefix = json.dumps(metadata, ensure_ascii=False, separators=(',', ':'))
            with path.open('wb') as dest:
                dest.write((prefix[:-1] + ',"elements":[').encode())
                with (shards / f'{x}_{y}.ndjson').open('rb') as lines:
                    for i, line in enumerate(lines):
                        if i:
                            dest.write(b',')
                        dest.write(line.rstrip(b'\r\n'))
                dest.write(b']}\n')
            size = path.stat().st_size
            if size > max_file_bytes:
                raise ValueError(f'Tile {filename} exceeds {max_file_bytes} bytes: {size}')
            with path.open('rb') as stream:
                actual = sum(1 for _ in ijson.items(stream, 'elements.item', use_float=True))
            if actual != n:
                raise ValueError(f'Tile {filename}: expected {n}, got {actual}')
            index['tiles'][f'{x}_{y}'] = {
                'file': filename, 'x': x, 'y': y, 'elementCount': n, 'sizeBytes': size
            }
        (output / 'index.json').write_text(
            json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n',
            encoding='utf-8')
        shutil.rmtree(shards)
        if destination.exists():
            shutil.rmtree(destination)  # Only one current generation in output.
        output.rename(destination)
        print(f'Split {source}: {dict(counts)} / {len(spool.counts)} tiles -> {destination}')
        return index
    finally:
        spool.close()
        shutil.rmtree(stage, ignore_errors=True)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', required=True, type=Path)
    p.add_argument('--output-dir', required=True, type=Path)
    p.add_argument('--timestamp', help='UTC YYYYMMDDHHMMSS, default now')
    p.add_argument('--force', action='store_true')
    p.add_argument('--max-file-bytes', type=int, default=LIMIT_BYTES)
    a = p.parse_args()
    split(a.input, a.output_dir, timestamp=a.timestamp, force=a.force,
          max_file_bytes=a.max_file_bytes)


if __name__ == '__main__':
    main()
