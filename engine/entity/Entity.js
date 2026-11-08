let nextEntityId = 1;

export class Entity {
  constructor(name = "Entity") {
    this.id = nextEntityId++;
    this.name = name;
    this.active = true;
    this.components = new Map();
    this.parentId = null;
    this.children = new Set();
  }

  addComponent(type, data = {}) {
    if (!type || typeof type !== "string") throw new TypeError("Component type must be a string");
    this.components.set(type, structuredCloneSafe(data));
    return this;
  }

  getComponent(type) {
    return this.components.get(type) ?? null;
  }

  hasComponent(type) {
    return this.components.has(type);
  }

  removeComponent(type) {
    return this.components.delete(type);
  }

  setActive(active) {
    this.active = Boolean(active);
    return this;
  }
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
