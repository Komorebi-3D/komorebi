import { CameraState } from "./CameraState.js";

/**
 * Generic ground-follow orbit camera (no DOM, renderer, scene or game imports).
 *
 * Coordinate convention:
 *   - +Y is up; ground plane is X/Z.
 *   - cameraX +1 rotates the view to the right.
 *   - cameraY +1 raises pitch (looking farther down).
 *   - headingOffset is an external actor yaw added only when composing a pose.
 *   - horizontalDistance is ground-plane radius, not diagonal eye-to-target length.
 *
 * update() receives delta SECONDS; follow targets come from game logic, but the
 * camera owns smoothing, pitch limits, view direction, and the resulting pose.
 */
export class FollowCameraRig {
  constructor({
    yaw = 0,
    pitch = 35 * Math.PI / 180,
    horizontalDistance = 19,
    targetY = 2.7,
    minPitch = 10 * Math.PI / 180,
    maxPitch = 80 * Math.PI / 180,
    yawSpeed = 1.5,
    pitchSpeed = 1.08,
    followRate = 5.1
  } = {}) {
    this.defaults = Object.freeze({
      yaw, pitch, horizontalDistance, targetY,
      minPitch, maxPitch, yawSpeed, pitchSpeed, followRate
    });
    this.reset();
  }

  update({ cameraX = 0, cameraY = 0 } = {}, deltaSeconds = 0, profile = {}) {
    const dt = Math.max(0, Math.min(.05, Number(deltaSeconds) || 0));
    const x = Math.max(-1, Math.min(1, Number(cameraX) || 0));
    const y = Math.max(-1, Math.min(1, Number(cameraY) || 0));
    this.state.yaw += x * this.yawSpeed * dt;
    this.state.pitch = Math.max(this.state.minPitch, Math.min(
      this.state.maxPitch, this.state.pitch + y * this.pitchSpeed * dt
    ));
    const desiredDistance = profile.horizontalDistance ?? this.state.distance;
    const desiredTargetY = profile.targetY ?? this.targetY;
    if (!Number.isFinite(desiredDistance) || desiredDistance <= 0 || !Number.isFinite(desiredTargetY)) {
      throw new TypeError("Camera follow profile requires a positive distance and finite targetY");
    }
    const smoothing = Math.min(1, this.followRate * dt);
    this.state.distance += (desiredDistance - this.state.distance) * smoothing;
    this.targetY += (desiredTargetY - this.targetY) * smoothing;
    return this.snapshot();
  }

  getPose(position = { x: 0, z: 0 }, headingOffset = 0) {
    const x = Number(position?.x) || 0;
    const z = Number(position?.z) || 0;
    const yaw = this.state.yaw + (Number(headingOffset) || 0);
    const pitch = this.state.pitch;
    const horizontalDistance = this.state.distance;
    return Object.freeze({
      yaw, pitch, horizontalDistance,
      eye: Object.freeze([
        x + Math.sin(yaw) * horizontalDistance,
        this.targetY + Math.tan(pitch) * horizontalDistance,
        z + Math.cos(yaw) * horizontalDistance
      ]),
      target: Object.freeze([x, this.targetY, z])
    });
  }

  reset() {
    const d = this.defaults;
    this.state = new CameraState({
      yaw: d.yaw, pitch: d.pitch, distance: d.horizontalDistance,
      minPitch: d.minPitch, maxPitch: d.maxPitch
    });
    this.targetY = d.targetY;
    this.yawSpeed = d.yawSpeed;
    this.pitchSpeed = d.pitchSpeed;
    this.followRate = d.followRate;
  }

  snapshot() {
    const { yaw, pitch, distance } = this.state;
    return Object.freeze({ yaw, pitch, horizontalDistance: distance, targetY: this.targetY });
  }
}
