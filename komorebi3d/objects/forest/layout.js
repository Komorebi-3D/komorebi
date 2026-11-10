// Forest layout v1 — deterministic, 50 added Tree v2 instances.
// Outer forest is denser. Keep both buildings, entrances, their shared walkway,
// the northern comparison trees, and the existing v2 tree clear.
const FOREST_TREE_POSITIONS=(()=>{
 const trees=[],occupied=[[-18,-40],[-5,-40],[10,-40],[-7,-5]];
 let seed=20261110;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const pathA=[-25,-13],pathB=[4.5,2.5];
 const distanceToSegment=(x,z,a,b)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
 };
 const free=(x,z)=>{
  // Building + porch/deck buffers (both open spaces are intentionally broad).
  if(x>-14&&x<22&&z>-19&&z<15)return false;
  if(x>-43&&x<-7&&z>-35&&z<4)return false;
  if(distanceToSegment(x,z,pathA,pathB)<9)return false;
  if(x>-26&&x<19&&z<-32)return false; // preserve original northern tree comparison
  if(occupied.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<7))return false;
  return true;
 };
 for(let attempt=0;attempt<6000&&trees.length<50;attempt++){
  const x=-44+88*random(),z=-44+88*random();
  const border=Math.max(Math.abs(x),Math.abs(z));
  if(border<20||random()>Math.min(1,.38+(border-20)*.028))continue;
  if(!free(x,z))continue;
  const px=Math.round(x*10)/10,pz=Math.round(z*10)/10;
  trees.push([px,pz]);
  occupied.push([px,pz]);
 }
 if(trees.length!==50)throw Error('Forest requires 50 safely spaced Tree v2 positions; got '+trees.length);
 return trees;
})();
