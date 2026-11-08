import test from "node:test";
import assert from "node:assert/strict";
import { Core } from "../core/Core.js";

test("Core advances frame and elapsed time with a capped delta", () => {
  const core = new Core();
  core.update(0.25);
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.frameId, 1);
  assert.equal(snapshot.elapsedTime, 0.1);
});

test("Core snapshot is detached and deeply read-only", () => {
  const core = new Core();
  const snapshot = core.getSnapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.player), true);
  assert.throws(() => { snapshot.player.x = 42; }, TypeError);
  core.state.player.x = 7;
  assert.equal(snapshot.player.x, 0);
});

test("Core reset restores defaults and clears elapsed frame state", () => {
  const core = new Core();
  core.update(0.05, { moveX: 1 });
  core.reset();
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.frameId, 0);
  assert.equal(snapshot.elapsedTime, 0);
  assert.equal(snapshot.player.x, 0);
  assert.equal(snapshot.lastCommands, undefined);
});
