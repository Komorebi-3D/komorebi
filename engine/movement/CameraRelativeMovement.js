/**
 * Pure camera-relative ground movement. No DOM, Camera or Renderer dependency.
 * +x = screen right; -y = screen up / forward. Units = world units per second.
 * Camera yaw 0 means camera looks toward world -Z from +Z.
 */
export function moveCameraRelative(position, input, yaw, speed, deltaSeconds, limit = Infinity) {
  const x = Number(input?.moveX) || 0;
  const y = Number(input?.moveY) || 0;
  const magnitude = Math.hypot(x, y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const worldX = (x * c + y * s) * scale;
  const worldZ = (-x * s + y * c) * scale;
  const dt = Math.max(0, Math.min(Number(deltaSeconds) || 0, 0.05));
  const step = Math.max(0, Number(speed) || 0) * dt;
  const clamp = value => Math.max(-limit, Math.min(limit, value));
  return {
    x: clamp((Number(position.x) || 0) + worldX * step),
    y: Number(position.y) || 0,
    z: clamp((Number(position.z) || 0) + worldZ * step),
    directionX: worldX,
    directionZ: worldZ
  };
}
