export class ComponentRegistry {
  constructor() {
    this.types = new Map();
  }

  register(name, definition = {}) {
    if (this.types.has(name)) throw new Error(`Component already registered: ${name}`);
    this.types.set(name, Object.freeze({ name, ...definition }));
  }

  has(name) {
    return this.types.has(name);
  }

  get(name) {
    return this.types.get(name) ?? null;
  }

  list() {
    return [...this.types.keys()];
  }
}
