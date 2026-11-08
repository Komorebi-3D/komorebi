import { ENGINE_VERSION, INTERFACE_VERSION } from "./shared/EngineVersion.js";
import { Core } from "./core/Core.js";
import { InputManager } from "./input/InputManager.js";
import { SceneManager } from "./scene/SceneManager.js";
import { assertRenderer } from "./renderer/RendererContract.js";

export class Engine {
  constructor({ inputAdapter = null, coreOptions = {}, renderers = [] } = {}) {
    this.version = ENGINE_VERSION;
    this.interfaceVersion = INTERFACE_VERSION;
    this.core = new Core(coreOptions);
    this.input = new InputManager(inputAdapter);
    this.scenes = new SceneManager();
    this.renderers = renderers.map(assertRenderer);
    this.running = false;
  }

  async initialize() {
    for (const renderer of this.renderers) await renderer.initialize();
    this.running = true;
  }

  update(deltaTime) {
    if (!this.running) return null;
    const commands = this.input.poll();
    this.core.update(deltaTime, commands);
    const snapshot = this.core.getSnapshot();
    for (const renderer of this.renderers) renderer.render(snapshot);
    return snapshot;
  }

  reset() {
    this.input.clear();
    this.core.reset();
  }

  async dispose() {
    this.running = false;
    this.input.dispose();
    for (const renderer of this.renderers) await renderer.dispose();
    this.renderers = [];
  }
}
