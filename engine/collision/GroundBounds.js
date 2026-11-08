/**
 * Generic finite rectangular X/Z ground in world units.
 * Owns no rendering, DOM, collision shapes or game-specific objects.
 */
export class GroundBounds {
  constructor(config={centerX:0,centerZ:0,width:20,depth:20}) {
    this.setGround(config);
  }

  setGround(config) {
    if(!config||![config.centerX,config.centerZ,config.width,config.depth].every(Number.isFinite)
       ||config.width<=0||config.depth<=0)throw new TypeError("Invalid ground");
    this.ground={
      centerX:config.centerX,centerZ:config.centerZ,
      width:config.width,depth:config.depth
    };
    return this.getGround();
  }

  getGround(){return {...this.ground};}
  getBounds(){
    const g=this.ground;
    return {
      minX:g.centerX-g.width/2,maxX:g.centerX+g.width/2,
      minZ:g.centerZ-g.depth/2,maxZ:g.centerZ+g.depth/2
    };
  }

  constrain(state){
    if(!state||!Number.isFinite(state.x)||!Number.isFinite(state.z))
      throw new TypeError("GroundBounds.constrain requires finite x/z");
    const b=this.getBounds();
    state.x=Math.max(b.minX,Math.min(b.maxX,state.x));
    state.z=Math.max(b.minZ,Math.min(b.maxZ,state.z));
    return state;
  }

  atEdge(state,epsilon=.005){
    const b=this.getBounds();
    return state.x<=b.minX+epsilon||state.x>=b.maxX-epsilon||
      state.z<=b.minZ+epsilon||state.z>=b.maxZ-epsilon;
  }
}
