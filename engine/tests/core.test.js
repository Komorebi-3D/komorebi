import test from "node:test";
import assert from "node:assert/strict";
import { Core } from "../core/Core.js";

test("Core updates elapsed time and frame ID", () => {
  const core = new Core();
  core.update(0.016, { moveX: 1 });
  const state = core.getSnapshot();
  assert.equal(state.frameId, 1);
  assert.equal(state.elapsedTime, 0.016);
  assert.equal(state.lastCommands.moveX, 1);
});

test("Core snapshots are isolated and read-only", () => {
  const core = new Core();
  const state = core.getSnapshot();
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.player));
  assert.throws(() => { state.player.x = 99; }, TypeError);
  assert.equal(core.getSnapshot().player.x, 0);
});

test("Core reset restores its initial state", () => {
  const core = new Core();
  core.update(0.02);
  core.reset();
  assert.equal(core.getSnapshot().frameId, 0);
  assert.equal(core.getSnapshot().elapsedTime, 0);
});
