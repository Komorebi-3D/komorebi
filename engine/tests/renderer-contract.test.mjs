import test from "node:test";
import assert from "node:assert/strict";
import { assertRenderer } from "../renderer/RendererContract.js";
import { createRenderer } from "../renderer/RendererFactory.js";
import { createRenderSnapshot } from "../renderer/RenderSnapshot.js";

test("both Renderers expose the common public contract", async () => {
  for (const name of ["A","B"]) {
    const renderer = await createRenderer(name);
    assert.equal(assertRenderer(renderer), renderer);
    assert.equal(renderer.lastFrameId, -1);
  }
});

test("unknown renderer backend is rejected", async () => {
  await assert.rejects(createRenderer("C"), /Unknown Renderer backend/);
});

test("common RenderSnapshot is read-only, owns detached camera and object arrays", () => {
  const eye = [0,5,10], p = [1,0,2];
  const snapshot = createRenderSnapshot({
    frameId: 7,
    camera: { eye, target: [0,0,0] },
    objects: [{ id: "player", shape: "box", position: p, size: [1,2,1], color: 0xff0000 }]
  });
  assert.equal(snapshot.frameId, 7);
  assert.equal(snapshot.version, 1);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.objects[0].position), true);
  assert.throws(() => { snapshot.objects[0].position[0] = 30; }, TypeError);
  eye[0] = 20;
  p[0] = 15;
  assert.equal(snapshot.camera.eye[0], 0);
  assert.equal(snapshot.objects[0].position[0], 1);
});

test("snapshot rejects duplicate IDs and malformed data", () => {
  const object = { id: "x", shape: "box", position: [0,0,0], size: [1,1,1], color: 0xabcdef };
  assert.throws(() => createRenderSnapshot({
    frameId: 1, camera: { eye:[0,0,10], target:[0,0,0] }, objects:[object,object]
  }), /Duplicate object id/);
});
