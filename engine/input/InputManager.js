export class InputManager {
  constructor(adapter = null) {
    this.adapter = adapter;
    this.enabled = true;
    this.lastInput = zeroInput();
  }

  poll() {
    if (!this.enabled || !this.adapter) return { ...this.lastInput = zeroInput() };
    const raw = this.adapter.poll?.() ?? {};
    this.lastInput = {
      moveX: axis(raw.moveX),
      moveY: axis(raw.moveY),
      cameraX: axis(raw.cameraX),
      cameraY: axis(raw.cameraY),
      reset: Boolean(raw.reset)
    };
    return { ...this.lastInput };
  }

  takeRotationEvents() {
    return this.adapter?.takeRotationEvents?.() ?? [];
  }

  clear() {
    this.adapter?.clear?.();
    this.lastInput = zeroInput();
  }

  pause() {
    this.enabled = false;
    this.adapter?.pause?.();
    this.lastInput = zeroInput();
  }

  resume() {
    this.adapter?.resume?.();
    this.enabled = true;
  }

  dispose() {
    this.clear();
    this.adapter?.dispose?.();
    this.adapter = null;
  }
}

function axis(value) {
  const n = Number(value) || 0;
  return Math.max(-1, Math.min(1, n));
}

function zeroInput() {
  return { moveX: 0, moveY: 0, cameraX: 0, cameraY: 0, reset: false };
}
