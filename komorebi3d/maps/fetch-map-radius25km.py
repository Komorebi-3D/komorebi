#!/usr/bin/env python3
"""Export OSM features within 25 km of Matsudo Station to a standalone JSON file.

Input: a locally downloaded OSM PBF (recommended:
https://download.geofabrik.de/asia/japan/kanto-latest.osm.pbf).
Requires: pip install osmium

Usage:
    python komorebi3d/maps/fetch-map-radius25km.py --pbf kanto-latest.osm.pbf

Never modifies matsudo.json or the game's 500 m map loader.
The output may be far too large to commit to GitHub (100 MB file limit).
"""
from __future__ import annotations

# Acquisition conditions (NOT tile-grid rules):
# Fixed center: WGS84 lat=35.78444, lon=139.90061, in that order.
# Current radius: 25,000 m. Preserve this exact center if radius expands.
# Circle membership currently uses dx=(lon-LON)*111320*cos(LAT),
# dy=(lat-LAT)*111320; this is a local approximation, not EPSG:6677.
# Do not silently change the distance formula: selection edges can change.
# Preserve emitted feature geometry, tags and IDs for downstream consumers.
# Tile projection, tile origin, IDs, duplication, and game rendering belong
# to an independent later process, not this acquisition/export script.


import argparse
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import time

LAT = 35.78444
LON = 139.90061
RADIUS_M = 25_000
EARTH_M_PER_DEG_LAT = 111_320
EARTH_M_PER_DEG_LON = EARTH_M_PER_DEG_LAT * math.cos(math.radians(LAT))
FACILITY_KEYS = ("shop", "amenity", "tourism", "office", "leisure", "healthcare")
ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "data" / "matsudo_radius25km.json"


def xy(lat: float, lon: float) -> tuple[float, float]:
    return (lon - LON) * EARTH_M_PER_DEG_LON, (lat - LAT) * EARTH_M_PER_DEG_LAT


def point_inside(lat: float, lon: float) -> bool:
    x, y = xy(lat, lon)
    return x * x + y * y <= RADIUS_M * RADIUS_M


def segment_near(a: tuple[float, float], b: tuple[float, float]) -> bool:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, -(ax * dx + ay * dy) / (dx * dx + dy * dy or 1.0)))
    return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 <= RADIUS_M ** 2


def geometry_hits_circle(geometry: list[dict[str, float]]) -> bool:
    points = [xy(p["lat"], p["lon"]) for p in geometry]
    if any(x * x + y * y <= RADIUS_M ** 2 for x, y in points):
        return True
    if any(segment_near(a, b) for a, b in zip(points, points[1:])):
        return True
    # A polygon can surround the centre without any edge/vertex near the circle.
    if len(points) >= 4 and points[0] == points[-1]:
        inside = False
        for (ax, ay), (bx, by) in zip(points, points[1:]):
            if (ay > 0) != (by > 0) and 0 < ax + (bx - ax) * (-ay) / (by - ay):
                inside = not inside
        return inside
    return False


def tags_of(obj) -> dict[str, str]:
    return {t.k: t.v for t in obj.tags}


def export(input_pbf: Path, output: Path, overwrite: bool) -> None:
    try:
        import osmium
    except ImportError as exc:
        raise SystemExit("pyosmium is required: python -m pip install osmium") from exc

    if not input_pbf.is_file():
        raise SystemExit(f"Input PBF not found: {input_pbf}")
    if output.exists() and not overwrite:
        raise SystemExit(f"Output already exists: {output} (use --force to replace)")
    output.parent.mkdir(parents=True, exist_ok=True)

    started = time.monotonic()
    counts = {"node": 0, "way": 0, "relation": 0}
    selected_nodes: set[int] = set()
    selected_ways: set[int] = set()
    temporary = None

    # Write incrementally; do not keep millions of features in RAM.
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent,
                                         prefix=".radius25km-", suffix=".tmp",
                                         delete=False) as out:
            temporary = Path(out.name)
            metadata = {
                "source": "OpenStreetMap contributors",
                "license": "ODbL-1.0",
                "center": [LAT, LON],
                "radius_m": RADIUS_M,
                "elements": [],
            }
            prefix = json.dumps({k: v for k, v in metadata.items() if k != "elements"},
                                ensure_ascii=False, separators=(",", ":"))
            out.write(prefix[:-1] + ',"elements":[')
            first = True

            def emit(record: dict) -> None:
                nonlocal first
                if not first:
                    out.write(",")
                out.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
                first = False
                counts[record["type"]] += 1

            class ExportHandler(osmium.SimpleHandler):
                def node(self, n) -> None:
                    tags = tags_of(n)
                    if not any(k in tags for k in FACILITY_KEYS):
                        return
                    if not n.location.valid() or not point_inside(n.location.lat, n.location.lon):
                        return
                    selected_nodes.add(n.id)
                    emit({
                        "type": "node", "id": n.id, "version": n.version,
                        "tags": tags, "lat": n.location.lat, "lon": n.location.lon,
                    })

                def way(self, w) -> None:
                    tags = tags_of(w)
                    if not (any(k in tags for k in FACILITY_KEYS)
                            or "building" in tags or "highway" in tags or "railway" in tags):
                        return
                    try:
                        geometry = [{"lat": n.lat, "lon": n.lon} for n in w.nodes]
                    except osmium.InvalidLocationError:
                        return
                    if len(geometry) < 2 or not geometry_hits_circle(geometry):
                        return
                    selected_ways.add(w.id)
                    emit({
                        "type": "way", "id": w.id, "version": w.version,
                        "tags": tags, "geometry": geometry,
                    })

                def relation(self, r) -> None:
                    tags = tags_of(r)
                    if not any(k in tags for k in FACILITY_KEYS):
                        return
                    # Include tagged relations referencing a selected local member.
                    if not any((m.type == "n" and m.ref in selected_nodes)
                               or (m.type == "w" and m.ref in selected_ways)
                               for m in r.members):
                        return
                    emit({
                        "type": "relation", "id": r.id, "version": r.version,
                        "tags": tags,
                        "members": [
                            {"type": {"n": "node", "w": "way", "r": "relation"}.get(m.type, m.type),
                             "ref": m.ref, "role": m.role}
                            for m in r.members
                        ],
                    })

            ExportHandler().apply_file(str(input_pbf), locations=True)
            out.write("]}\n")
            out.flush()
            os.fsync(out.fileno())

        # Never publish a partially written or unexpectedly empty snapshot.
        if counts["way"] == 0:
            raise ValueError("No way features found. The source extract may not cover Matsudo.")
        os.replace(temporary, output)
        temporary = None
        size_mb = output.stat().st_size / (1024 * 1024)
        print(f"Saved {output}: {counts} / {size_mb:.1f} MiB / "
              f"{time.monotonic() - started:.1f}s")
        if output.stat().st_size > 100_000_000:
            print("WARNING: larger than GitHub's 100 MB per-file limit; "
                  "do not commit this JSON directly.", file=sys.stderr)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pbf", required=True, type=Path, help="Local Kanto .osm.pbf")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    export(args.pbf, args.output, args.force)


if __name__ == "__main__":
    main()
