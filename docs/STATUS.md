# 🌳 Komorebi 3D / Komorebi Engine — 開発ステータス

> **用途:** 開発状況・確定方針・次タスク・チャット引き継ぎ情報の正本。
>
> **更新日:** 2026-11-09（JST）
> **確認対象:** `main`（確認時点の先頭コミット `babf264904b824255374b8dbd9733a4e703ae284`）
>
> **注意:** これは記録時点の状態です。コードの最新状況と最終コミット時刻はGitHubで確認してください。本ファイルはGitHubコミットに連動して自動更新されません。

## 1. 現在の結論

- **開発フェーズ:** Development / Debug（テスト開発モード）。現段階ではプロダクト用コードへの分離・デバッグ機能の撤去を急がない。
- **実機PASS済みの基準版:** **Komorebi 3D v0.7**。Input / Camera / Renderer A・B / Core / Collision 統合。iPhone SafariでユーザーがPASSを確認。
- **共通Engine:** `engine/` に正式配置済み（現在42ファイル）。既存のゲームは実際にこのEngineのモジュールを利用。
- **最新の固定開発URL:** [komorebi3d/dev.html](https://shuma-fujita1012.github.io/komorebi/komorebi3d/dev.html)。
  - v0.7をベースに作成。ゲーム版、固定Engineコミット、GitHub `main` 最新コミット・最終コミット時刻（JST）を表示。
  - **GitHubへの実装・静的確認済み。dev.html単体のSafari実機PASSは未取得。**
  - `main` の最新コミット表示はGitHub APIで取得する情報であり、**現在配信中のHTMLそのもののコミットIDを証明するものではない**。
- **安定版URL:** [v0.7 engine-main-test.html](https://shuma-fujita1012.github.io/komorebi/komorebi3d/komorebi3d-app-v07-engine-main-test.html)。dev.htmlを更新するときも、このPASS版は退避基準として維持する。

## 2. 実装・検証済み

| 領域 | 検証状況 | 備考 |
| --- | --- | --- |
| Input | 実機PASS | 左右スティック・回転・リセット・入力解除 |
| Camera | 実機PASS | 追従・旋回・上下角度 |
| Renderer A/B | 実機PASS | 自作WebGL A、Three.js B、同じSnapshotによる比較。Bが標準 |
| Core + Collision | 実機PASS | 移動、地面境界、家の壁、木との衝突 |
| ゲームシーン | 実機PASS（v0.7） | 森・家・階段・室内・ハムスター |
| Engineのmain統合 | 完了 | 8つの主要Engine importが統合時のmainコミットに固定 |
| 旧ファイル整理 | 完了 | 旧試験HTMLなど22ファイルをmainから削除。バックアップあり |
| README | 更新済み | ルート、Engine、Komorebi 3D |
| 固定開発URL | 配置・静的チェックPASS | **実機確認待ち** |

※「PASS」は該当テスト時点の結果であり、今後の変更全体を自動保証するものではありません。

## 3. リポジトリの現在の構成

```text
komorebi/
├── README.md
├── docs/
│   └── STATUS.md                 # この開発台帳
├── engine/                       # 共通モジュール・デモ・単体テスト
│   ├── core/
│   ├── collision/
│   ├── input/
│   ├── camera/
│   ├── renderer/
│   ├── scene/
│   ├── entity/
│   ├── component/
│   └── tests/
└── komorebi3d/
    ├── README.md
    ├── dev.html                  # 固定の開発用URL（開発の入口）
    ├── komorebi3d-app-v07-engine-main-test.html # 最終実機PASS基準
    ├── komorebi3d-app-v06-core-test.html       # 過去のPASS版
    └── komorebi3d-app-v05-renderer-v2-test.html # 過去のPASS版
```

### 重要な依存関係

- ゲーム固有のワールド、家、階段、キャラクター、操作UIや起動処理の多くは**ゲームHTML内**。共通の移動・衝突・入力・カメラ・描画は `engine/` が担当。
- `dev.html` と v0.7 HTML は、共通Engineを **GitHubの固定コミット** `d4a392aba35c840e0bea8b585c6852515bf58f30` のjsDelivr URLで読み込む。
- そのため **`main` 側のEngineだけ更新しても、dev.htmlが自動的に最新版Engineへ切り替わるわけではない**。今後の機能更新ではページと依存バージョンを合わせて管理し、改めて実機テストする。
- `dev.html` の更新もGitHub Pagesへのデプロイ反映を待つ必要があり、Safariに開きっぱなしのページが自動で差し替わるわけではない。
- GitHubの最新コミット・最終コミット時刻はdev.htmlに表示するが、**反映完了判定と混同しない**。

## 4. 守る開発方針

1. **GitHub `main`をコードの正本**にする。ChatGPTチャットは相談・変更作業・実機テスト結果の報告場所。
2. **「00｜統合開発」チャットを基本1本で運用**。肥大化したら新しい00に切り替える。旧01〜03（Core / Renderer / Input）は必要時に参照する過去資料とし、通常は分業しない。
3. **Development / Debugを維持。** ゲーム完成後にテスト表示・診断機能を整理して製品版に昇格する。現時点ではプロダクトコードの大規模分割は急がない。
4. **固定URL `komorebi3d/dev.html` を開発の入口**にする。テスト前にGitHubへのコミットと公開ページの反映を区別する。
5. **最後の実機PASS版を保護**する。新機能はdev.html等で試し、ユーザーの実機PASS後に次の基準版とする。
6. 重大なファイル削除、ブランチ削除は**対象を提示して承認後**に行う。GitHub履歴とバックアップを維持する。
7. 動作確認の報告では、**静的チェック／自動テスト／Safari実機PASSを区別**して記録する。

## 5. ブランチ・復元情報

- `main` — 現在の開発正本。
- `engine-foundation-v0.1` — 統合前のEngine開発履歴（保護）。
- `archive/pre-cleanup-2026-11-08` — 旧22ファイル削除前のバックアップ。
- `archive/pre-engine-main-2026-11-08` — Engineをmainへ昇格する前のバックアップ。
- `feature/v03-core-input-renderers` — 過去の作業ブランチ。削除未承認につき保留。

過去のPASSページも `komorebi3d/` に残す。単なる整理目的で勝手に削除しない。

## 6. 次のタスク（候補・未着手）

| 優先度 | タスク | 完了条件 |
| --- | --- | --- |
| **P0** | **dev.htmlのiPhone Safari確認** | 固定URLでゲーム起動、入力・描画・時刻表示が確認でき、ユーザーがPASS |
| P1 | v0.7基準版のリリース管理 | 復旧可能なタグ/基準を定義し、dev.htmlと区別 |
| P1 | 自動テスト・CI | 既存の `engine/tests/*.test.mjs` をGitHub Actions等で実行 |
| P1 | 回帰テスト項目の標準化 | 移動、カメラ、屋内・階段、衝突、Renderer A/B、リセットをチェックリスト化 |
| P1 | 次のゲーム機能を設計・実装 | ユーザーと優先機能を決め、dev.htmlで機能追加・実機PASS |
| P2 | Engine起動処理や責務の漸進的整理 | 動作を保ちつつ重複・依存を減らす（現時点では大規模再構成はしない） |
| P2 | iPhoneでのパフォーマンス検証 | FPS・描画負荷を観測し、改善案と比較基準を記録 |
| 将来 | ゲームの製品化 | 完成後にデバッグ機能を外し、正式起動ページへ昇格 |

**次回の第一候補:** dev.html の実機PASS確認。その後は、ユーザーと次に作るゲーム機能を相談する。

## 7. チャット世代交代の引き継ぎ手順

新しい「00｜統合開発」を作ったら、最初に次のように依頼する：

> Komorebi 3Dの開発を引き継いで。GitHub `shuma-fujita1012/komorebi` の `main` にある `docs/STATUS.md` と最新のコミット・ソースを確認して、現状と次タスクを整理して。コードの正本はGitHubで、開発は `komorebi3d/dev.html` を使用する。勝手に旧PASS版やバックアップを削除しないで。

**チャットを切り替える直前／実機PASS後／設計方針変更後**に、このSTATUSを更新する。

更新時には `更新日`、`実機PASS済み基準版`、`未解決バグ`、`次タスク`、`最終確認したmain` の内容を確認する。「変更したのにSTATUSを更新しなかった」場合は、GitHubの実ソースを優先して照合する。

## 8. 既知の不具合・制限

- **v0.7で未解決の実機不具合:** 現時点の会話では報告なし（網羅的検証を意味しない）。
- **dev.html:** 固定URL用UIを追加した後のSafari実機確認が必要。
- **開発上の制限:** チャット内ゲームプレビューはGitHubと完全同期しないため採用しない。
- **今後の課題:** HTML内のゲーム固有コードは大きい。自動CIとシーン管理の本格統合は未整備。
