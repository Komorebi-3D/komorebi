import { TouchStick } from "./TouchStick.js";

/**
 * Dual-stick touch adapter:
 * - movement: right +x, down +y
 * - camera: right +x, down +y
 * - optional legacy rotation buttons, and reset button
 * Core/Camera/Renderer remain entirely unaware of DOM and pointer IDs.
 */
export class DualStickAdapter {
  constructor({ movement, camera, rotateLeft = null, rotateRight = null, reset = null, deadzone = 0.06, radius = 40 } = {}) {
    this.movement = new TouchStick({ ...movement, deadzone, radius, axisDeadzone: false });
    this.camera = new TouchStick({ ...camera, deadzone, radius, axisDeadzone: true });
    this.buttonBindings = [];
    this.buttons = new Map();
    this.rotationEvents = [];
    this.sequence = 0;
    this.resetPending = false;
    this.enabled = true;
    if (rotateLeft) this.attachRotation(rotateLeft, -1);
    if (rotateRight) this.attachRotation(rotateRight, 1);
    if (reset) this.attachReset(reset);
  }

  bind(el, name, fn) {
    el.addEventListener(name, fn);
    this.buttonBindings.push([el, name, fn]);
  }

  attachRotation(button, direction) {
    button.style.touchAction = "none";
    this.bind(button, "pointerdown", e => {
      if (!this.enabled || this.buttons.has(button)) return;
      e.preventDefault();
      this.buttons.set(button, { id: e.pointerId, direction, order: ++this.sequence });
      this.rotationEvents.push({ direction, phase: "down" });
      try { button.setPointerCapture?.(e.pointerId); } catch (_) {}
    });
    const end = e => {
      const value = this.buttons.get(button);
      if (!value || value.id !== e.pointerId) return;
      this.buttons.delete(button);
      const winner = [...this.buttons.values()].sort((a, b) => b.order - a.order)[0];
      this.rotationEvents.push({ direction: winner?.direction ?? 0, phase: "hold" });
      try {
        if (button.hasPointerCapture?.(e.pointerId)) button.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) this.bind(button, name, end);
  }

  attachReset(button) {
    this.bind(button, "click", () => {
      if (!this.enabled) return;
      this.clear();
      this.resetPending = true;
    });
  }

  poll() {
    if (!this.enabled) return this.neutral();
    const move = this.movement.poll();
    const camera = this.camera.poll();
    const reset = this.resetPending;
    this.resetPending = false;
    return {
      moveX: move.x, moveY: move.y,
      cameraX: camera.x, cameraY: camera.y, reset
    };
  }

  neutral() {
    return { moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false };
  }

  /** One-shot rotation events; an Application can forward them to an older Core. */
  takeRotationEvents() {
    const events = this.rotationEvents;
    this.rotationEvents = [];
    return events;
  }

  clear() {
    this.movement.clear();
    this.camera.clear();
    for (const [button, value] of this.buttons) {
      try {
        if (button.hasPointerCapture?.(value.id)) button.releasePointerCapture(value.id);
      } catch (_) {}
    }
    this.buttons.clear();
    this.rotationEvents = [];
    this.rotationEvents.push({ direction: 0, phase: "hold" });
    this.resetPending = false;
  }

  pause() {
    this.enabled = false;
    this.clear();
    this.movement.pause();
    this.camera.pause();
  }

  resume() {
    this.enabled = true;
    this.movement.resume();
    this.camera.resume();
  }

  dispose() {
    this.pause();
    this.movement.dispose();
    this.camera.dispose();
    for (const [el, name, fn] of this.buttonBindings) el.removeEventListener(name, fn);
    this.buttonBindings = [];
  }
}
