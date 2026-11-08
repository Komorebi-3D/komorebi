# Komorebi 3D

Komorebi Engineを利用するモバイル向け3Dゲームです。

## 現在の安定基準：v0.7

**[Komorebi 3D v0.7を開く](https://shuma-fujita1012.github.io/komorebi/komorebi3d/komorebi3d-app-v07-engine-main-test.html)**

2026-11-08、iPhone Safari実機テスト **PASS**。Input・Camera・Renderer・Core・Collisionを`main`に統合したEngineから読み込みます。

### 操作・確認項目

- 左スティック：カメラ方向に合わせて移動
- 右スティック：カメラの向き・上下角度を変更
- 左右の回転ボタン、リセット
- 木・家の壁・地面境界での衝突
- 家への出入り、階段、屋内での視点追従
- A（WebGL）・B（Three.js）・A/B同時比較。初期表示は **B**。

## 保護している安定版（最新＋1世代前）

| ファイル | 位置付け |
| --- | --- |
| `komorebi3d-app-v07-engine-main-test.html` | **現在の安定基準／実機PASS** |
| `komorebi3d-app-v06-core-test.html` | 旧統合版／実機PASS |

通常保存するゲームHTMLは **`dev.html`（開発版）＋最新PASS版＋1世代前PASS版** の3種類です。v0.5.1以前のHTMLは`main`から整理済みで、必要な場合はGitのコミット履歴から復元します。

新しいPASS版ができたら、最新と前世代を残し、2世代前はGit履歴を確認して整理します。通常の`archive/`バックアップブランチは作りません。詳細は [開発ステータス](../docs/STATUS.md) を参照してください。

## 現在の開発用ページ

**[固定開発URL dev.html](https://shuma-fujita1012.github.io/komorebi/komorebi3d/dev.html)** — ゲームv0.7を元にした開発版。コミット情報・JST時刻表示を実装済み（実機再確認待ち）。

## ソースと依存

このゲームの現在のページは単体HTMLにシーン構築とゲーム固有の家・階段ルールを保持し、共通のInput、Camera、Renderer、Core、Collisionを`../engine/`のモジュールから取り込む構成です。

Web公開版では、ブラウザ上のES moduleの読み込みを安定させるため、`main`で作成された特定コミットを指すCDNの固定URLを使用しています。エンジンのソース本体は[engine/](../engine/)にあります。

**注意:** ファイル名の`-test`は正式なアプリ名ではなく開発・検証の識別子です。v0.7実機PASS後もWebGLや接続環境が違う端末は別途確認が必要です。
