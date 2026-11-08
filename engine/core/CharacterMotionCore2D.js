/**
 * Reusable ground-plane character motion and rotation core.
 *
 * The v0.1 compatibility profile intentionally uses frame units:
 * update(dtFrames, {x,y}), where dtFrames=1 for one 60Hz reference frame.
 * This preserves existing Komorebi 3D game speed and turn controls.
 *
 * Game-specific collision shapes and ground size are injected by the game;
 * this class knows nothing about DOM, renderer, scenes, houses or hamsters.
 */
export class CharacterMotionCore2D {
  constructor({
    ground, collision,
    initialState = {x:0,z:0,angle:0,spin:0},
    tapRadians = .14,
    spinRadiansPerFrame = .025,
    moveUnitsPerFrame = .095,
    deadzone = .06
  } = {}) {
    if (!ground || typeof ground.constrain !== "function" || typeof ground.getBounds !== "function") {
      throw new TypeError("CharacterMotionCore2D requires a GroundBounds-like ground");
    }
    if (!collision || typeof collision.move !== "function" || typeof collision.collides !== "function") {
      throw new TypeError("CharacterMotionCore2D requires a CollisionWorld2D-like collision");
    }
    if (![initialState.x,initialState.z,initialState.angle,initialState.spin,
          tapRadians,spinRadiansPerFrame,moveUnitsPerFrame,deadzone].every(Number.isFinite)) {
      throw new TypeError("Motion options must be finite");
    }
    this.ground=ground;
    this.collision=collision;
    this.initial=Object.freeze({
      x:initialState.x,z:initialState.z,angle:initialState.angle,spin:initialState.spin
    });
    this.tapRadians=tapRadians;
    this.spinRadiansPerFrame=spinRadiansPerFrame;
    this.moveUnitsPerFrame=moveUnitsPerFrame;
    this.deadzone=deadzone;
    this.reset();
  }

  getState(){return {...this.state};}

  rotate({direction=0,phase="hold"}={}) {
    if (!Number.isFinite(direction)) throw new TypeError("Invalid rotation direction");
    const d=Math.max(-1,Math.min(1,direction));
    if (phase==="down") this.state.angle+=d*this.tapRadians;
    this.state.spin=d;
    return this.getState();
  }

  update(dtFrames, input={}) {
    const dt=Number(dtFrames);
    if (!Number.isFinite(dt)||dt<0) throw new TypeError("Invalid frame delta");
    const x=Number(input?.x ?? 0),y=Number(input?.y ?? 0);
    if (![x,y].every(Number.isFinite))throw new TypeError("Invalid move axes");
    this.state.angle+=this.state.spin*this.spinRadiansPerFrame*dt;
    if (Math.hypot(x,y)>this.deadzone) {
      const c=Math.cos(this.state.angle),s=Math.sin(this.state.angle);
      this.collision.move(
        this.state,
        (x*c+y*s)*this.moveUnitsPerFrame*dt,
        (-x*s+y*c)*this.moveUnitsPerFrame*dt,
        this.ground
      );
    }
    this.ground.constrain(this.state);
    return this.getState();
  }

  reset(){
    this.state={...this.initial};
    return this.getState();
  }

  teleport(x,z) {
    if (![x,z].every(Number.isFinite))throw new TypeError("Invalid teleport coordinates");
    // Game compatibility: only obstacle collision is checked; callers choose safe ground positions.
    if (this.collision.collides(x,z)) return false;
    this.state.x=x;this.state.z=z;
    return true;
  }
}
