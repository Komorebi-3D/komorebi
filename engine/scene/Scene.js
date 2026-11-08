import { Entity } from "../entity/Entity.js";

export class Scene {
  constructor(name = "Scene") {
    this.name = name;
    this.entities = new Map();
  }

  createEntity(name) {
    const entity = new Entity(name);
    this.entities.set(entity.id, entity);
    return entity;
  }

  getEntity(id) {
    return this.entities.get(id) ?? null;
  }

  removeEntity(id) {
    const entity = this.entities.get(id);
    if (!entity) return false;
    if (entity.parentId !== null) this.entities.get(entity.parentId)?.children.delete(id);
    for (const childId of entity.children) {
      const child = this.entities.get(childId);
      if (child) child.parentId = null;
    }
    return this.entities.delete(id);
  }

  query(requiredComponents = []) {
    return [...this.entities.values()].filter(entity =>
      entity.active && requiredComponents.every(type => entity.hasComponent(type))
    );
  }

  clear() {
    this.entities.clear();
  }
}
