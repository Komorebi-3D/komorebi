import test from "node:test";
import assert from "node:assert/strict";
import { CameraState } from "../camera/CameraState.js";

test("CameraState applies horizontal input and retains yaw", () => {
  const camera = new CameraState();
  camera.applyInput(0.5, 0, 2);
  assert.equal(camera.yaw, 1);
  assert.equal(camera.snapshot().yaw, 1);
});

test("CameraState clamps pitch to configured limits", () => {
  const camera = new CameraState();
  camera.applyInput(0, 100);
  assert.equal(camera.pitch, camera.maxPitch);
  camera.applyInput(0, -200);
  assert.equal(camera.pitch, camera.minPitch);
});

test("Camera snapshot is read-only and does not expose mutable state", () => {
  const camera = new CameraState();
  const snapshot = camera.snapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.throws(() => { snapshot.yaw = 100; }, TypeError);
  camera.applyInput(1, 0);
  assert.equal(snapshot.yaw, 0);
});
