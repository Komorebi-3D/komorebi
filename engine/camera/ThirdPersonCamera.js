import { CameraState } from "./CameraState.js";

/**
 * Renderer-independent third-person orbit camera.
 * Inputs use x right-positive, y down-positive; pushing up raises the viewpoint (look down).
 * Time unit: seconds. The camera is not a DOM or WebGL object.
 */
export class ThirdPersonCamera {
  constructor({
    yaw = 0, pitch = 35 * Math.PI / 180, distance = 12,
    minPitch = 10 * Math.PI / 180, maxPitch = 80 * Math.PI / 180,
    yawSpeed = 1.5, pitchSpeed = 1.08, targetHeight = 1.05
  } = {}) {
    this.settings = { yawSpeed, pitchSpeed, targetHeight };
    this.defaults = { yaw, pitch, distance, minPitch, maxPitch };
    this.state = new CameraState(this.defaults);
  }

  update({ cameraX = 0, cameraY = 0 } = {}, deltaSeconds = 0) {
    const dt = Math.max(0, Math.min(Number(deltaSeconds) || 0, 0.05));
    this.state.yaw += (Number(cameraX) || 0) * this.settings.yawSpeed * dt;
    this.state.pitch = Math.max(this.state.minPitch, Math.min(
      this.state.maxPitch,
      this.state.pitch - (Number(cameraY) || 0) * this.settings.pitchSpeed * dt
    ));
  }

  getPose(targetPosition = { x: 0, y: 0, z: 0 }) {
    const { yaw, pitch, distance } = this.state;
    const tx = Number(targetPosition.x) || 0;
    const ty = (Number(targetPosition.y) || 0) + this.settings.targetHeight;
    const tz = Number(targetPosition.z) || 0;
    const horizontal = Math.cos(pitch) * distance;
    return Object.freeze({
      yaw, pitch, distance,
      eye: Object.freeze([
        tx + Math.sin(yaw) * horizontal,
        ty + Math.sin(pitch) * distance,
        tz + Math.cos(yaw) * horizontal
      ]),
      target: Object.freeze([tx, ty, tz])
    });
  }

  reset() {
    this.state = new CameraState(this.defaults);
  }

  snapshot() {
    return this.state.snapshot();
  }
}
