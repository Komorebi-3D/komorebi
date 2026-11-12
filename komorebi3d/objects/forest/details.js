// Lightweight forest floor detail: shared meshes for grass, mossy rocks and deadwood.
// Visual-only details stay away from building entrances and the house/cafe passage.
const forestUnderstory=part('forest-understory');
const forestRocks=part('forest-rocks');
const forestDeadwood=part('forest-deadwood');
for(let i=0;i<FOREST_TREE_POSITIONS.length;i++){
 const [tx,tz]=FOREST_TREE_POSITIONS[i];
 // Fern-like crossed leaves around existing trunks, in irregular clusters.
 for(let j=0;j<6;j++){
  const a=(i*2.399+j*1.047),d=1.6+(j%3)*.44;
  const x=tx+Math.cos(a)*d,z=tz+Math.sin(a)*d;
  const h=.26+((i+j)%4)*.075;
  const color=[0x497c44,0x5c9653,0x6da15d,0x376e42][(i+j)%4];
  const axis=Math.cos(a+.45),side=Math.sin(a+.45);
  for(const sign of [-1,1]){
   tri(forestUnderstory,[x-.19*axis,0,z-.19*side],[x+.19*axis,0,z+.19*side],[x+sign*.09*side,h,z-sign*.09*axis],color);
   tri(forestUnderstory,[x+.19*axis,0,z+.19*side],[x-.19*axis,0,z-.19*side],[x+sign*.09*side,h,z-sign*.09*axis],color);
  }
 }
 if(i%2===0){
  const x=tx+3.1,z=tz-2.1;
  ellipsoid(forestRocks,x,0,z,.42+(i%3)*.1,.28+(i%4)*.04,.35,0x858d7b,4,6);
  ellipsoid(forestRocks,x-.10,.21,z-.07,.24,.09,.23,0x67966b,4,6);
 }
 if(i%4===0){
  const x=tx-2.8,z=tz+2.4;
  treeBranch(forestDeadwood,[x,0,z],[x,.45+(i%3)*.08,z],.34,.30,0x735942,6);
  ellipsoid(forestDeadwood,x,.46+(i%3)*.08,z,.32,.045,.32,0xb79d78,4,6);
 }
 if(i%6===0){
  const x=tx+2.3,z=tz+2.9;
  treeBranch(forestDeadwood,[x,.19,z],[x+1.45,.18,z+.38],.20,.14,0x6f573f,6);
 }
}

// Forest convenience-store comparison: three untouched 8 x 6 x 4m boxes.
// From west to east: FamilyMart, 7-Eleven, MINISTOP. Facades are added later.
const FOREST_STORE_TEST_BOXES=[
 {brand:'familymart',x:18,z:-12},
 {brand:'seven-eleven',x:29,z:-12},
 {brand:'ministop',x:40,z:-12}
];
for(const store of FOREST_STORE_TEST_BOXES){
 const boxMesh=part('forest-store-test-'+store.brand,[store.x,0,store.z]);
 cube(boxMesh,0,0,0,8,4,6,0xb9bbbd);
 // Shared sign & roof geometry overlays; the gray base box stays unchanged.
 const createMesh=(name)=>part(name,[store.x,0,store.z]);
 drawConvenienceSign(createMesh,quad,store.brand,{width:8,depth:6,height:4,faces:['front','right','back','left']});
 drawConvenienceRoof(createMesh,quad,store.brand,{width:8,depth:6,height:4});
 drawConvenienceWindows(createMesh,quad,store.brand,{width:8,depth:6,height:4,faces:['front','right','back','left']});
}
