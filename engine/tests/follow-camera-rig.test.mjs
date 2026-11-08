import test from "node:test";
import assert from "node:assert/strict";
import { FollowCameraRig } from "../camera/FollowCameraRig.js";

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `Expected ${actual} ≈ ${expected}`);
}

test("FollowCameraRig matches former product horizontal-distance camera formula", () => {
  const rig = new FollowCameraRig({ yaw: .2, pitch: 35 * Math.PI / 180, horizontalDistance: 19, targetY: 2.7 });
  const heading = .55;
  const pose = rig.getPose({ x: 3, z: 4 }, heading);
  near(pose.eye[0], 3 + Math.sin(.75) * 19);
  near(pose.eye[1], 2.7 + Math.tan(35 * Math.PI / 180) * 19);
  near(pose.eye[2], 4 + Math.cos(.75) * 19);
  assert.deepEqual(pose.target, [3,2.7,4]);
  assert.ok(Object.isFrozen(pose.eye));
});

test("Engine camera step matches legacy per-frame yaw and pitch increments", () => {
  const rig = new FollowCameraRig();
  rig.update({cameraX:1,cameraY:-1},1/60);
  near(rig.snapshot().yaw, .025);
  near(rig.snapshot().pitch, 35*Math.PI/180-.018);
});

test("Camera pitch clamps and resets to defaults", () => {
  const rig = new FollowCameraRig();
  for(let i=0;i<1000;i++)rig.update({cameraY:1},1/60);
  near(rig.snapshot().pitch, 80*Math.PI/180);
  for(let i=0;i<1000;i++)rig.update({cameraY:-1},1/60);
  near(rig.snapshot().pitch, 10*Math.PI/180);
  rig.reset();
  near(rig.snapshot().pitch, 35*Math.PI/180);
  near(rig.snapshot().yaw, 0);
  near(rig.snapshot().horizontalDistance, 19);
});

test("House camera profile moves smoothly and does not affect Core position", () => {
  const rig = new FollowCameraRig();
  rig.update({},1/60,{horizontalDistance:6.2,targetY:4.8});
  near(rig.snapshot().horizontalDistance, 19 + (6.2 - 19) * .085);
  near(rig.snapshot().targetY, 2.7 + (4.8 - 2.7) * .085);
  const before = rig.getPose({x:4,z:-4});
  assert.deepEqual(before.target.slice(0,1), [4]);
  rig.reset();
  const after = rig.getPose({x:4,z:-4});
  near(after.horizontalDistance,19);
  near(after.target[1],2.7);
});

test("Rig permits fast frame input but clamps large stalled frame delta",()=>{
  const rig = new FollowCameraRig();
  rig.update({cameraX:1},8);
  near(rig.snapshot().yaw,.05*1.5);
});

test("Invalid follow targets are rejected",()=>{
  const rig = new FollowCameraRig();
  assert.throws(()=>rig.update({},1/60,{horizontalDistance:0}),TypeError);
  assert.throws(()=>rig.update({},1/60,{targetY:NaN}),TypeError);
});
