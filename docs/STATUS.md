# 🌳 Komorebi 3D｜開発ステータス・次チャット引き継ぎ

> 更新日：2026-11-14（JST）／コードの正本：[`Komorebi-3D/komorebi` の `main`](https://github.com/Komorebi-3D/komorebi/tree/main)  
> **現在の最優先作業：A/B地図比較（A=旧500m、B=中央2kmタイル0_0）のSafari実機確認。隣接タイルは未実装。**  
> この文書は「現状・完了事項・未確認事項・次の実装」に集中する。旧実装の時系列や試行錯誤はGit履歴を参照する。コミットSHAや開発情報の最新表示は実際の `main` を確認すること。

## 1. 現在地（次のチャットはここから）

- **開発入口：** [`komorebi3d/dev.html`](https://github.com/Komorebi-3D/komorebi/blob/main/komorebi3d/dev.html)。森・松戸の統合ワールド、4パネル（開発情報／ゲーム／テスト操作／実行ステータス）、描画方式A/B比較、テスト操作を提供。
- **Engine固定：** `d4a392aba35c840e0bea8b585c6852515bf58f30`（表示値 `d4a392a`）。`engine/` や固定jsDelivr参照を不用意に変更しない。
- **松戸の現行地図取得：** `komorebi3d/maps/map-loader.js` が旧 `matsudo.json` と、`tiles-2km/index.json` から解決する中央タイル `0_0` を取得。松戸入場時に順次読み込み、旧はhalfSize=250、新はhalfSize=1000で3D生成。A/B画面の地図設定で描画を選択する（実機未確認）。
- **ブラウザからのOSM直接API取得：削除済み。** Overpass接続先・再試行・OSM/JSON自動フォールバック・「自動／OSM最新／JSON」切替・`mapSourceMode`・`setMapSourceMode` は現行ゲームから削除済み。
- **ワールド分離：** 松戸地図取得のセッションは `cancelMatsudoMapRequest()` と `isCurrentMatsudoMapRequest()` で管理。ワールド切替時に旧要求を中断・失効させる。森側にOSM API通信の可否判定を置かない。
- **ログは維持：** 実行ステータスに **「🧪 地図JSON読み込みログ」** とコピー機能がある。現在はJSON取得のHTTP結果・要素検証・3D生成・表示・エラーを記録する。**次のタイル化でもログパネル自体は削除しない。**
- **A/B画面設定の開発中（2026-11-14）：** 新しい画面別設定UIを `panels/test.html`／`dev-panel-components.js` に統合し、`build-dev.mjs` が共通UI部分をモックに抜き出す方式へ整理した。`dev.html` と `mock.html`／`mock.chat.html` は更新済み。画面ごとのEngine A/B選択・再初期化処理を接続し、切替時はcanvasを交換する。JavaScript構文チェック済み、**GitHub Pages・Safariでの実機動作は未確認**。**画面ごとの旧500m／新2km中央タイルの描画選択を接続済み**。Engine選択とは独立。画面別ラベルとミニマップ縮尺を追加したがSafari実機未確認。
- **次の地図データは準備済み：** `komorebi3d/maps/data/tiles-2km/` に **2kmタイル559枚＋ `index.json`** が `main` 保存済み。中央タイル1枚の取得と描画選択は実装済み（構文PASS／実機未確認）。隣接タイルの移動連動読み込み・描画は**未実装**。
- **直近のユーザー実機報告（2026-11-14）：** A/Bの旧500m／中央2kmタイル比較はユーザー実機PASS。松戸の移動境界を2000m四方に変更した後の実機確認は未実施。
- **最終のユーザー実機報告（2026-11-14）：** ①森・松戸の地図取得ライフサイクル疎結合化、②森の中央2枚扉の取っ手濃い青グレー化、③松戸のブラウザOSM API／3モード削除後の従来500m JSONによるワールド動作は、いずれも**ユーザー実機PASS**。個別HTTP通信・中断ログの網羅確認と2kmタイル動作は別。
- **開発情報の表示変更：** `development-info.json` は読み込み中「確認中…」、成功時は文字列をそのまま表示（空文字は空欄）、失敗時「取得失敗」。静的照合済み、個別の実機PASS報告は未取得。

## 2. 2km分割JSON移行：中央タイルA/B比較実装済み・実機未確認

### 2.1 目標

`matsudo.json` の単一500mデータ読み込みを、事前にダウンロード・分割しGitHub `main` に保存した **2kmタイルJSON** 参照へ置き換える。ブラウザからOSM/Overpass APIを直接呼び出さず、静的JSONだけを取得する。森ワールド、固定Engine、既存地図ファイルには不要な変更を加えない。

### 2.2 保存済みデータと参照元

- **索引：** `komorebi3d/maps/data/tiles-2km/index.json`。キーは `generatedAt`（UTC）と `tiles`（`"x_y": "tile_x_y_YYYYMMDDHHMMSS.json"`）のみ。現時点で559エントリ。
- **タイル本体：** `komorebi3d/maps/data/tiles-2km/tile_x_y_YYYYMMDDHHMMSS.json`。既存のOSM要素とメタデータを保持し、境界をまたぐ地物は複数タイルに完全複製され得る。
- **作成仕様の正本：** `komorebi3d/maps/split-map-tiles.py` 冒頭コメント。松戸駅 (35.78444, 139.90061) を基準としたEPSG:6677の固定2kmグリッド。座標変換・タイルID算出はこの仕様と生成物を照合する。
- **元の500m地図：** `komorebi3d/maps/data/matsudo.json` は当面維持し、実機での比較・切戻しに使えるよう、移行工程では原本を上書きしない。

### 2.3 実装前に確認し、順に進めること

1. **データ形式の実確認：** `index.json`、中央タイルを含む実タイルJSON、分割Python仕様、`map-builder.js` の入力形式を照合。現行の `map.elements` とタイルデータの差分・座標系・OSM way/relation の参照構造を確認する。
2. **タイル参照とJSONローダー：** まず索引を読み、現在地に必要なタイルファイルだけを取得。559枚を無条件に全件読み込まない。AbortControllerと古い応答の破棄、HTTP/解析/検証エラーを維持。
3. **表示領域と座標：** 現行 `map-builder.js`・ミニマップ・移動境界は500m前提。タイルの2km範囲、松戸駅から離れた座標、隣接タイルへの移動・追加取得・不要タイルの破棄をどう接続するか実装時に定める。単に取得URLを変更するだけで広域表示できるとは扱わない。
4. **重複地物への対応：** 隣接タイルに重複した建物・道路・relationを、メッシュ・ラベル・OSMタグ編集・ミニマップで二重生成しない方法を決めて検証。
5. **ログ維持・整理：** **「🧪 地図JSON読み込みログ」** は残す。新しいタイル処理に必要な情報（索引・タイルID/ファイル名・取得/失敗・件数・地図生成/表示）を整理する。不要な旧500m専用メッセージの変更は、この工程で行う。
6. **小さい単位で検証：** 松戸初期位置のタイル表示 → 森との往復・通信中断 → 隣接タイル移動と境界 → 重複防止・ラベル・OSM編集 → A/B描画・端末負荷。静的PASSとSafari実機PASSを混同しない。

**今回の第一段階（2026-11-14）：** A=旧500m、B=中央2kmタイル1枚を初期選択とし、どちらの画面も切替可能。地図ソース別メッシュ、A/B別ラベル、ミニマップ縮尺、HTTP・生成ログを追加。移動境界は森100m四方・松戸2000m四方で共通の固定Engine `GroundBounds` を使用。Aの描画がない領域へも移動可能。A/Bの同一フレームIDを維持。コード構文チェックはPASS、実機の画像比較と性能・取得成功は未確認。中央実タイルはGitHubコネクタの大容量ファイル取得制約で全文解析できていない。

**未決定・今後の設計事項：** 先読み範囲／同時保持タイル枚数／ロード・アンロード条件／メッシュの結合粒度／既存500m境界の扱い。実装前にコードと実データで適切な段階分けを行う。具体的な性能値や動作のPASSはまだない。

## 3. 完了・確認済みの主な工程

| 日付 | 工程 | 現在の状態 |
| --- | --- | --- |
| 2026-11-09〜10 | Game APIと4パネルの疎結合化、配置・交換・削除・再追加、開発版とチャット内モック | ユーザー操作PASS。非標準配置全パターンの網羅は別 |
| 2026-11-10 | F5再読み込みで直前の森／松戸を復元（座標と高度は初期値） | ユーザー実機PASS |
| 2026-11-11 | 森・松戸統合、地図処理の `map-loader.js`／`map-builder.js`／`map-labels.js` 分割、旧松戸独立版廃止 | 基本動作はユーザー実機PASS |
| 2026-11-11 | 松戸の屋上名ラベル表示の接続不具合修正 | ユーザー実機PASS |
| 2026-11-12 | コンビニ外観共通化、森の比較用店舗、窓・看板・ドア等の調整 | 実装済み。個別工程の実機PASS範囲は一律としない |
| 2026-11-13 | OSMタグ編集UI・テストOSMへのコピーと`level`追加 | ユーザー操作成功報告あり。changesetコメントの実API検証は未完了 |
| 2026-11-13〜14 | 松戸駅から半径25kmのOSMデータ取得・2kmグリッドへの分割 | GitHub Actions実データ実行成功 |
| 2026-11-14 | タイル559枚と索引を `main` に格納（560ファイル、11回の分割コミット） | GitHub保存完了。ゲーム表示は未実装 |
| 2026-11-14 | 森・松戸の地図読込疎結合化、森の中央扉取っ手を濃い青グレー化 | ユーザー実機PASS |
| 2026-11-14 | 松戸のブラウザOSM直接API・取得モード・自動フォールバックを削除し、500m `matsudo.json` 専用へ整理 | **ユーザー実機PASS** |
| 2026-11-14 | 開発情報パネルの取得中／取得成功（空文字含む）／取得失敗表示を整理 | コード静的照合済み。実機未報告 |
| 2026-11-14 | A/B旧500m・中央2kmタイルの別データ描画、ラベル・ミニマップ接続 | 構文PASS。GitHub Pages・Safari実機未確認 |

### 広域地図データの生成・保存結果

- 取得元データ約2,344,556 OSM要素。タイル分割の成功実行：[`43547496368`](https://github.com/Komorebi-3D/komorebi/actions/runs/43547496368)。
- **559タイル、JSON合計897,894,074バイト**。 `matsudo-2km-tiles` の成果物から `komorebi3d/maps/data/tiles-2km/` へ公開。
- 保存用Actions成功実行：[`43548293473`](https://github.com/Komorebi-3D/komorebi/actions/runs/43548293473)。**11コミット**、1回90MB未満、最大バッチ89,852,414バイト。
- `index.json` は最小2キー構成を実物で確認済み。**保存済み生成物は完成**しているため、昔の「分割未実行」「GitHub保存未実施」は現状では誤り。
- Python分割・テストは `komorebi3d/maps/split-map-tiles.py` と `komorebi3d/maps/tests/test_split_map_tiles.py`、Actionsは `.github/workflows/split-matsudo-tiles.yml` と `.github/workflows/publish-matsudo-tiles.yml`。広域取得元は `fetch-map-radius25km.py` および対応workflow。

## 4. 松戸OSMタグ編集・テストAPI：現在の仕様と残課題

- 地図ラベルから既存OSM要素のタグを編集する。通常編集はnode/way/relationの新規作成やジオメトリ変更ではない。確認操作ではタグの差分・全タグをJSONで表示。未送信の下書きの永続化は現行仕様では行わない。
- OSM本番へのAPI書込みは行わない。テスト環境へのコピーは検証専用で、本番OSMは公開GETで参照。node/wayのコピーに対応し、relationのコピーは未対応。テスト環境OAuth（PKCE／write_api）を使用。
- テストOSMでの送信は、既存の店舗・施設要素に未設定の `level` を新規追加する場合だけ（`level=0`〜`8`）。既存levelの更新・削除やその他のタグ送信は対象外。
- changeset `comment` はタグ差分から自動作成（例：`add - level : 2`）。**実API上での自動コメント保存をまだ確認していない**。
- ユーザー確認済み例：本番のローソンをテストOSMへコピーし、`node/4365808698`・`changeset/724665` が発行され、対象読み込みとlevel送信の反映を確認（2026-11-13）。この要素に重複コピー／再送信しない。
- 関連ファイル：`maps/map-labels.js`、`maps/osm-test-api.js`、`maps/map-builder.js`。**ブラウザの地図取得用Overpass APIを削除したことと、タグ編集・テストOSM APIは別機能**。後者をタイル移行に便乗して削除しない。

## 5. その他の未完了・検証待ち（優先度は地図移行より後）

- **P1：** changesetコメント自動生成のテストOSM実APIでの確認。未使用の別テスト要素で検証（既存ローソンは再送信しない）。
- **P1：** おばけヘリの飛行高度・0/500m上限・透明度・衝突／移動境界など詳細な実機テスト。松戸ワールドの通常起動PASSと網羅試験は別。
- **P1：** 1000匹NPC負荷時のFPS・描画距離・表示数とA/B描画差、ミニマップの実機性能検証。
- **P1：** Engine・ワールドの継続CIテストと短い回帰チェックリスト。
- **P2：** リリース世代の復元手順、測定結果に応じた性能改善、将来のゲーム機能拡張。
- **個別未報告：** 開発情報パネルの新しい「確認中…／取得失敗／空文字」挙動について実機PASSは未報告。コンビニ外観の各細部も過去の未確認記録を一括PASS扱いにしない。

## 6. 現行コード・保護対象

| 対象 | パス・注意点 |
| --- | --- |
| 開発版正本 | `komorebi3d/dev.template.html` → 生成版 `komorebi3d/dev.html`。更新時は両者の整合を確認 |
| 地図取得 | `komorebi3d/maps/map-loader.js`：旧500m＋中央2kmタイル対応 |
| 地図生成／OSMラベル | `komorebi3d/maps/map-builder.js`／`komorebi3d/maps/map-labels.js` |
| UI・診断ログ | `komorebi3d/panels/test.html`、`panels/runtime.html`、`dev-panel-components.js` |
| タイル保存先 | `komorebi3d/maps/data/tiles-2km/index.json` と559枚のJSON |
| 開発情報 | `komorebi3d/development-info.json`（`engine`、`forest`、`matsudo`、`common`） |
| 固定Engine | `d4a392aba35c840e0bea8b585c6852515bf58f30`。固定参照と `engine/` を保護 |
| 実機PASS済みの状態 | Git履歴で管理。旧v0.6／v0.7テストHTMLは整理済み |
| モック | `komorebi3d/mock.html`／`mock.chat.html` はUI確認用。安定版とは別 |
| 削除済み旧アーカイブ | `dev-before-decouple.html` は `1144253b7af98ad6c28f5c4bdf4f3434f2cb9aaa` のGit履歴から復元可能 |

## 7. 新しいチャットでの進め方

1. [`docs/rules/README.md`](rules/README.md) と [`docs/rules/chat.md`](rules/chat.md)、[`docs/rules/mock.md`](rules/mock.md)、[`docs/rules/development.md`](rules/development.md)、そして**このSTATUS**を読む。最新コードをGitHub `main` で再取得する。
2. 現在の最優先は **A/Bの旧500m／中央2kmタイル1枚の比較実機確認**。中央タイルのHTTP取得、生成・表示、屋上名ラベルとコンビニ表示、Engine切替、森往復、端末負荷を確認する。
3. **「🧪 地図JSON読み込みログ」を残すことが明示的な希望。** ログは新しい取得方式に合わせて見直すが、削除しない。
4. 森ワールド、固定Engine、元500m JSON、559タイルの原本を不用意に変更しない。ユーザー実機PASSと未検証部分を区別し、必要なファイルだけ小さく変更する。
5. GitHub書込みはユーザーの明示許可に沿って行い、静的検証と実機確認を区別して `STATUS.md` を更新する。今回のチャットから次へ移ったという理由だけで、新機能を実装済み扱いにしない。
