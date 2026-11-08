/**
 * Renderer A: renderer-neutral box snapshot -> raw WebGL1.
 *
 * API: initialize({canvas}), render(snapshot), resize(width?,height?), dispose().
 * No imports from Input, Camera, Core, Three.js, or a game project.
 * Snapshot object: { frameId, camera:{eye,target,fovDegrees?,near?,far?}, objects:[...]}.
 */
export class RendererA {
  constructor({ maxPixelRatio = 2 } = {}) {
    this.maxPixelRatio = maxPixelRatio;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.meshCache = new Map();
    this.lastFrameId = -1;
  }

  initialize({ canvas } = {}) {
    if (!canvas?.getContext) throw new TypeError("Renderer A requires a canvas");
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, depth: true });
    if (!gl) throw new Error("Renderer A: WebGLに対応していません");
    this.gl = gl;
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uViewProjection;
      uniform vec3 uOffset;
      uniform float uYaw;
      varying vec3 vColor;
      void main() {
        float c = cos(uYaw), s = sin(uYaw);
        vec3 position = vec3(c*aPosition.x + s*aPosition.z,
                             aPosition.y,
                            -s*aPosition.x + c*aPosition.z) + uOffset;
        gl_Position = uViewProjection * vec4(position,1.0);
        vColor = aColor;
      }`;
    const fragmentSource = `
      precision mediump float;
      varying vec3 vColor;
      void main() { gl_FragColor = vec4(vColor,1.0); }`;
    const vert = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const frag = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vert); gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert); gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error("Renderer A shader link: " + error);
    }
    this.program = program;
    this.locations = {
      position: gl.getAttribLocation(program, "aPosition"),
      color: gl.getAttribLocation(program, "aColor"),
      matrix: gl.getUniformLocation(program, "uViewProjection"),
      offset: gl.getUniformLocation(program, "uOffset"),
      yaw: gl.getUniformLocation(program, "uYaw")
    };
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(.75, .87, .94, 1);
    this.resize();
    return this;
  }

  resize(width, height) {
    if (!this.gl) return;
    const pixelRatio = Math.max(1, Math.min(this.maxPixelRatio, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round((width ?? this.canvas.clientWidth) * pixelRatio));
    const h = Math.max(1, Math.round((height ?? this.canvas.clientHeight) * pixelRatio));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    return w / h;
  }

  getMesh(object) {
    const [w,h,d] = object.size;
    const key = [w,h,d,object.color].join(":");
    if (this.meshCache.has(key)) return this.meshCache.get(key);
    const gl = this.gl;
    const color = [
      ((object.color >> 16) & 255) / 255,
      ((object.color >> 8) & 255) / 255,
      (object.color & 255) / 255
    ];
    const data = [];
    addBox(data, w, h, d, color);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Renderer A: GPUバッファ確保失敗");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const mesh = { buffer, count: data.length / 6 };
    this.meshCache.set(key, mesh);
    return mesh;
  }

  render(snapshot) {
    const gl = this.gl;
    if (!gl) throw new Error("Renderer A not initialized");
    validateSnapshot(snapshot);
    const aspect = this.resize();
    const camera = snapshot.camera;
    const view = lookAt(camera.eye, camera.target);
    const fov = (camera.fovDegrees ?? 60) * Math.PI / 180;
    const projection = perspective(fov, aspect, camera.near ?? 0.1, camera.far ?? 100);
    const matrix = multiply(projection, view);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    const uniforms = this.locations;
    gl.uniformMatrix4fv(uniforms.matrix, false, matrix);
    gl.enableVertexAttribArray(uniforms.position);
    gl.enableVertexAttribArray(uniforms.color);
    for (const object of snapshot.objects) {
      if (object.visible === false) continue;
      if (object.shape !== "box") throw new Error("Renderer A unsupported shape: "+object.shape);
      const mesh = this.getMesh(object);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(uniforms.position,3,gl.FLOAT,false,24,0);
      gl.vertexAttribPointer(uniforms.color,3,gl.FLOAT,false,24,12);
      gl.uniform3fv(uniforms.offset, object.position);
      gl.uniform1f(uniforms.yaw, object.yaw ?? 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
    this.lastFrameId = snapshot.frameId;
  }

  dispose() {
    if (!this.gl) return;
    for (const mesh of this.meshCache.values()) this.gl.deleteBuffer(mesh.buffer);
    this.meshCache.clear();
    if (this.program) this.gl.deleteProgram(this.program);
    this.program = null;
    this.gl = null;
    this.canvas = null;
    this.lastFrameId = -1;
  }
}

function validateSnapshot(snapshot) {
  if (!Number.isInteger(snapshot?.frameId) || !Array.isArray(snapshot?.objects) ||
      !Array.isArray(snapshot?.camera?.eye) || !Array.isArray(snapshot?.camera?.target)) {
    throw new TypeError("Renderer A requires a valid RenderSnapshot");
  }
}
function vertex(out, point, color) { out.push(...point, ...color); }
function quad(out,a,b,c,d,color) {
  for (const point of [a,b,c,a,c,d]) vertex(out,point,color);
}
function addBox(out,w,h,d,color) {
  const l=-w/2,r=w/2,n=-d/2,f=d/2;
  const tint = v => color.map(n => Math.min(1, n*v));
  quad(out,[l,0,n],[r,0,n],[r,h,n],[l,h,n],tint(.75));
  quad(out,[r,0,f],[l,0,f],[l,h,f],[r,h,f],tint(.92));
  quad(out,[l,0,f],[l,0,n],[l,h,n],[l,h,f],tint(.82));
  quad(out,[r,0,n],[r,0,f],[r,h,f],[r,h,n],tint(.68));
  quad(out,[l,h,n],[r,h,n],[r,h,f],[l,h,f],tint(1.1));
  quad(out,[l,0,f],[r,0,f],[r,0,n],[l,0,n],tint(.62));
}
function compile(gl,type,source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Renderer A shader compile: "+error);
  }
  return shader;
}
function perspective(fovy,aspect,near,far) {
  const f=1/Math.tan(fovy/2);
  return new Float32Array([
    f/aspect,0,0,0,
    0,f,0,0,
    0,0,(far+near)/(near-far),-1,
    0,0,2*far*near/(near-far),0
  ]);
}
function lookAt(eye,target) {
  const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const z=norm(eye.map((v,i)=>v-target[i]));
  const x=norm(cross([0,1,0],z)), y=cross(z,x);
  return new Float32Array([
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -x.reduce((sum,v,i)=>sum+v*eye[i],0),
    -y.reduce((sum,v,i)=>sum+v*eye[i],0),
    -z.reduce((sum,v,i)=>sum+v*eye[i],0),1
  ]);
}
function multiply(a,b) {
  const out=new Float32Array(16);
  for(let col=0;col<4;col++) for(let row=0;row<4;row++)
    for(let k=0;k<4;k++) out[col*4+row]+=a[k*4+row]*b[col*4+k];
  return out;
}
