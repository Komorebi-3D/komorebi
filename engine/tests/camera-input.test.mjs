import test from "node:test";
import assert from "node:assert/strict";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera.js";
import { moveCameraRelative } from "../movement/CameraRelativeMovement.js";
import { InputManager } from "../input/InputManager.js";

test("right stick changes camera yaw and up looks down (higher orbit)", () => {
  const camera = new ThirdPersonCamera({ yawSpeed: 1, pitchSpeed: 1 });
  const start = camera.snapshot();
  camera.update({ cameraX: 1, cameraY: -1 }, 0.05);
  const next = camera.snapshot();
  assert.ok(next.yaw > start.yaw);
  assert.ok(next.pitch > start.pitch);
});

test("camera pitch stays within its limits and reset restores defaults", () => {
  const camera = new ThirdPersonCamera({ pitchSpeed: 100 });
  for (let i=0;i<100;i++) camera.update({ cameraY: -1 }, 0.05);
  assert.equal(camera.snapshot().pitch, 80*Math.PI/180);
  for (let i=0;i<100;i++) camera.update({ cameraY: 1 }, 0.05);
  assert.equal(camera.snapshot().pitch, 10*Math.PI/180);
  camera.reset();
  assert.equal(camera.snapshot().yaw, 0);
  assert.equal(camera.snapshot().pitch, 35*Math.PI/180);
});

test("camera follows player through a renderer-independent pose", () => {
  const camera = new ThirdPersonCamera({ yaw: 0, pitch: 0.5, distance: 10, targetHeight: 1.2 });
  const pose = camera.getPose({ x: 3, y: 0, z: -4 });
  assert.deepEqual(pose.target, [3,1.2,-4]);
  assert.ok(pose.eye[1] > pose.target[1]);
  assert.ok(pose.eye[2] > pose.target[2]);
  assert.ok(Object.isFrozen(pose));
});

test("camera relative movement remains intuitive after yaw rotation", () => {
  const origin = { x: 0, y: 0, z: 0 };
  const up = { moveX: 0, moveY: -1 };
  const start = moveCameraRelative(origin, up, 0, 4, 0.05);
  assert.ok(Math.abs(start.x) < 1e-9);
  assert.ok(start.z < 0);
  const rotated = moveCameraRelative(origin, up, Math.PI/2, 4, 0.05);
  assert.ok(rotated.x < 0);
  assert.ok(Math.abs(rotated.z) < 1e-9);
});

test("combined InputManager sample updates camera and movement without DOM", () => {
  const input = new InputManager({ poll: () => ({ moveX: 0, moveY: -1, cameraX: 1, cameraY: -1 }) });
  const camera = new ThirdPersonCamera();
  const commands = input.poll();
  const next = moveCameraRelative({ x: 0, y: 0, z: 0 }, commands, camera.snapshot().yaw, 4, 0.05);
  camera.update(commands, 0.05);
  assert.ok(next.z < 0);
  assert.ok(camera.snapshot().yaw > 0);
  input.dispose();
});

test("movement clamp prevents long frame jumps or leaving test bounds", () => {
  const next = moveCameraRelative({ x: 7.99, z: 0 }, { moveX: 1, moveY: 0 }, 0, 4, 3, 8);
  assert.equal(next.x, 8);
});
