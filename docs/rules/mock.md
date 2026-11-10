# 🌳 Komorebi 3D｜モック運用ルール

## 1. モック作成・表示の手順

1. GitHub `main` から `komorebi3d/mock.chat.html` の最新版を取得する。
2. 取得したHTML・CSS・JavaScriptの全文を確認する。
3. ChatGPTの回答本文に**1つだけAppBlockを作成し、開始タグ `<AppBlock>` と終了タグ `</AppBlock>` の間に取得した全文を直接記述して、インタラクティブに表示する。**

GitHubの取得結果を自動転送する仕組みは不要。回答内のAppBlock本文に直接記述する。

## 2. チャットでのモック作成開始

ユーザーがチャットでモックの表示・作成を依頼したら、上記手順に従って表示を開始する。

既存の完成モックを優先し、不要な再生成やJavaScriptの再実装は行わない。

表示前の文字数・行数報告や追加承認は不要とする。

## 3. GitHub最新版の表示ボタン

モックを表示した返信には、必ずAppBlockの下に次のボタンを設置する。

**🔄 GitHub最新版のモックを表示**

ボタンには `GenUI.issueNewTurn` を使用し、押された際に次のメッセージを送信する。

「GitHub main の komorebi3d/mock.chat.html を再取得して、最新版のモックとして表示して。」

ボタンが押されたら、GitHub `main` から最新版を再取得し、同じ手順で1つのAppBlockに表示する。
