import test from "node:test";
import assert from "node:assert/strict";
import { createMeshGeometry, createMeshRenderSnapshot } from "../renderer/MeshRenderSnapshot.js";
import { createRenderer } from "../renderer/RendererFactory.js";
import { assertRenderer } from "../renderer/RendererContract.js";

function triangle(id="triangle") {
  return createMeshGeometry({
    id, positions:[0,0,0,1,0,0,0,1,0],
    normals:[0,0,1,0,0,1,0,0,1],
    colors:[1,0,0,0,1,0,0,0,1]
  });
}

test("mesh-profile renderer A/B independently implement shared public contract",async()=>{
  for(const backend of ["A","B"]){
    const renderer=await createRenderer(backend,{profile:"mesh"});
    assert.equal(assertRenderer(renderer),renderer);
    assert.equal(renderer.lastFrameId,-1);
  }
});

test("frozen geometry remains detached from source arrays",()=>{
  const colors=[1,0,0,0,1,0,0,0,1];
  const mesh=createMeshGeometry({
    id:"test",positions:[0,0,0,1,0,0,0,1,0],
    normals:[0,0,1,0,0,1,0,0,1],colors
  });
  colors[0]=.25;
  assert.equal(mesh.colors[0],1);
  assert.ok(Object.isFrozen(mesh.positions));
  assert.ok(Object.isFrozen(mesh));
  assert.throws(()=>{mesh.positions[0]=2},TypeError);
});

test("A/B receive one immutable snapshot containing same geometry identity",()=>{
  const geo=triangle();
  const snapshot=createMeshRenderSnapshot({
    frameId:23,camera:{eye:[0,5,12],target:[0,2,0]},
    objects:[
      {id:"hamster",geometry:geo,position:[0,0,0],opacity:1},
      {id:"wall",geometry:geo,position:[2,0,1],opacity:.35}
    ]
  });
  assert.equal(snapshot.frameId,23);
  assert.strictEqual(snapshot.objects[0].geometry,geo);
  assert.strictEqual(snapshot.objects[1].geometry,geo);
  assert.equal(snapshot.objects[1].opacity,.35);
  assert.ok(Object.isFrozen(snapshot.objects));
  assert.throws(()=>{snapshot.objects[0].position[0]=3},TypeError);
});

test("invalid mesh attribute lengths, alpha and duplicate IDs are rejected",()=>{
  assert.throws(()=>createMeshGeometry({id:"x",positions:[0,0,0],normals:[0,0,1],colors:[1,0,0]}),TypeError);
  const geo=triangle();
  const base={frameId:1,camera:{eye:[0,5,12],target:[0,0,0]}};
  const item={id:"part",geometry:geo,position:[0,0,0]};
  assert.throws(()=>createMeshRenderSnapshot({...base,objects:[item,item]}),/Duplicate/);
  assert.throws(()=>createMeshRenderSnapshot({...base,objects:[{...item,opacity:1.3}]}),/opacity/i);
});
