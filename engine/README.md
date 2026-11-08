# Komorebi Engine — Foundation v0.1

This is the first modular foundation, not yet a full migration of the current Komorebi 3D runtime.

## Initial modules

- `core/`: engine-owned state and update entry point
- `input/`: device-independent input command polling
- `camera/`: renderer-independent camera state
- `scene/`: scene and entity collection
- `entity/`: generic entity identity and component storage
- `component/`: component type registry
- `renderer/`: backend contract validation
- `shared/`: engine/interface versions

## Boundary rules

1. Engine modules do not know game-specific concepts such as hamster, house, tree, or door.
2. Input produces normalized commands; it does not mutate Core or Renderer state.
3. Core owns authoritative runtime state.
4. Renderers receive the same read-only snapshot and do not mutate game state.
5. Game-specific Components and Systems belong under the consuming game project.

## Deliberate limitations in v0.1

- Existing movement, collision, house, and dual-stick behavior have not yet been migrated into these modules.
- Renderer A/B adapters are not implemented in this foundation.
- Scene serialization, scheduling, physics, and asset loading remain future steps.
- This foundation is intentionally modest and will be refactored as real use cases arrive.

## Compatibility

The existing PASS pages and test pages are kept unchanged. This directory is being developed on the `engine-foundation-v0.1` branch before integration.

## Dual-stick input

- `input/TouchStick.js`: one pointer-captured virtual stick.
- `input/DualStickAdapter.js`: left movement + right camera stick, optional rotate buttons and reset.
- `input/InputManager.js`: normalized, device-independent command polling.

The adapter returns `moveX/moveY/cameraX/cameraY/reset`. Axes are normalized to [-1, 1]. Positive X is right; positive Y is down. Movement stick uses radial deadzone; camera stick uses per-axis deadzone, matching the existing touch behavior. Rotation-button events are available separately through `takeRotationEvents()` so the Application can forward them to the game's Core without coupling Input to Core.

Example construction:

```js
const adapter = new DualStickAdapter({
  movement: { pad: movePad, ring: moveRing, knob: moveKnob },
  camera: { pad: cameraPad, ring: cameraRing, knob: cameraKnob },
  rotateLeft,
  rotateRight,
  reset
});
const input = new InputManager(adapter);
```

The old PASS page remains the behavioral reference; this adapter is a modular extraction and still needs browser/device integration validation before replacing it.

## Renderer A/B comparison — v0.3

New renderer-agnostic contract:

- `renderer/RenderSnapshot.js`: immutable `{version,frameId,camera,objects}` data shared across backends.
- `renderer/RendererA.js`: raw WebGL1 implementation.
- `renderer/RendererB.js`: Three.js 0.160.1 implementation, loaded only when selected.
- `renderer/RendererFactory.js`: `createRenderer("A" | "B")` with common API validation.
- `demos/renderer-compare-v03.html`: A-only, B-only, and simultaneous A/B comparison.
- `tests/renderer-contract.test.mjs`: contract and immutable snapshot unit tests.

Renderer public API: `initialize({canvas})`, `render(snapshot)`, `resize(width,height)`, `dispose()`.
Both renderers receive **the exact same snapshot object** and expose `lastFrameId` for diagnostics.

v0.3 deliberately supports only box primitives, vertex colors, yaw and perspective camera.
This is the first real backend exchange test, **not yet a full migration of the Komorebi 3D house, trees, hamster, or the historical PASS Renderer A/B implementations**.
The historical PASS HTML files remain unchanged.

To test in a modern browser, serve the repository root over HTTPS and navigate to `engine/demos/renderer-compare-v03.html` (ES modules will not load under `file://`).

## Renderer mesh integration — product v0.5 test

The existing primitive (box) renderer profile remains available through
`createRenderer("A" | "B")`. For arbitrary procedural triangle meshes and
per-object visibility/transparency, use `createRenderer("A" | "B", {profile:"mesh"})`:

- `renderer/MeshRenderSnapshot.js`: `createMeshGeometry` creates immutable static triangle geometry; `createMeshRenderSnapshot` creates an immutable per-frame draw snapshot.
- `renderer/MeshRendererA.js`: raw WebGL1 mesh backend with vertex normals/colors and translucent surfaces.
- `renderer/MeshRendererB.js`: Three.js mesh backend with matching camera and mesh descriptors.
- `tests/mesh-renderer.test.mjs`: backend interface and snapshot invariants.

The game still owns terrain, cottage, tree, hamster and house visibility rules.
It passes the **same snapshot instance** into Renderer A and Renderer B.
The production-facing compatibility test is
`komorebi3d/komorebi3d-app-v05-renderer-test.html` on `main`; historical
PASS files and the v0.3 box renderer test are unchanged.

Scope note: this proves backend isolation and supports the current product's
procedural meshes, but it does not yet cover textures, skins, sprites, or PBR.

## Core and collision integration — product v0.6 test

The production migration now uses reusable, game-independent modules:

- `collision/GroundBounds.js`: rectangular ground with bounds, clamping, and edge checks.
- `collision/CollisionWorld2D.js`: circle/rectangle collisions, wall sliding, and substep movement.
- `core/CharacterMotionCore2D.js`: actor position, yaw, held rotation, input-driven movement, reset, teleport.
- `tests/character-motion-2d.test.mjs`: movement and collision regression tests.

For the initial product migration the motion update takes **60Hz reference frame units**
(`dtFrames = deltaMilliseconds / 16.67`) to preserve existing game speed.
A later time-step refactor can convert to seconds without changing the modular API.

The game owns its six specific wall/tree obstacle descriptors and indoor/stair
behavior. Engine owns the general physics behavior. The new product smoke test is
`komorebi3d/komorebi3d-app-v06-core-test.html` on main.

Do not delete the old game scripts or previously PASS-tested pages before
v0.6 passes on iPhone Safari and an explicit repository cleanup review.
