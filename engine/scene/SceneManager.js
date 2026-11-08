export class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeSceneName = null;
  }

  add(scene) {
    if (this.scenes.has(scene.name)) throw new Error(`Scene already exists: ${scene.name}`);
    this.scenes.set(scene.name, scene);
    if (this.activeSceneName === null) this.activeSceneName = scene.name;
    return scene;
  }

  setActive(name) {
    if (!this.scenes.has(name)) throw new Error(`Unknown scene: ${name}`);
    this.activeSceneName = name;
  }

  get activeScene() {
    return this.scenes.get(this.activeSceneName) ?? null;
  }

  remove(name) {
    const removed = this.scenes.delete(name);
    if (this.activeSceneName === name) this.activeSceneName = this.scenes.keys().next().value ?? null;
    return removed;
  }
}
