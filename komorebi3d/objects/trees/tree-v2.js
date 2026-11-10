 // Tree v1/v2/v3 compare along the northern edge; v2 also occupies v1's former spot.
 // Original Tree v1 mesh geometry stays unchanged.
 function treeBranch(m,a,b,r0,r1,color,sides=7){
  const d=b.map((x,i)=>x-a[i]),len=Math.hypot(...d)||1,axis=d.map(x=>x/len),ref=Math.abs(axis[1])>.85?[1,0,0]:[0,1,0];
  const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  let u=cross(axis,ref),ul=Math.hypot(...u)||1;u=u.map(x=>x/ul);const v=cross(axis,u);
  const ring=(p,r,i)=>p.map((x,k)=>x+r*(u[k]*Math.cos(i*2*Math.PI/sides)+v[k]*Math.sin(i*2*Math.PI/sides)));
  for(let i=0;i<sides;i++)quad(m,ring(a,r0,i),ring(a,r0,i+1),ring(b,r1,i+1),ring(b,r1,i),color);
 }
 const treeLeaf=(m,p,color)=>ellipsoid(m,...p,color,6,8);
 const treeV2=part('tree-v2',[-5,0,-40]),v2Bark=0x88664a;
 treeBranch(treeV2,[0,0,0],[0,2.8,0],.58,.45,v2Bark);
 treeBranch(treeV2,[0,2.8,0],[.1,5.8,0],.45,.22,v2Bark);
 const v2Tips=[[-1.85,5.15,-.35],[1.95,5.2,.3],[-1.15,6.55,.9],[1.3,6.5,-.8],[.15,7.2,.15]];
 v2Tips.forEach((p,i)=>treeBranch(treeV2,[0,3+i*.49,0],p,.23,.08,v2Bark,6));
 const v2Crowns=[
 [-1.8,5.25,-.35,1.32,1.5,1.25],[-.95,6.25,.95,1.3,1.5,1.2],[1.95,5.3,.35,1.3,1.5,1.3],
 [1.2,6.35,-.75,1.42,1.5,1.35],[.1,7.05,.12,1.38,1.42,1.38],[-.65,5.75,-1,1.2,1.3,1.1],
 [.75,5.95,1.2,1.15,1.35,1.1],[-1.2,5.1,1.05,1.15,1.25,1.1],[1.2,5.05,-1.15,1.15,1.25,1.1]];
 const v2Greens=[0x609a5e,0x6dad65,0x76b978,0x57965b];
 v2Crowns.forEach((p,i)=>treeLeaf(treeV2,p,v2Greens[i%v2Greens.length]));
