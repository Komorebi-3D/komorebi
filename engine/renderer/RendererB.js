/**
 * Renderer B: same RenderSnapshot contract as Renderer A, backed by Three.js.
 * Depends on Three.js ONLY inside this module; Core/Input/Camera stay backend-free.
 * Three.js version pinned for reproducibility.
 */
export class RendererB {
  constructor({ maxPixelRatio = 2 } = {}) {
    this.maxPixelRatio = maxPixelRatio;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.THREE = null;
    this.meshes = new Map();
    this.geometries = new Map();
    this.materialSets = new Map();
    this.lastFrameId = -1;
  }

  async initialize({ canvas } = {}) {
    if (!canvas?.getContext) throw new TypeError("Renderer B requires a canvas");
    this.canvas = canvas;
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js");
    this.THREE = THREE;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(this.maxPixelRatio, Math.max(1, window.devicePixelRatio || 1)));
    this.renderer.setClearColor(0xbfdef0, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
    this.resize();
    return this;
  }

  resize(width, height) {
    if (!this.renderer) return;
    const w = Math.max(1, Math.floor(width ?? this.canvas.clientWidth));
    const h = Math.max(1, Math.floor(height ?? this.canvas.clientHeight));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    return w / h;
  }

  getMesh(object) {
    const THREE = this.THREE;
    if (object.shape !== "box") throw new Error("Renderer B unsupported shape: "+object.shape);
    const [w,h,d] = object.size;
    const key = [w,h,d].join(":");
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(w,h,d);
      geometry.translate(0,h/2,0);
      this.geometries.set(key, geometry);
    }
    let materials = this.materialSets.get(object.color);
    if (!materials) {
      const channels = [
        (object.color >> 16) & 255,
        (object.color >> 8) & 255,
        object.color & 255
      ];
      // Three.js BoxGeometry face order: +X,-X,+Y,-Y,+Z,-Z.
      const factors = [.68,.82,1.1,.62,.92,.75];
      materials = factors.map(factor => {
        const [r,g,b] = channels.map(c => Math.min(255,Math.round(c*factor)));
        return new THREE.MeshBasicMaterial({ color: (r<<16) | (g<<8) | b });
      });
      this.materialSets.set(object.color, materials);
    }
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.matrixAutoUpdate = true;
    return mesh;
  }

  render(snapshot) {
    if (!this.renderer) throw new Error("Renderer B not initialized");
    if (!Number.isInteger(snapshot?.frameId) ||
        !Array.isArray(snapshot?.camera?.eye) ||
        !Array.isArray(snapshot?.camera?.target) ||
        !Array.isArray(snapshot?.objects)) {
      throw new TypeError("Renderer B requires a valid RenderSnapshot");
    }
    const { eye, target } = snapshot.camera;
    const [ex,ey,ez] = eye, [tx,ty,tz] = target;
    this.resize();
    this.camera.position.set(ex,ey,ez);
    this.camera.lookAt(tx,ty,tz);
    this.camera.fov = snapshot.camera.fovDegrees ?? 60;
    this.camera.near = snapshot.camera.near ?? 0.1;
    this.camera.far = snapshot.camera.far ?? 100;
    this.camera.updateProjectionMatrix();
    const used = new Set();
    for (const object of snapshot.objects) {
      if (object.visible === false) continue;
      used.add(object.id);
      let mesh = this.meshes.get(object.id);
      if (!mesh) {
        mesh = this.getMesh(object);
        this.meshes.set(object.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(...object.position);
      mesh.rotation.set(0,object.yaw ?? 0,0);
      mesh.visible = true;
    }
    for (const [id,mesh] of this.meshes) {
      if (!used.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.lastFrameId = snapshot.frameId;
  }

  dispose() {
    for (const mesh of this.meshes.values()) this.scene?.remove(mesh);
    this.meshes.clear();
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.geometries.clear();
    for (const materials of this.materialSets.values())
      for (const material of materials) material.dispose();
    this.materialSets.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.THREE = null;
    this.lastFrameId = -1;
  }
}
