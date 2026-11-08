import test from "node:test";
import assert from "node:assert/strict";
import { InputManager } from "../input/InputManager.js";

test("Input normalizes axes and keeps reset independent", () => {
  const input = new InputManager({ poll: () => ({ moveX: 2, moveY: -2, cameraX: 0.5, cameraY: -0.5, reset: true }) });
  assert.deepEqual(input.poll(), { moveX: 1, moveY: -1, cameraX: 0.5, cameraY: -0.5, reset: true });
});

test("Input pause and clear prevent stuck controls", () => {
  let cleared = 0;
  const input = new InputManager({ poll: () => ({ moveX: 1 }), clear: () => { cleared++; } });
  input.poll();
  input.pause();
  assert.deepEqual(input.poll(), { moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false });
  assert.equal(cleared, 1);
  input.resume();
  assert.equal(input.poll().moveX, 1);
});

test("Input dispose releases adapter", () => {
  let disposed = false;
  const input = new InputManager({ dispose: () => { disposed = true; } });
  input.dispose();
  assert.equal(disposed, true);
  assert.equal(input.poll().moveX, 0);
});
