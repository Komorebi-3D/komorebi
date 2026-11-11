#!/usr/bin/env python3
"""Fetch real OpenStreetMap ways near Matsudo Station as a static game asset."""
import json
import math
import os
import pathlib
import time
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parent
DEST=ROOT/"data"/"matsudo.json"
LAT,LON=35.78444,139.90061
dlat=250/111320
dlon=250/(111320*math.cos(math.radians(LAT)))
bbox=",".join(f"{v:.6f}" for v in (LAT-dlat,LON-dlon,LAT+dlat,LON+dlon))
query=f'[out:json][timeout:90];(way["building"]({bbox});way["highway"]({bbox});way["railway"]({bbox}););out geom;'
endpoints=[
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]
errors=[]
for round_index in range(2):
    for endpoint in endpoints:
        try:
            payload=urllib.parse.urlencode({"data":query}).encode("utf-8")
            request=urllib.request.Request(endpoint,data=payload,headers={"User-Agent":"Komorebi3D-Matsudo-static-map/0.2 (GitHub project; OSM attribution in viewer)"})
            with urllib.request.urlopen(request, timeout=115) as response:
                raw=response.read(12_000_000)
            data=json.loads(raw)
            ways=[e for e in data.get("elements",[]) if e.get("type")=="way" and len(e.get("geometry",[]))>=2]
            buildings=sum(bool(e.get("tags",{}).get("building")) for e in ways)
            roads=sum(bool(e.get("tags",{}).get("highway")) for e in ways)
            if buildings<10 or roads<10:
                raise ValueError(f"too little OSM data: buildings={buildings} roads={roads}")
            # Retain only what the Matsudo viewer needs; all coordinates are actual OSM data.
            clean={"source":"OpenStreetMap contributors","license":"ODbL-1.0","center":[LAT,LON],
                   "bbox":bbox,"elements":[{"type":"way","id":e["id"],"tags":e.get("tags",{}),
                    "geometry":e["geometry"]} for e in ways]}
            payload=json.dumps(clean,ensure_ascii=False,separators=(",",":"))+"\n"
            DEST.write_text(payload,encoding="utf-8")
            print(f"Saved {len(ways)} genuine OSM ways ({buildings} buildings / {roads} roads), {len(payload)} characters from {endpoint}")
            raise SystemExit(0)
        except Exception as exc:
            print(f"{endpoint}: {exc}",flush=True)
            errors.append(str(exc))
    time.sleep(8)
raise SystemExit("OpenStreetMap acquisition failed; existing map data (if any) has not been overwritten.")
