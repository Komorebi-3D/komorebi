export class CameraState {
  constructor({ yaw = 0, pitch = 35 * Math.PI / 180, minPitch = 10 * Math.PI / 180, maxPitch = 80 * Math.PI / 180, distance = 19 } = {}) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.minPitch = minPitch;
    this.maxPitch = maxPitch;
    this.distance = distance;
  }

  applyInput(x, y, sensitivity = 1) {
    this.yaw += (Number(x) || 0) * sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch + (Number(y) || 0) * sensitivity));
  }

  snapshot() {
    return Object.freeze({ yaw: this.yaw, pitch: this.pitch, distance: this.distance });
  }
}
