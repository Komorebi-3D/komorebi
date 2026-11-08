# 🌳 Komorebi Engine / Komorebi 3D

モバイル向け3Dゲーム **Komorebi 3D** と、そのゲームで実機検証した共通エンジン **Komorebi Engine** の開発リポジトリです。

## 現在の安定基準（2026-11-08）

**[Komorebi 3D v0.7 — Engine main統合版](https://shuma-fujita1012.github.io/komorebi/komorebi3d/komorebi3d-app-v07-engine-main-test.html)**

- iPhone Safariのユーザー実機確認で **PASS**。
- Input・Camera・Renderer A/B・Core・Collisionを共通Engineから利用。
- Renderer **B（Three.js）を標準表示**。A（WebGL）とA/B比較にも切り替え可能。
- 100mフィールド、森、家、階段、ハムスター、移動・回転・衝突判定などを含む。

## リポジトリ構造

```text
komorebi/
├── engine/        # 再利用可能なエンジンのソース・デモ・ユニットテスト
│   ├── core/
│   ├── collision/
│   ├── input/
│   ├── camera/
│   ├── renderer/
│   └── tests/
├── komorebi3d/    # ゲーム本体と比較・復旧用の安定版
└── README.md
```

- [Engineの仕様](engine/README.md)
- [ゲーム版と確認手順](komorebi3d/README.md)

## テスト

エンジンのユニットテスト（Node.js）:

```sh
cd engine
npm test
```

実機のタッチ・WebGL描画については、iPhone Safariでの手動確認が必要です。ソースチェックやユニットテストだけでは実機動作を保証しません。

## ブランチと復元

- `main` — 現在の統合版と正式なEngine配置先。
- `engine-foundation-v0.1` — 統合前のEngine開発履歴。**保全中**。
- `archive/pre-cleanup-2026-11-08` — 旧22ファイル削除前のスナップショット（旧26ファイル）。
- `archive/pre-engine-main-2026-11-08` — Engineを`main`へ移す直前のスナップショット。
- `feature/v03-core-input-renderers` — 過去の作業ブランチ。レビュー・整理待ち。

削除済みの旧HTMLはGitの履歴とバックアップブランチから復元できます。バックアップのブランチは削除していません。

## リリース管理について

v0.7は、現時点では**実機PASS済みのHTML基準版**です。v0.7のES module依存は過去の`main`コミットSHAにピン留めされているため、最新版`main`へ変更しても参照先の内容が勝手に切り替わりません。正式なリリースタグ・CI・自動テストの整備は今後の課題です。
