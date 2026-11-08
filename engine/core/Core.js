export class Core {
  constructor({ initialState = {} } = {}) {
    this.state = {
      frameId: 0,
      elapsedTime: 0,
      player: { x: 0, y: 0, z: 0, angle: 0 },
      camera: { yaw: 0, pitch: 35 * Math.PI / 180, distance: 19 },
      ...initialState
    };
  }

  update(deltaTime, commands = {}) {
    const dt = Math.max(0, Math.min(Number(deltaTime) || 0, 0.1));
    this.state.frameId += 1;
    this.state.elapsedTime += dt;
    // Initial foundation: command semantics will be migrated from the PASS-tested game implementation.
    this.state.lastCommands = { ...commands };
  }

  getSnapshot() {
    return deepFreeze(clone(this.state));
  }

  reset(initialState = {}) {
    this.state = {
      frameId: 0,
      elapsedTime: 0,
      player: { x: 0, y: 0, z: 0, angle: 0 },
      camera: { yaw: 0, pitch: 35 * Math.PI / 180, distance: 19 },
      ...initialState
    };
  }
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
