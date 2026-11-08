/**
 * Ground-plane collision for circle actors vs rectangle/circle obstacles.
 * No game-specific obstacles are embedded in this reusable engine module.
 * Movement uses small axis-separated steps to support wall sliding and
 * prevent tunneling through narrow walls.
 */
export class CollisionWorld2D {
  constructor({obstacles=[],characterRadius=.35,maxStep=.12}={}) {
    if(!Number.isFinite(characterRadius)||characterRadius<0)
      throw new TypeError("Invalid character radius");
    if(!Number.isFinite(maxStep)||maxStep<=0)
      throw new TypeError("Invalid maxStep");
    this.characterRadius=characterRadius;
    this.maxStep=maxStep;
    this.setObstacles(obstacles);
  }

  getObstacles(){return this.obstacles.map(o=>({...o}));}
  setObstacles(items){
    if(!Array.isArray(items))throw new TypeError("Obstacles must be an array");
    const next=items.map(validateObstacle);
    if(new Set(next.map(o=>o.id)).size!==next.length)
      throw new Error("Duplicate collision obstacle ID");
    this.obstacles=next;
    return this.getObstacles();
  }
  setEnabled(id,enabled){
    const found=this.obstacles.find(o=>o.id===id);
    if(!found)throw new Error("Unknown collision obstacle: "+id);
    found.enabled=Boolean(enabled);
  }
  collides(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))
      throw new TypeError("Collision coordinates must be finite");
    const radius=this.characterRadius;
    for(const obstacle of this.obstacles){
      if(!obstacle.enabled)continue;
      if(obstacle.type==="circle"){
        if(Math.hypot(x-obstacle.centerX,z-obstacle.centerZ)
             <radius+obstacle.radius-1e-9)return true;
      }else{
        const nearestX=Math.max(obstacle.centerX-obstacle.width/2,
          Math.min(obstacle.centerX+obstacle.width/2,x));
        const nearestZ=Math.max(obstacle.centerZ-obstacle.depth/2,
          Math.min(obstacle.centerZ+obstacle.depth/2,z));
        if((x-nearestX)**2+(z-nearestZ)**2<(radius-1e-9)**2 ||
          (radius===0&&x>obstacle.centerX-obstacle.width/2&&
            x<obstacle.centerX+obstacle.width/2&&
            z>obstacle.centerZ-obstacle.depth/2&&
            z<obstacle.centerZ+obstacle.depth/2))return true;
      }
    }
    return false;
  }

  move(state,dx,dz,ground){
    if(!state||![state.x,state.z,dx,dz].every(Number.isFinite))
      throw new TypeError("CollisionWorld2D.move needs finite movement");
    if(!ground||typeof ground.getBounds!=="function")
      throw new TypeError("A GroundBounds-like ground is required");
    const b=ground.getBounds(),radius=this.characterRadius;
    const minX=b.minX+radius,maxX=b.maxX-radius;
    const minZ=b.minZ+radius,maxZ=b.maxZ-radius;
    if(minX>maxX||minZ>maxZ)throw new Error("Ground smaller than actor");
    const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/this.maxStep));
    const stepX=dx/steps,stepZ=dz/steps;
    for(let i=0;i<steps;i++){
      const nx=clamp(state.x+stepX,minX,maxX);
      if(!this.collides(nx,state.z))state.x=nx;
      const nz=clamp(state.z+stepZ,minZ,maxZ);
      if(!this.collides(state.x,nz))state.z=nz;
    }
    return state;
  }
}

function validateObstacle(obstacle){
  if(!obstacle||typeof obstacle.id!=="string"||!obstacle.id||
    !["rect","circle"].includes(obstacle.type)||
    ![obstacle.centerX,obstacle.centerZ].every(Number.isFinite)){
    throw new TypeError("Invalid collision obstacle");
  }
  if(obstacle.type==="rect" &&
    (![obstacle.width,obstacle.depth].every(Number.isFinite) ||
      obstacle.width<=0 || obstacle.depth<=0)){
    throw new TypeError("Invalid collision rectangle");
  }
  if(obstacle.type==="circle" &&
    (!Number.isFinite(obstacle.radius)||obstacle.radius<=0)){
    throw new TypeError("Invalid collision circle");
  }
  return {...obstacle,enabled:obstacle.enabled!==false};
}
