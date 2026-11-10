# 🌳 Komorebi 3D / Komorebi Engine — 開発ステータス

> **用途:** 次のチャッピーが「いまの状態」「未完了タスク」「変更禁止の資材」を素早く把握するための引き継ぎ書。
> **更新日:** 2026-11-10（JST） ／ **正本:** GitHub `shuma-fujita1012/komorebi` の `main`
> 完了済み工程の詳細な時系列は書かず、必要ならGit履歴から調べる。コードの現在値は常にGitHubの最新ソースを優先する。
> **継続して守る運用ルールは [rules/README.md](rules/README.md) から参照。** 本書は現状と次の作業に集中する。

## 1. 現在の状態

- **開発フェーズ:** Development / Debug。開発入口は [`komorebi3d/dev.html`](https://shuma-fujita1012.github.io/komorebi/komorebi3d/dev.html)。テスト機能を残して開発を続ける。
- **疎結合作戦:** **成功・正式完了（2026-11-09、ユーザー確認済み）。追加のコード整理・実機テストは不要。** Game API、ゲーム画面とパネルの表示分離、独立JSモジュール、4スロット配置の基盤が現行コードに存在する。
- **チャット用自己完結モック（2026-11-10）:** `--mode=chat` で**4パネル**の `mock.chat.html` を生成。初期配置は `{top:'build',left:'game',right:'test',bottom:'runtime'}`。左 `game.mock.html`/`.css` と同じビルド切替で `test.mock.html`/`.css` を使用し、テスト操作は表示専用（ゲーム用操作JSは非搭載）。`test.mock.css` は見出しとリセットを固定し、本文だけ縦スクロール。`mock-layout.css` は左右440pxを維持。ⓘ・交換・削除・再追加・高さ保持は共通 `dev-panel-layout.js`・`common.css` に一本化。**生成結果の静的整合性PASSに加え、4パネルのチャット内表示・操作もユーザー実機PASS（2026-11-10）。** 右テスト操作の見出し・リセット固定、本文スクロール、左右の高さ保持、ⓘ・交換・削除・再追加を確認済み。 先行する3パネル試作はiPad横向きでユーザーPASS済み（2026-11-10）。モック専用のGitHub Pages・Safari追加検証は行わない。
- **公開ページの動作確認:** `632569e` の共通スロット高さ固定反映後、**Q49：2パネル `mock.html` の表示・入れ替え・削除・再追加・高さ固定すべてPASS**、**Q50：4パネル `dev.html` の高さ固定・ゲーム描画・操作すべてPASS**（2026-11-10、ユーザー報告）。個別のiPhone/iPad機種・Safari環境の内訳、および任意配置24通りの網羅検証は未確認。旧Q47・Q48も変更前にPASS。
- **実機PASS済みの基準版:** v0.7（最新）とv0.6（前世代）。固定した既存の安定版として保持する。
- **パネルエンハンス（公開ページ操作PASS済み・端末別詳細未確認）:** `dev-panel-layout.js` でⓘ押下中の説明とゴミ箱同時表示・スライド交換/削除・空き枠の＋再追加を提供。DOM・CanvasとGame APIを維持して移動。`preserveSlotSize:true` を本番・モック双方で有効化し、各枠の初期高さをパネル移動/削除/再追加後も保持する。幅変更時には左右枠が2列グリッドへ追従する。**Q49・Q50の基本操作PASS済み。iPhone/iPad個別・任意配置の詳細検証は必要に応じて行う**。

- **共通ゴミ箱CSSの統一（2026-11-10）:** 本番の `panels/test.css` による共通ゴミ箱のスタイル上書きを解消し、`common.css`・`dev-panel-layout.js` を正本として維持。`dev.html` の生成整合性PASSに加え、**修正後の本番開発版の実機テストもユーザーPASS（2026-11-10）**。端末別内訳・全配置や負荷の網羅検証は別。

## 2. 未完了タスク／次に相談すること

| 優先度 | タスク | 確認・完了条件 |
| --- | --- | --- |
| 完了 | **4パネルのチャット内モック表示・操作確認：PASS（2026-11-10）** | `mock.chat.html` は4パネル・自己完結型（28,729文字・395行）。ビルド生成一致・構造静的チェックPASS、チャット内の表示・左右の高さ保持・右テスト操作の見出しとリセット固定・本文スクロール・ⓘ・交換・削除・再追加もユーザー実機PASS。ゲームやテスト操作の動作は表示専用で、モック専用Pages/Safari追加検証は不要 |
| P1 | **NPC負荷テストの個別実機検証** | 1/1000匹切替、描画数1～1000、距離5～150m、±ボタン、マップ全NPC表示、FPS/描画数・限界、カフェ/階段/移動/ピンチ/Renderer A/Bを必要に応じて確認。標準配置の一般的な実機PASSとは別の負荷検証 |
| P1 | **自動テスト・CI** | `engine/tests/*.test.mjs` の継続実行などを整備 |
| P1 | **回帰テスト項目の標準化** | 移動・カメラ・衝突・室内/階段・A/B描画・リセットなどを短いチェックリストにする |
| P2 | **リリース管理・復元手順の整理** | 現行版と最新PASS版/前世代の扱い、履歴からの復元を明確化 |
| P2 | **性能改善・Engine周辺の段階的整理** | 測定結果を見て必要な範囲だけ対応。現時点でゲーム本体の大規模分割を急がない |
| 将来 | **ゲーム機能拡張・製品化** | ユーザーと内容を決め、完成時に診断UIの整理と正式起動ページへの移行を検討 |

※ 古い「Safari未確認」という記録は直近の標準配置PASSを否定するものではない。一方、**1,000匹負荷時の性能や非標準配置**までPASSとみなさない。

## 3. 現行コードと依存関係

- **リポジトリ:** `shuma-fujita1012/komorebi` ／ 運用ブランチは `main` のみ。
- **開発HTML:** `komorebi3d/dev.html` は実機PASS済みの4パネル本番開発ページで変更なし。`komorebi3d/mock.html` は4パネルの軽量UI検証ページ（安定版ではない）。`build-dev.mjs` は引数なし/`--mode=product` で本番、`--mode=mock` で4パネルWebモック、`--mode=chat` で自己完結型4パネルチャット用HTML断片 `mock.chat.html` を生成する。モックのゲーム・テスト操作とランタイムの値はEngine非連動。モックの `game` と `test` は `.mock.html`/`.mock.css` に切替え、共通操作JSは `dev-panel-layout.js` が正本。
- **パネル部品:** `komorebi3d/dev-panel-components.js`。`createGameView`、`mountTestControlsPanel`、`mountRuntimeStatusPanel` をエクスポート。ゲーム内部のDOMに依存せず、Game API経由で状態・命令を扱う。
- **ライブ配置編集:** `komorebi3d/dev-panel-layout.js`（Engine非依存）。4スロットのDOMを保管しながら移動する。`preserveSlotSize:true` の場合、起動時の各スロットの高さを固定し、入れ替え・削除・再追加後も維持（本番とモックで有効）。
- **ゲームAPI:** `getState()`、`subscribe()`、`reset()`、`setRenderMode()`、`setNpcCount()`、`setNpcRenderLimit()`、`setNpcRenderDistance()`、`setMapVisible()`、`teleport()`。状態変更通知の購読解除が可能。
- **4パネル:** build（開発情報）・game（ゲーム画面）・test（テスト操作）・runtime（実行ステータス）。
- **配置設定:** `dev.html` の `PANEL_LAYOUT`。起動時の初期値は `{top:'build',left:'game',right:'test',bottom:'runtime'}`。初期化後の変更は `dev-panel-layout.js` が担当。現行は4種類のみ（新規の第5パネル登録・配置永続化は対象外）。
- **共通Engine:** `engine/`。`dev.html` は固定コミット `d4a392aba35c840e0bea8b585c6852515bf58f30` のjsDelivr URLから主要8モジュールを読み込む。`main` 側のEngine更新だけでは依存先が切り替わらない。
- **安定版（変更禁止、通常の世代交代時は事前確認）:** `komorebi3d/komorebi3d-app-v07-engine-main-test.html`（blob `332ab75d9ac45eb51aed54379655ad35d2b22136`）、`komorebi3d/komorebi3d-app-v06-core-test.html`（blob `c98a8d8acccac3ca24c7b168c4a6a1408c358348`）。

## 4. 運用ルールの参照

- **運用ルールの入口:** [`docs/rules/README.md`](rules/README.md)。チャット質問は [`rules/chat.md`](rules/chat.md)、1〜4パネルのモック生成方針は [`rules/mock.md`](rules/mock.md)、GitHub操作・検証・資材保護は [`rules/development.md`](rules/development.md) で管理する。
- **新しいチャットでは、先に `rules/README.md` と3つのルール文書、本書 `STATUS.md` を読む。** `STATUS.md` の更新時に恒久ルールを再記述・変更しない。ルール自体の変更はユーザーと相談し、別途コミットする。

## 5. 削除した改修前アーカイブの復元元

- **`main` から削除したファイル:** `komorebi3d/dev-before-decouple.html`（ユーザー指示により2026-11-09削除）。
- **削除コミット:** `4dd60b4377f6e36f3b6122695594697a053b3340`。
- **復元できる履歴:** [作成時のファイルをGitHubで表示](https://github.com/shuma-fujita1012/komorebi/blob/1144253b7af98ad6c28f5c4bdf4f3434f2cb9aaa/komorebi3d/dev-before-decouple.html)。
- **復元元コミット:** `1144253b7af98ad6c28f5c4bdf4f3434f2cb9aaa` ／ **元blob SHA:** `236f391b0ff06bf216334cf9b9a4d188698e974a`。削除前にこのコミットから元ファイル全体を取得し、現行アーカイブと内容一致を確認済み。
- 必要なときはこのコミットのファイルをGit履歴から復元する。**Git履歴は外部バックアップではない**ため、履歴改変やリポジトリ消失まで保証するものではない。

## 6. 次のチャッピーへの引き継ぎ

GitHub `main` の **`docs/rules/README.md` と配下の3つのルール文書**、**`docs/STATUS.md`（現状・次タスク）**、最新ソースを確認する。疎結合作戦・2パネルの完成工程をやり直さない。現在の正本は **4パネル（↑開発情報・←ゲーム画面・→テスト操作・↓実行ステータス）** の生成済みチャット用モックで、**静的整合性PASS／チャット内の4パネル表示・実機操作もユーザーPASS（2026-11-10）**。テスト操作のヘッダー・リセット固定と本文スクロール、左右の高さ保持、ⓘ・交換・削除・再追加を確認済み。3パネル試作は別途ユーザーPASS済み。本番共通ゴミ箱CSS修正後もユーザー実機PASS済み。モック専用GitHub Pages・Safari追加検証は行わず、必要な修正はチャットで相談する。
