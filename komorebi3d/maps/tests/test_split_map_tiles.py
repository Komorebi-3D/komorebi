"""Fixed-grid, boundary, source-preservation and relation-placement checks."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'split-map-tiles.py'
spec = importlib.util.spec_from_file_location('split_map_tiles', SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def point(east, north):
    lon, lat = mod.TRANSFORM.transform(east, north, direction='INVERSE')
    return {'lat': lat, 'lon': lon}


class TileTests(unittest.TestCase):
    def test_origin_and_cardinal_indices(self):
        self.assertEqual(mod.assigned_tiles({'type': 'node', 'id': 1, 'lat': mod.LAT, 'lon': mod.LON}), [(0, 0)])
        self.assertEqual(mod.grid_index(mod.E0 + 2100, mod.E0), 1)
        self.assertEqual(mod.grid_index(mod.E0 - 2100, mod.E0), -1)
        self.assertEqual(mod.grid_index(mod.N0 + 2100, mod.N0), 1)
        self.assertEqual(mod.grid_index(mod.N0 - 2100, mod.N0), -1)

    def test_boundary_way_is_copied_complete(self):
        way = {'type': 'way', 'id': 42, 'version': 7,
               'tags': {'highway': 'residential', 'name': '日本語道路'},
               'geometry': [point(mod.E0 + 900, mod.N0),
                            point(mod.E0 + 1100, mod.N0)]}
        original = json.dumps(way, sort_keys=True)
        self.assertEqual(set(mod.assigned_tiles(way)), {(0, 0), (1, 0)})
        self.assertEqual(original, json.dumps(way, sort_keys=True))

    def test_polygon_contains_center_tile(self):
        coords = [(mod.E0-3500, mod.N0-3500), (mod.E0+3500, mod.N0-3500),
                  (mod.E0+3500, mod.N0+3500), (mod.E0-3500, mod.N0+3500),
                  (mod.E0-3500, mod.N0-3500)]
        way = {'type': 'way', 'id': 99, 'tags': {'building': 'yes'},
               'geometry': [point(*p) for p in coords]}
        tiles = set(mod.assigned_tiles(way))
        self.assertIn((0, 0), tiles)
        self.assertIn((1, 1), tiles)

    def test_node_half_open_index(self):
        self.assertEqual(mod.grid_index(mod.E0 + 1000, mod.E0), 1)
        self.assertEqual(mod.grid_index(mod.E0 - 1000, mod.E0), 0)

    def test_split_json_and_relation(self):
        way = {'type': 'way', 'id': 42, 'version': 7, 'tags': {'highway': 'residential'},
               'geometry': [point(mod.E0 + 900, mod.N0),
                            point(mod.E0 + 1100, mod.N0)]}
        relation = {'type': 'relation', 'id': 55, 'version': 2,
                    'tags': {'amenity': 'hospital'},
                    'members': [{'type': 'way', 'ref': 42, 'role': ''}]}
        source = {'source': 'OpenStreetMap contributors', 'license': 'ODbL-1.0',
                  'center': [mod.LAT, mod.LON], 'radius_m': 25000,
                  'elements': [way, relation]}
        with tempfile.TemporaryDirectory() as dirname:
            root = Path(dirname)
            original = root / 'original.json'
            original.write_text(json.dumps(source, ensure_ascii=False), encoding='utf-8')
            output = root / 'tiles'
            index = mod.split(original, output, timestamp='20261114000000')
            self.assertEqual(set(index['tiles']), {'0_0', '1_0'})
            for tile in index['tiles'].values():
                result = json.loads((output / tile['file']).read_text(encoding='utf-8'))
                self.assertIn(way, result['elements'])
                self.assertIn(relation, result['elements'])
                self.assertEqual(result['tile']['generatedAt'], '2026-11-14T00:00:00Z')
            self.assertEqual(json.loads(original.read_text()), source)


if __name__ == '__main__':
    unittest.main()
