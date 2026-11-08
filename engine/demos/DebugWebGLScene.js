/**
 * Small standalone WebGL1 debugging scene.
 * Demo-only renderer, NOT the future Renderer A production backend.
 * Everything below this boundary is renderer-specific; camera and input are not.
 */
export class DebugWebGLScene {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: true });
    if (!gl) throw new Error("WebGLを利用できません");
    this.gl = gl;
    const vs = `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uViewProjection;
      uniform vec3 uOffset;
      uniform float uYaw;
      varying vec3 vColor;
      void main() {
        float c = cos(uYaw), s = sin(uYaw);
        vec3 p = vec3(c*aPosition.x + s*aPosition.z,
                      aPosition.y,
                      -s*aPosition.x + c*aPosition.z) + uOffset;
        gl_Position = uViewProjection * vec4(p, 1.0);
        vColor = aColor;
      }`;
    const fs = `
      precision mediump float;
      varying vec3 vColor;
      void main() { gl_FragColor = vec4(vColor, 1.0); }`;
    this.program = createProgram(gl, vs, fs);
    gl.useProgram(this.program);
    this.locations = {
      pos: gl.getAttribLocation(this.program, "aPosition"),
      color: gl.getAttribLocation(this.program, "aColor"),
      matrix: gl.getUniformLocation(this.program, "uViewProjection"),
      offset: gl.getUniformLocation(this.program, "uOffset"),
      yaw: gl.getUniformLocation(this.program, "uYaw")
    };
    const ground = [];
    for (let z = -12; z < 12; z += 2) {
      for (let x = -12; x < 12; x += 2) {
        const color = ((x + z) / 2) % 2 === 0
          ? [0.60, 0.76, 0.61] : [0.54, 0.70, 0.57];
        addQuad(ground, [x,-.06,z], [x,-.06,z+2], [x+2,-.06,z+2], [x+2,-.06,z], color);
      }
    }
    addBox(ground, -4, 0, -5, 1.6, 2.3, 1.6, [0.89,0.65,0.42]);
    addBox(ground, 4, 0, -5, 1.6, 1.2, 1.6, [0.55,0.69,0.91]);
    addBox(ground, -4, 0, 5, 1.6, 3.0, 1.6, [0.75,0.60,0.82]);
    addBox(ground, 4, 0, 5, 1.6, 1.9, 1.6, [0.91,0.75,0.46]);
    this.world = upload(gl, ground);
    const player = [];
    addBox(player, 0, 0, 0, .85, 1.55, .85, [.94,.68,.46]);
    addBox(player, 0, 1.55, 0, .74, .35, .74, [.98,.84,.63]);
    addBox(player, 0, 1.16, -.47, .26, .24, .13, [.34,.27,.21]);
    this.player = upload(gl, player);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(.75, .87, .94, 1);
  }

  resize() {
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0,0,width,height);
    return width / height;
  }

  render({ pose, player, playerYaw = 0 }) {
    const gl = this.gl;
    const aspect = this.resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    const view = lookAt(pose.eye, pose.target);
    const projection = perspective(Math.PI / 3, aspect, 0.1, 100);
    const viewProjection = multiply(projection, view);
    gl.uniformMatrix4fv(this.locations.matrix, false, viewProjection);
    gl.enableVertexAttribArray(this.locations.pos);
    gl.enableVertexAttribArray(this.locations.color);
    this.draw(this.world, [0,0,0], 0);
    this.draw(this.player, [player.x, player.y || 0, player.z], playerYaw);
  }

  draw(mesh, offset, yaw) {
    const gl = this.gl, a = this.locations;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(a.color, 3, gl.FLOAT, false, 24, 12);
    gl.uniform3fv(a.offset, offset);
    gl.uniform1f(a.yaw, yaw);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteBuffer(this.world.buffer);
    gl.deleteBuffer(this.player.buffer);
    gl.deleteProgram(this.program);
  }
}

function upload(gl, data) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("WebGLバッファを確保できません");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return { buffer, count: data.length / 6 };
}

function vertex(out, p, color) { out.push(...p, ...color); }
function addQuad(out, a, b, c, d, color) {
  for (const point of [a,b,c,a,c,d]) vertex(out, point, color);
}
function addBox(out, x, y, z, w, h, d, color) {
  const l=x-w/2,r=x+w/2,t=y+h,n=z-d/2,f=z+d/2;
  const tint = factor => color.map(v=>Math.min(1,v*factor));
  addQuad(out,[l,y,n],[r,y,n],[r,t,n],[l,t,n],tint(.75));
  addQuad(out,[r,y,f],[l,y,f],[l,t,f],[r,t,f],tint(.92));
  addQuad(out,[l,y,f],[l,y,n],[l,t,n],[l,t,f],tint(.82));
  addQuad(out,[r,y,n],[r,y,f],[r,t,f],[r,t,n],tint(.68));
  addQuad(out,[l,t,n],[r,t,n],[r,t,f],[l,t,f],tint(1.10));
  addQuad(out,[l,y,f],[r,y,f],[r,y,n],[l,y,n],tint(.62));
}
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compilation: " + error);
  }
  return shader;
}
function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  const v=compile(gl,gl.VERTEX_SHADER,vs),f=compile(gl,gl.FRAGMENT_SHADER,fs);
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  gl.deleteShader(v);gl.deleteShader(f);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
    const error=gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Shader linking: "+error);
  }
  return program;
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
  const normalize=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const z=normalize(eye.map((v,i)=>v-target[i]));
  const x=normalize(cross([0,1,0],z));
  const y=cross(z,x);
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
  for(let col=0;col<4;col++){
    for(let row=0;row<4;row++){
      for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];
    }
  }
  return out;
}
