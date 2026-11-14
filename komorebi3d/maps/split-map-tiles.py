#!/usr/bin/env python3
# =============================================================================
# 🌳 Komorebi 3D | OSM地図タイル分割 仕様（この実装ファイルが正本）
#
# 【責務の分離】
# このPythonは、別工程で取得済みのOSM JSONを読み込み、固定2km四方の
# タイルに振り分けるだけの処理。OSM取得用API/Actionはこのルールを知らなくてよい。
# APIへの問い合わせ・再取得・不足分の補完はこの処理では絶対に行わない。
#
# 【最重要原則：取得済みのOSM情報を可能な限り無加工で分割】
# - 元の入力ファイルを書き換えない。
# - OSM type/id/version/tags/lat/lon/geometry/members/その他の属性を保持。
# - 所属タイルの判定にだけ座標投影を使い、元の緯度経度を変更しない。
# - 建物・道路の形状を切断、間引き、簡略化、補正、推測、再構築しない。
# - 同一要素を複数タイルに保存することは正常。各タイルで元要素を丸ごと複製。
# - 同じ入力要素を同じタイル内で不必要に重複保存しない。
#
# 【変更禁止の固定グリッド】
# - 基準地点（WGS84緯度・経度）= 35.78444, 139.90061。丸め直さない。
# - 投影座標系 = EPSG:6677（JGD2011 / 日本平面直角座標系第IX系）。
# - 変換時は always_xy=True とし、入力(経度,緯度) → 平面(東X,北Y)。
# - 原点(E0,N0) = 基準地点をEPSG:6677へ投影した座標。
# - tile_0_0はこの原点を中心とする2,000m×2,000mの正方形。
# - Xは東が正/西が負、Yは北が正/南が負。IDは tile_x_y。
# - tile(x,y)の範囲は
#     X: [E0 + 2000*x - 1000, E0 + 2000*x + 1000)
#     Y: [N0 + 2000*y - 1000, N0 + 2000*y + 1000)
# - 点の境界所属は左/下を含み、右/上を含まない半開区間。
# - wayなどの線・面が複数タイルに交差・接触する場合は、
#   それぞれに元の要素を完全複製する（A方式）。
# - 入力JSONの取得範囲・形状・取得日時に関係なく、タイル原点・境界・IDは不変。
#
# 【地物の判定】
# - 代表点、中心点、頂点だけではなく、形状全体とタイルの交差で判定する。
# - タイルを線分が横切る場合や、面がタイルを覆う場合も含める。
# - relation等に独自のgeometryがない場合は、入力に存在する参照要素から
#   割当可能な範囲で判断する。欠けた参照先や座標を作り足さない。
# - 正確な配置を判定できない要素は、その件数を報告し、位置を捏造しない。
# - タイル間重複のゲーム側描画処理、OSM新旧比較・修復は実装しない。
#
# 【ファイル形式と日時】
# - 入力ファイルは実行時の --input で指定する、取得済みの地図JSON。
#   Python内に入力ファイル名や保存先ディレクトリを固定しない。
# - 出力先は実行時の --output-dir で指定するディレクトリ。Python内では固定しない。
# - 入出力のディレクトリ構造例（ファイル名・生成日時はサンプル）：
#     作業ディレクトリ/
#     ├── source/
#     │   └── map.json                         # --input に指定
#     └── tiles-2km/                           # --output-dir に指定
#         ├── index.json
#         ├── tile_0_0_20261114000000.json
#         ├── tile_1_0_20261114000000.json
#         ├── tile_-1_0_20261114000000.json
#         └── ...（対象地物のあるタイルだけ生成）
# - 単独実行例：
#     python komorebi3d/maps/split-map-tiles.py \\
#       --input ./source/map.json --output-dir ./tiles-2km
# - 現行GitHub Actionsでは、別の取得Actionの成果物をランナーの
#   $RUNNER_TEMP/source/ に展開して --input に渡し、
#   $RUNNER_TEMP/tiles-2km/ を --output-dir に指定する。
#   具体的な入力成果物名・入力JSONファイル名は分割Action側で管理する。
# - Actionsでの出力は matsudo-2km-tiles という成果物にまとめて保存する。
#   GitHub mainブランチ内のディレクトリへは自動コミットしない。
# - 分割JSONと index.json は同じ出力先ディレクトリに保存する。

# - 出力名 = tile_x_y_YYYYMMDDHHMMSS.json。
# - YYYYMMDDHHMMSSはJSON生成時刻をUTCで表す（OSM自体の更新日時ではない）。
# - JSTでの日時表示はゲーム側で行う。位置ID tile_x_y は日時を含めない。
# - 現行版は1世代だけ管理し、旧ファイルの自動蓄積はしない。
# - 各JSONのelementsは元のOSM要素を可能な限りそのまま保持し、
#   追加情報はtile ID/生成時刻など必要最小限にする。
# - index.jsonは生成物の一覧・参照情報。ゲーム内の配信/更新UIは別工程。
# - 巨大入力はストリーミング処理し、各タイルのJSON妥当性、件数、
#   交差とサイズ制限（GitHub単一ファイル100MB未満の安全余裕）を検証する。
#
# 【取得範囲の端】
# - 入力JSONに存在する地物のみ出力する。
# - 入力データの収録範囲がタイル境界と一致しない場合も、存在する地物だけをそのまま保存する。
# - 欠けている部分の追加取得や補完、部分収録フラグの追加はしない。
# - 描画可能エリアの判定もゲーム側に任せる。
#
# 【この分割Pythonには追加しない】
# - OSM/Overpass/GeofabrikなどのAPI通信・地図データのダウンロード
# - 3Dメッシュ変換、描画最適化、プレイヤー位置や読み込み範囲の制御
# - 古いOSMデータの検出・警告・差し替え、ゲーム側キャッシュやUI
#
# 将来の仕様変更でも「固定グリッド・元OSM情報を無加工保持・跨ぎ複製・
# 分割以外の処理を持ち込まない」を優先する。
# 同じ入力なら同じ配置を再現する（生成日時だけは異なり得る）。
# ※ 本コメントが分割仕様の正本。仕様は実装ファイル内で管理する。
# =============================================================================
"""Split exported OSM JSON into fixed 2km tiles, without changing OSM elements.

Canonical rules: comments at the beginning of this Python file.
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
            if prefix in {'source', 'license'} and event == 'string':
                result[prefix] = value
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
