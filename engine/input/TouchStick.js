/**
 * DOM-facing virtual joystick; does not depend on Core, Camera or a renderer.
 * x: right positive, y: down positive. Each stick captures only its own pointer.
 */
export class TouchStick {
  constructor({ pad, ring = null, knob = null, radius = 40, deadzone = 0.06, axisDeadzone = false } = {}) {
    if (!pad?.addEventListener) throw new TypeError("TouchStick requires a pad element");
    this.pad = pad;
    this.ring = ring;
    this.knob = knob;
    this.radius = radius;
    this.deadzone = deadzone;
    this.axisDeadzone = axisDeadzone;
    this.pointerId = null;
    this.originX = 0;
    this.originY = 0;
    this.value = { x: 0, y: 0 };
    this.active = true;
    this.listeners = [];
    this.pad.style.touchAction = "none";
    this.bind("pointerdown", this.onDown.bind(this));
    this.bind("pointermove", this.onMove.bind(this));
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      this.bind(name, this.onEnd.bind(this));
    }
  }

  bind(name, fn) {
    this.pad.addEventListener(name, fn);
    this.listeners.push([name, fn]);
  }

  position(el, x, y) {
    if (!el) return;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  show() {
    const rect = this.pad.getBoundingClientRect();
    for (const el of [this.ring, this.knob]) {
      if (!el) continue;
      el.style.display = "block";
      this.position(el, this.originX - rect.left, this.originY - rect.top);
    }
  }

  hide() {
    for (const el of [this.ring, this.knob]) if (el) el.style.display = "none";
  }

  onDown(e) {
    if (!this.active || this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.value = { x: 0, y: 0 };
    this.show();
    try { this.pad.setPointerCapture?.(this.pointerId); } catch (_) {}
  }

  onMove(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    const denominator = Math.max(this.radius, Math.hypot(dx, dy));
    let x = dx / denominator;
    let y = dy / denominator;
    if (this.axisDeadzone) {
      if (Math.abs(x) < this.deadzone) x = 0;
      if (Math.abs(y) < this.deadzone) y = 0;
    } else if (Math.hypot(x, y) < this.deadzone) {
      x = 0; y = 0;
    }
    this.value = { x, y };
    const rect = this.pad.getBoundingClientRect();
    this.position(this.knob, this.originX - rect.left + x * this.radius, this.originY - rect.top + y * this.radius);
  }

  onEnd(e) {
    if (e.pointerId !== this.pointerId) return;
    this.clear();
  }

  poll() {
    return { ...this.value };
  }

  clear() {
    const oldId = this.pointerId;
    this.pointerId = null;
    this.value = { x: 0, y: 0 };
    this.hide();
    if (oldId !== null) {
      try {
        if (this.pad.hasPointerCapture?.(oldId)) this.pad.releasePointerCapture(oldId);
      } catch (_) {}
    }
  }

  pause() { this.active = false; this.clear(); }
  resume() { this.active = true; }

  dispose() {
    this.pause();
    for (const [name, fn] of this.listeners) this.pad.removeEventListener(name, fn);
    this.listeners = [];
  }
}
