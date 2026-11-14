# 🌳 Komorebi 3D｜OSMタイル分割ルール

**分割処理の設計ルールの正本は [`komorebi3d/maps/split-map-tiles.py`](../../komorebi3d/maps/split-map-tiles.py) の先頭コメントです。**

以前はこの文書に詳細ルールを記載していましたが、仕様と実装を別々に管理して食い違わないよう、ルール本文をPythonの先頭へ集約しました。

- 2km固定グリッド・松戸駅基準座標・EPSG:6677・`tile_x_y`の算出方法
- OSMデータの無加工保持と、タイルをまたぐ地物の完全複製
- `tile_x_y_YYYYMMDDHHMMSS.json`（UTC）の命名規則
- 取得範囲の端の扱い、relationの扱い、分割工程が行わない処理

**分割用GitHub Action:** [`.github/workflows/split-matsudo-tiles.yml`](../../.github/workflows/split-matsudo-tiles.yml)

取得用Actionは取得中心・範囲・距離計算など取得条件のみを管理します。分割専用のルールは取得用Actionに持ち込みません。
