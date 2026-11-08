/**
 * Renderer A / mesh profile. Independent raw WebGL1 backend.
 * Input, Camera, Core and game-specific entities are NOT imported here.
 * Uses the shared MeshRenderSnapshot contract also consumed by Renderer B.
 */
export class MeshRendererA {
  constructor({ maxPixelRatio = 2 } = {}) {
    this.maxPixelRatio = maxPixelRatio;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.buffers = new Map();
    this.lastFrameId = -1;
  }

  initialize({ canvas } = {}) {
    if (!canvas?.getContext) throw new TypeError("Renderer A needs a canvas");
    const gl=canvas.getContext("webgl",{antialias:true,alpha:false,depth:true});
    if (!gl) throw new Error("Renderer A: WebGL unavailable");
    this.canvas=canvas; this.gl=gl;
    const vs=`
      attribute vec3 aPosition, aNormal, aColor;
      uniform mat4 uViewProjection;
      uniform vec3 uOffset;
      uniform float uYaw;
      varying vec3 vColor;
      varying float vHaze;
      void main() {
        float co=cos(uYaw), si=sin(uYaw);
        vec3 world=vec3(co*aPosition.x+si*aPosition.z,aPosition.y,
                        -si*aPosition.x+co*aPosition.z)+uOffset;
        vec3 norm=normalize(vec3(co*aNormal.x+si*aNormal.z,aNormal.y,
                               -si*aNormal.x+co*aNormal.z));
        gl_Position=uViewProjection*vec4(world,1.);
        float light=max(dot(norm,normalize(vec3(-.45,1.,.65))),0.);
        vColor=aColor*(.77+.23*light)*vec3(1.04,1.015,.94);
        vHaze=clamp((length(world.xz)-8.)/38.,0.,.24);
      }`;
    const fs=`
      precision mediump float;
      varying vec3 vColor;
      varying float vHaze;
      uniform float uOpacity;
      void main() {
        gl_FragColor=vec4(mix(vColor,vec3(.76,.84,.73),vHaze),uOpacity);
      }`;
    this.program=makeProgram(gl,vs,fs);
    const p=this.program;
    this.location={
      position:gl.getAttribLocation(p,"aPosition"),
      normal:gl.getAttribLocation(p,"aNormal"),
      color:gl.getAttribLocation(p,"aColor"),
      matrix:gl.getUniformLocation(p,"uViewProjection"),
      offset:gl.getUniformLocation(p,"uOffset"),
      yaw:gl.getUniformLocation(p,"uYaw"),
      opacity:gl.getUniformLocation(p,"uOpacity")
    };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(.75,.84,.77,1);
    this.resize();
    return this;
  }

  resize(width,height) {
    if(!this.gl)return;
    const dpr=Math.max(1,Math.min(this.maxPixelRatio,window.devicePixelRatio||1));
    const w=Math.max(1,Math.round((width??this.canvas.clientWidth)*dpr));
    const h=Math.max(1,Math.round((height??this.canvas.clientHeight)*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w;this.canvas.height=h;
    }
    this.gl.viewport(0,0,w,h);
    return w/h;
  }

  prepare(geometry) {
    if(this.buffers.has(geometry))return this.buffers.get(geometry);
    const gl=this.gl,buffers={};
    for(const [key,values] of [
      ["position",geometry.positions],["normal",geometry.normals],["color",geometry.colors]
    ]){
      const buffer=gl.createBuffer();
      if(!buffer)throw new Error("Renderer A: buffer allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
      buffers[key]=buffer;
    }
    const entry={buffers,count:geometry.vertexCount};
    this.buffers.set(geometry,entry);
    return entry;
  }

  draw(object) {
    const gl=this.gl,l=this.location,entry=this.prepare(object.geometry);
    gl.uniform3fv(l.offset,object.position);
    gl.uniform1f(l.yaw,object.yaw||0);
    gl.uniform1f(l.opacity,object.opacity);
    for(const key of ["position","normal","color"]){
      const attrib=l[key];
      gl.bindBuffer(gl.ARRAY_BUFFER,entry.buffers[key]);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib,3,gl.FLOAT,false,0,0);
    }
    gl.drawArrays(gl.TRIANGLES,0,entry.count);
  }

  render(snapshot) {
    if(!this.gl)throw new Error("Renderer A not initialized");
    if(!Number.isSafeInteger(snapshot?.frameId)||!Array.isArray(snapshot?.objects)||
       !Array.isArray(snapshot?.camera?.eye)||!Array.isArray(snapshot?.camera?.target)){
      throw new TypeError("Renderer A expects a MeshRenderSnapshot");
    }
    const gl=this.gl,aspect=this.resize(),cam=snapshot.camera;
    const matrix=multiply(
      perspective(cam.fovDegrees*Math.PI/180,aspect,cam.near,cam.far),
      look(cam.eye,cam.target)
    );
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.location.matrix,false,matrix);
    // Transparent surfaces are blended after opaque objects and do not write depth.
    gl.depthMask(true);
    for(const obj of snapshot.objects) {
      if(obj.shape!=="mesh")throw new TypeError("Renderer A supports mesh profile only");
      if(obj.visible && obj.opacity>=.999)this.draw(obj);
    }
    const alpha=snapshot.objects.filter(o=>o.visible&&o.opacity>.005&&o.opacity<.999);
    alpha.sort((a,b)=>distanceSquared(cam.eye,b.position)-distanceSquared(cam.eye,a.position));
    gl.depthMask(false);
    for(const obj of alpha)this.draw(obj);
    gl.depthMask(true);
    this.lastFrameId=snapshot.frameId;
  }

  dispose() {
    if(!this.gl)return;
    for(const item of this.buffers.values()){
      for(const buffer of Object.values(item.buffers))this.gl.deleteBuffer(buffer);
    }
    this.buffers.clear();
    if(this.program)this.gl.deleteProgram(this.program);
    this.canvas=null;this.gl=null;this.program=null;
    this.lastFrameId=-1;
  }
}
function distanceSquared(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2}
function compile(gl,type,text){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,text);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const error=gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Renderer A shader: "+error);
  }
  return shader;
}
function makeProgram(gl,vs,fs){
  const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,vs),f=compile(gl,gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
    const err=gl.getProgramInfoLog(p);gl.deleteProgram(p);
    throw new Error("Renderer A link: "+err);
  }
  return p;
}
function perspective(fov,aspect,near,far){
  const f=1/Math.tan(fov/2);
  return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
}
function look(eye,target){
  const normalize=a=>{const m=Math.hypot(...a)||1;return a.map(x=>x/m)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const z=normalize(eye.map((v,i)=>v-target[i]));
  const x=normalize(cross([0,1,0],z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
    -x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);
}
function multiply(a,b){
  const o=new Float32Array(16);
  for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];
  return o;
}
