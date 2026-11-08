import test from "node:test";
import assert from "node:assert/strict";
import { InputManager } from "../input/InputManager.js";

test("InputManager normalizes axes and maps reset to boolean", () => {
  const input = new InputManager({
    poll: () => ({ moveX: 2, moveY: -0.4, cameraX: "0.5", cameraY: -9, reset: 1 })
  });
  assert.deepEqual(input.poll(), {
    moveX: 1, moveY: -0.4, cameraX: 0.5, cameraY: -1, reset: true
  });
});

test("pause clears input and polling remains neutral until resume", () => {
  let clears = 0;
  const input = new InputManager({
    poll: () => ({ moveX: 1 }),
    clear: () => { clears += 1; }
  });
  input.pause();
  assert.equal(clears, 1);
  assert.deepEqual(input.poll(), {
    moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false
  });
  input.resume();
  assert.equal(input.poll().moveX, 1);
});

test("clear and dispose release adapter and return neutral input", () => {
  let clears = 0;
  let disposed = 0;
  const input = new InputManager({
    poll: () => ({ cameraX: 1 }),
    clear: () => { clears += 1; },
    dispose: () => { disposed += 1; }
  });
  input.poll();
  input.clear();
  assert.equal(input.poll().cameraX, 1);
  input.dispose();
  assert.equal(clears, 2);
  assert.equal(disposed, 1);
  assert.deepEqual(input.poll(), {
    moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { InputManager } from "../input/InputManager.js";
import { DualStickAdapter } from "../input/DualStickAdapter.js";

class FakeElement {
  constructor() { this.listeners = new Map(); this.style = {}; this.captured = new Set(); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) ?? []) fn({ preventDefault() {}, pointerId: 1, clientX: 50, clientY: 50, ...event }); }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}

function makeAdapter() {
  const movement = { pad: new FakeElement(), ring: new FakeElement(), knob: new FakeElement() };
  const camera = { pad: new FakeElement(), ring: new FakeElement(), knob: new FakeElement() };
  const reset = new FakeElement();
  const rotateLeft = new FakeElement();
  const rotateRight = new FakeElement();
  const adapter = new DualStickAdapter({ movement, camera, reset, rotateLeft, rotateRight });
  return { adapter, movement, camera, reset, rotateLeft, rotateRight };
}

test("DualStickAdapter supports simultaneous independent movement and camera pointers", () => {
  const { adapter, movement, camera } = makeAdapter();
  movement.pad.emit("pointerdown", { pointerId: 11, clientX: 10, clientY: 10 });
  movement.pad.emit("pointermove", { pointerId: 11, clientX: 50, clientY: 10 });
  camera.pad.emit("pointerdown", { pointerId: 22, clientX: 10, clientY: 10 });
  camera.pad.emit("pointermove", { pointerId: 22, clientX: 10, clientY: 50 });
  assert.deepEqual(adapter.poll(), { moveX: 1, moveY: 0, cameraX: 0, cameraY: 1, reset: false });
  adapter.dispose();
});

test("pointercancel clears only the matching stick and pause clears both", () => {
  const { adapter, movement, camera } = makeAdapter();
  movement.pad.emit("pointerdown", { pointerId: 1, clientX: 10, clientY: 10 });
  movement.pad.emit("pointermove", { pointerId: 1, clientX: 50, clientY: 10 });
  camera.pad.emit("pointerdown", { pointerId: 2, clientX: 10, clientY: 10 });
  camera.pad.emit("pointermove", { pointerId: 2, clientX: 10, clientY: 50 });
  movement.pad.emit("pointercancel", { pointerId: 1 });
  assert.deepEqual(adapter.poll(), { moveX: 0, moveY: 0, cameraX: 0, cameraY: 1, reset: false });
  adapter.pause();
  assert.deepEqual(adapter.poll(), { moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false });
  adapter.dispose();
});

test("InputManager consumes dual-stick adapter and reset is one-shot", () => {
  const { adapter, reset } = makeAdapter();
  const input = new InputManager(adapter);
  assert.equal(input.poll().reset, false);
  reset.emit("click");
  assert.equal(input.poll().reset, true);
  assert.equal(input.poll().reset, false);
  input.dispose();
});

test("rotation buttons preserve most-recent-held priority and release to remaining direction", () => {
  const { adapter, rotateLeft, rotateRight } = makeAdapter();
  const input = new InputManager(adapter);
  rotateLeft.emit("pointerdown", { pointerId: 31 });
  rotateRight.emit("pointerdown", { pointerId: 32 });
  assert.deepEqual(input.takeRotationEvents(), [
    { direction: -1, phase: "down" },
    { direction: 1, phase: "down" }
  ]);
  rotateRight.emit("pointerup", { pointerId: 32 });
  assert.deepEqual(input.takeRotationEvents(), [{ direction: -1, phase: "hold" }]);
  rotateLeft.emit("pointercancel", { pointerId: 31 });
  assert.deepEqual(input.takeRotationEvents(), [{ direction: 0, phase: "hold" }]);
  input.dispose();
});
