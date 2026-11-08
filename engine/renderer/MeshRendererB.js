/**
 * Renderer B / mesh profile. Three.js-backed, game-independent.
 * Consumes the SAME MeshRenderSnapshot object as MeshRendererA.
 * Loads Three.js only when this backend is initialized.
 */
export class MeshRendererB {
  constructor({ maxPixelRatio = 2 } = {}) {
    this.maxPixelRatio = maxPixelRatio;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.THREE = null;
    this.geometries = new Map();
    this.meshes = new Map();
    this.lastFrameId = -1;
  }

  async initialize({ canvas } = {}) {
    if (!canvas?.getContext) throw new TypeError("Renderer B needs a canvas");
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.canvas = canvas; this.THREE = THREE; this.renderer = renderer;
    renderer.setPixelRatio(Math.max(1,Math.min(this.maxPixelRatio,window.devicePixelRatio||1)));
    renderer.setClearColor(0xc0d6c5);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc0d6c5, .008);
    this.scene.add(new THREE.AmbientLight(0xfff2dc, .84));
    const sun = new THREE.DirectionalLight(0xffe4a7, 1.15);
    sun.position.set(-7,13,5);
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(45,1,.1,150);
    this.resize();
    return this;
  }

  resize(width, height) {
    if(!this.renderer) return;
    const w=Math.max(1,Math.floor(width??this.canvas.clientWidth));
    const h=Math.max(1,Math.floor(height??this.canvas.clientHeight));
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;
    this.camera.updateProjectionMatrix();
    return w/h;
  }

  geometryFor(descriptor) {
    if(this.geometries.has(descriptor))return this.geometries.get(descriptor);
    const THREE=this.THREE;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(descriptor.positions,3));
    geometry.setAttribute("normal",new THREE.Float32BufferAttribute(descriptor.normals,3));
    geometry.setAttribute("color",new THREE.Float32BufferAttribute(descriptor.colors,3));
    geometry.computeBoundingSphere();
    this.geometries.set(descriptor,geometry);
    return geometry;
  }

  makeMesh(item) {
    const material=new this.THREE.MeshLambertMaterial({
      vertexColors:true,side:this.THREE.DoubleSide,transparent:false,
      depthWrite:true
    });
    const mesh=new this.THREE.Mesh(this.geometryFor(item.geometry),material);
    mesh.frustumCulled=false; // Mesh bounds can be offset after a dynamic pose update.
    this.scene.add(mesh);
    return mesh;
  }

  render(snapshot) {
    if(!this.renderer)throw new Error("Renderer B not initialized");
    if(!Number.isSafeInteger(snapshot?.frameId) ||
       !Array.isArray(snapshot?.camera?.eye) ||
       !Array.isArray(snapshot?.camera?.target) ||
       !Array.isArray(snapshot?.objects))throw new TypeError("Renderer B expects MeshRenderSnapshot");
    const {eye,target,near,far,fovDegrees}=snapshot.camera;
    this.resize();
    this.camera.position.set(...eye);
    this.camera.lookAt(...target);
    this.camera.near=near;this.camera.far=far;this.camera.fov=fovDegrees;
    this.camera.updateProjectionMatrix();
    const active=new Set();
    for(const item of snapshot.objects){
      if(item.shape!=="mesh")throw new TypeError("Renderer B supports mesh profile only");
      active.add(item.id);
      let mesh=this.meshes.get(item.id);
      if(mesh && mesh.userData.geometryDescriptor!==item.geometry) {
        this.scene.remove(mesh);mesh.material.dispose();this.meshes.delete(item.id);mesh=null;
      }
      if(!mesh){
        mesh=this.makeMesh(item);
        mesh.userData.geometryDescriptor=item.geometry;
        this.meshes.set(item.id,mesh);
      }
      mesh.position.set(...item.position);
      mesh.rotation.set(0,item.yaw||0,0);
      const alpha=item.opacity;
      mesh.visible=item.visible && alpha>.005;
      mesh.material.transparent=alpha<.999;
      mesh.material.opacity=alpha;
      mesh.material.depthWrite=alpha>=.999;
      mesh.material.needsUpdate=mesh.userData.lastTransparent!==mesh.material.transparent;
      mesh.userData.lastTransparent=mesh.material.transparent;
    }
    for(const [id,mesh] of this.meshes)if(!active.has(id)){
      this.scene.remove(mesh);mesh.material.dispose();this.meshes.delete(id);
    }
    this.renderer.render(this.scene,this.camera);
    this.lastFrameId=snapshot.frameId;
  }

  dispose() {
    for(const mesh of this.meshes.values()){
      this.scene?.remove(mesh);mesh.material.dispose();
    }
    this.meshes.clear();
    for(const geometry of this.geometries.values())geometry.dispose();
    this.geometries.clear();
    this.renderer?.dispose();
    this.scene=null;this.renderer=null;this.camera=null;
    this.canvas=null;this.THREE=null;this.lastFrameId=-1;
  }
}
