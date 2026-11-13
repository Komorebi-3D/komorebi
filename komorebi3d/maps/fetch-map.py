#!/usr/bin/env python3
"""Fetch OSM map geometry and shop/facility features for the Matsudo test area."""
import json
import math
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
# Keep the current 500m square and expand only the features requested.
# "nwr" collects OSM nodes, ways and relations (shops are often nodes).
feature_keys=("shop","amenity","tourism","office","leisure","healthcare")
selectors="".join(f'nwr["{key}"]({bbox});' for key in feature_keys)
query=f'[out:json][timeout:90];(way["building"]({bbox});way["highway"]({bbox});way["railway"]({bbox});{selectors});out geom;'
endpoints=[
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
errors=[]
for round_index in range(2):
    for endpoint in endpoints:
        try:
            payload=urllib.parse.urlencode({"data":query}).encode("utf-8")
            request=urllib.request.Request(endpoint,data=payload,headers={"User-Agent":"Komorebi3D-Matsudo-static-map/0.3 (GitHub project; OSM attribution in viewer)"})
            with urllib.request.urlopen(request, timeout=115) as response:
                raw=response.read(12_000_000)
            data=json.loads(raw)
            features=[]
            for e in data.get("elements",[]):
                kind=e.get("type")
                tags=e.get("tags",{})
                if kind=="way" and len(e.get("geometry",[]))>=2:
                    features.append({"type":"way","id":e["id"],"version":e.get("version"),"tags":tags,"geometry":e["geometry"]})
                elif kind=="node" and any(tags.get(key) for key in feature_keys):
                    features.append({"type":"node","id":e["id"],"version":e.get("version"),"tags":tags,
                                     "lat":e["lat"],"lon":e["lon"]})
                elif kind=="relation" and any(tags.get(key) for key in feature_keys):
                    # Preserve relation members for future facility rendering.
                    features.append({"type":"relation","id":e["id"],"version":e.get("version"),"tags":tags,
                                     "members":e.get("members",[])})
            buildings=sum(bool(e["tags"].get("building")) for e in features if e["type"]=="way")
            roads=sum(bool(e["tags"].get("highway")) for e in features if e["type"]=="way")
            facilities=sum(any(e["tags"].get(key) for key in feature_keys) for e in features)
            if buildings<10 or roads<10:
                raise ValueError(f"too little OSM data: buildings={buildings} roads={roads}")
            if facilities<1:
                raise ValueError("no shop/facility features returned; previous snapshot retained")
            clean={"source":"OpenStreetMap contributors","license":"ODbL-1.0","center":[LAT,LON],
                   "bbox":bbox,"elements":features}
            payload=json.dumps(clean,ensure_ascii=False,separators=(",",":"))+"\n"
            DEST.write_text(payload,encoding="utf-8")
            nodes=sum(e["type"]=="node" for e in features)
            print(f"Saved {len(features)} OSM features ({buildings} buildings / {roads} roads / {facilities} facilities / {nodes} POI nodes), {len(payload)} characters from {endpoint}")
            raise SystemExit(0)
        except Exception as exc:
            print(f"{endpoint}: {exc}",flush=True)
            errors.append(str(exc))
    time.sleep(8)
raise SystemExit("OpenStreetMap acquisition failed; existing map data (if any) has not been overwritten.")
