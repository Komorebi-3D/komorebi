import test from "node:test";
import assert from "node:assert/strict";
import { GroundBounds } from "../collision/GroundBounds.js";
import { CollisionWorld2D } from "../collision/CollisionWorld2D.js";
import { CharacterMotionCore2D } from "../core/CharacterMotionCore2D.js";

const obstacles = [
  {id:"house-back",type:"rect",centerX:4.5,centerZ:-9.45,width:14,depth:.24,enabled:true},
  {id:"house-left",type:"rect",centerX:-2.45,centerZ:-4.5,width:.24,depth:10,enabled:true},
  {id:"house-right",type:"rect",centerX:11.45,centerZ:-4.5,width:.24,depth:10,enabled:true},
  {id:"house-front-left",type:"rect",centerX:.55,centerZ:.45,width:6.1,depth:.24,enabled:true},
  {id:"house-front-right",type:"rect",centerX:8.45,centerZ:.45,width:6.1,depth:.24,enabled:true},
  {id:"tree",type:"circle",centerX:-7,centerZ:-5,radius:.65,enabled:true}
];
const create = () => {
  const ground=new GroundBounds({centerX:0,centerZ:0,width:100,depth:100});
  const collision=new CollisionWorld2D({obstacles,characterRadius:.35,maxStep:.12});
  const core=new CharacterMotionCore2D({
    ground,collision,initialState:{x:0,z:4.5,angle:.55,spin:0}
  });
  return {ground,collision,core};
};
function near(a,b,epsilon=1e-10){
  assert.ok(Math.abs(a-b)<epsilon,`Expected ${a} ~= ${b}`);
}

test("public ground bounds are mutable only through setGround",()=>{
  const ground=new GroundBounds({centerX:0,centerZ:0,width:100,depth:100});
  const old=ground.getGround();old.width=1;
  assert.equal(ground.getGround().width,100);
  assert.deepEqual(ground.getBounds(),{minX:-50,maxX:50,minZ:-50,maxZ:50});
  const p={x:100,z:-100};ground.constrain(p);
  assert.equal(p.x,50);assert.equal(p.z,-50);
  assert.equal(ground.atEdge(p),true);
});

test("legacy core rotation tap+hold+release semantics match prior product",()=>{
  const {core}=create();
  near(core.getState().angle,.55);
  core.rotate({direction:-1,phase:"down"});
  near(core.getState().angle,.55-.14);
  core.update(1,{x:0,y:0});
  near(core.getState().angle,.55-.14-.025);
  core.rotate({direction:0,phase:"hold"});
  const angle=core.getState().angle;
  core.update(1,{x:0,y:0});near(core.getState().angle,angle);
  core.reset();near(core.getState().angle,.55);near(core.getState().spin,0);
});

test("legacy movement exact world-axis formula and dt frame-unit behavior",()=>{
  const {core}=create();
  const start=core.getState(),dt=1.25,input={x:.4,y:-.6};
  const dx=(input.x*Math.cos(start.angle)+input.y*Math.sin(start.angle))*.095*dt;
  const dz=(-input.x*Math.sin(start.angle)+input.y*Math.cos(start.angle))*.095*dt;
  const next=core.update(dt,input);
  near(next.x,start.x+dx);
  near(next.z,start.z+dz);
});

test("house walls block character, open doorway permits entry",()=>{
  const {collision,core}=create();
  assert.equal(collision.collides(-2.45,-4.5),true);
  assert.equal(collision.collides(4.5, .45),false); // door center is unobstructed
  assert.equal(core.teleport(-2.45,-4.5),false);
  assert.equal(core.teleport(0,-.5),true);
});

test("circle-tree prevents entry, sliding and 100m border work",()=>{
  const {collision,ground,core}=create();
  assert.equal(collision.collides(-7,-5),true);
  assert.equal(collision.collides(-8.4,-5),false);
  core.teleport(49.2,6);
  const state=core.getState();
  collision.move(state,100,0,ground);
  near(state.x,49.65);
  const border=core.update(1,{x:1,y:0});
  assert.ok(border.x<=49.65);
});

test("collision configuration is independently reusable and validates obstacles",()=>{
  const {collision}=create();
  const list=collision.getObstacles();list[0].enabled=false;
  assert.equal(collision.getObstacles()[0].enabled,true);
  collision.setEnabled("tree",false);
  assert.equal(collision.collides(-7,-5),false);
  assert.throws(()=>collision.setObstacles([{id:"x",type:"rect",centerX:0,centerZ:0,width:0,depth:1}]),TypeError);
});

test("reset and teleport preserve existing product contract",()=>{
  const {core}=create();
  assert.equal(core.teleport(3,3),true);
  assert.deepEqual(core.getState(),{x:3,z:3,angle:.55,spin:0});
  core.reset();
  assert.deepEqual(core.getState(),{x:0,z:4.5,angle:.55,spin:0});
});
