# Komorebi Engine

Komorebi 3Dで検証した、ブラウザ用の再利用可能な3Dエンジン基盤です。**`engine/`は現在`main`ブランチに正式配置済み**です。

## アーキテクチャ

エンジンはゲーム固有の家・木・ハムスターの情報を持ちません。ゲーム側がフィールド・障害物・シーンメッシュを組み立て、Engineの共通APIへ渡します。

| 領域 | 主なモジュール | 役割 |
| --- | --- | --- |
| 入力 | `input/InputManager.js`、`DualStickAdapter.js`、`TouchStick.js` | 2本のタッチスティック・回転ボタン・入力解除 |
| カメラ | `camera/FollowCameraRig.js`、`CameraState.js` | カメラ回転、ピッチ制限、追従、視点姿勢 |
| コア | `core/CharacterMotionCore2D.js` | キャラクター座標・方向・回転・移動・リセット |
| 衝突 | `collision/GroundBounds.js`、`CollisionWorld2D.js` | X/Z境界、矩形・円の当たり判定、壁沿い移動 |
| 描画 | `renderer/RendererFactory.js`、`MeshRendererA.js`、`MeshRendererB.js` | WebGL1またはThree.jsの交換可能な描画 |
| 描画データ | `renderer/MeshRenderSnapshot.js` | A/Bが同じフレーム状態を扱うための不変スナップショット |
| 拡張基盤 | `scene/`、`entity/`、`component/`、`Engine.js` | 将来のゲーム再利用に向けた基礎コンポーネント |

## 入出力の規約

- Input: 右を +X、下を +Y。移動スティックは放射状デッドゾーン、カメラスティックは軸ごとのデッドゾーン（標準0.06）。
- Core: ゲーム互換の入力`{x,y}`と60Hz基準フレーム単位`dtFrames`を受け取ります。回転の新規押下は0.14 rad、継続回転は0.025 rad/フレーム、移動量は0.095単位/フレーム（現行ゲーム設定）。
- Collision: 半径付きキャラクターと矩形/円の障害物を使い、細かいステップで移動判定して壁沿い移動を可能にします。
- Renderer: `createRenderer("A" | "B", {profile:"mesh"})` でメッシュ描画。APIは`initialize({canvas})`、`render(snapshot)`、`resize()`、`dispose()`です。
- 初期のボックス描画プロファイル（`RendererA.js`/`RendererB.js`と`RenderSnapshot.js`）もデモ用に維持しています。
- ゲームの家・木・階段・屋内判定・シーン生成ロジックは`komorebi3d/`側です。

## 対象ゲームとテスト

**[Komorebi 3D v0.7 — Engine main統合版](https://komorebi-3d.github.io/komorebi/komorebi3d/komorebi3d-app-v07-engine-main-test.html)**

2026-11-08：iPhone Safariでユーザー実機テスト **PASS**。Input、Camera、Renderer、Core、Collisionの統合版。

Node.jsユニットテストは次のコマンドを使用します。

```sh
cd engine
npm test
```

`tests/`には入力、カメラ、衝突、Core、描画契約のテストがあります。`demos/`には過去の機能別デモを残しています。ユニットテストとソース静的確認は、実機Safariでの描画を代替しません。

## 今後の課題

シーン管理の本格統合、テクスチャ・アセット管理・シリアライズ、より広範なレンダリング機能、CI、自動化されたブラウザテストなどは今後の開発対象です。現段階では、最初の製品`Komorebi 3D`を動かす共通基盤の統合が完了しています。
