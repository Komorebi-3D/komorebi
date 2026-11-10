// Matsudo is map data only. Komorebi owns movement, camera and renderers.
const LAT=35.78444,LON=139.90061,HALF=250;
const xy=p=>[(p.lon-LON)*111320*Math.cos(LAT*Math.PI/180),-(p.lat-LAT)*111320];
const color=c=>[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];
const palette=[0xc9bba8,0x9baeb8,0xb7b0a8,0xdbbfaa,0xabae9e,0xc4a99d];
function builder(){return {positions:[],normals:[],colors:[]};}
function tri(mesh,a,b,c,tint){
 const u=b.map((v,i)=>v-a[i]),v=c.map((w,i)=>w-a[i]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const length=Math.hypot(...n)||1,norm=n.map(x=>x/length),rgb=color(tint);
 for(const p of [a,b,c]){mesh.positions.push(...p);mesh.normals.push(...norm);mesh.colors.push(...rgb);}
}
function quad(m,a,b,c,d,t){tri(m,a,b,c,t);tri(m,a,c,d,t);}
function signedArea(p){let sum=0;for(let i=0,j=p.length-1;i<p.length;j=i++)sum+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return sum/2;}
function top(m,p,h,t){
 // Simple ear clipping handles concave OSM footprints without a Three.js dependency.
 const idx=p.map((_,i)=>i),ccw=signedArea(p)>0;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 let guard=0;
 while(idx.length>3&&guard++<p.length*p.length){
  let found=false;
  for(let i=0;i<idx.length;i++){
   const ia=idx[(i+idx.length-1)%idx.length],ib=idx[i],ic=idx[(i+1)%idx.length],a=p[ia],b=p[ib],c=p[ic];
   if((ccw?1:-1)*cross(a,b,c)<=1e-7)continue;
   let overlaps=false;
   for(const j of idx)if(j!==ia&&j!==ib&&j!==ic){
    const q=p[j],s1=cross(a,b,q),s2=cross(b,c,q),s3=cross(c,a,q);
    if(ccw?Math.min(s1,s2,s3)>=-1e-7:Math.max(s1,s2,s3)<=1e-7){overlaps=true;break;}
   }
   if(overlaps)continue;
   if(ccw)tri(m,[a[0],h,a[1]],[c[0],h,c[1]],[b[0],h,b[1]],t);
   else tri(m,[a[0],h,a[1]],[b[0],h,b[1]],[c[0],h,c[1]],t);
   idx.splice(i,1);found=true;break;
  }
  if(!found)break;
 }
 if(idx.length===3){const a=p[idx[0]],b=p[idx[1]],c=p[idx[2]];if(ccw)tri(m,[a[0],h,a[1]],[c[0],h,c[1]],[b[0],h,b[1]],t);else tri(m,[a[0],h,a[1]],[b[0],h,b[1]],[c[0],h,c[1]],t);}
}
function building(m,p,h,t){
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];
  quad(m,[a[0],0,a[1]],[b[0],0,b[1]],[b[0],h,b[1]],[a[0],h,a[1]],t);
 }
 top(m,p,h,t);
}
function strip(m,points,width,t,y=.045){
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  if(len<.01)continue;
  const nx=-dz/len*width/2,nz=dx/len*width/2;
  quad(m,[a[0]-nx,y,a[1]-nz],[a[0]+nx,y,a[1]+nz],[b[0]+nx,y,b[1]+nz],[b[0]-nx,y,b[1]-nz],t);
 }
}
function rectangle(m,x0,z0,x1,z1,t){quad(m,[x0,-.22,z0],[x0,-.22,z1],[x1,-.22,z1],[x1,-.22,z0],t);}
export async function loadMatsudoWorld(){
 const response=await fetch('./worlds/matsudo/map-data.json',{cache:'no-cache'});
 if(!response.ok)throw new Error('松戸OSMの読み込み失敗 HTTP '+response.status);
 const map=await response.json();
 if(map.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements)||map.elements.length<20)
  throw new Error('松戸OSMデータの形式が不正');
 const buildings=palette.map(builder),roads=builder(),walks=builder(),rails=builder(),floor=builder(),labels=[];
 rectangle(floor,-HALF,-HALF,HALF,HALF,0x9fce8d);
 let buildingCount=0,roadCount=0,railCount=0;
 for(const e of map.elements){
  const tags=e.tags||{},p=(e.geometry||[]).map(xy);
  if(p.length<2)continue;
  if(tags.building&&tags.building!=='no'&&p.length>=4){
   if(Math.hypot(p[0][0]-p[p.length-1][0],p[0][1]-p[p.length-1][1])>.5)continue;
   p.pop();if(p.length<3)continue;
   const area=Math.abs(signedArea(p));if(area<3||area>35000)continue;
   const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
   if(minX>HALF||maxX< -HALF||minZ>HALF||maxZ< -HALF)continue;
   let height=Number.parseFloat(tags.height);
   if(!Number.isFinite(height)||height<2||height>180){
    const levels=Number.parseFloat(tags['building:levels']);
    height=Number.isFinite(levels)&&levels>0?Math.min(60,levels*3):9;
   }
   building(buildings[e.id%palette.length],p,height,palette[e.id%palette.length]);
   const name=String(tags['name:ja']||tags.name||'').trim();
   if(name)labels.push({name,x:(minX+maxX)/2,z:(minZ+maxZ)/2,y:height+.9});
   buildingCount++;
  }
  if(tags.highway&&!['construction','proposed'].includes(tags.highway)){
   const pedestrian=['footway','pedestrian','path','steps','cycleway','corridor','living_street'].includes(tags.highway);
   const width=pedestrian?(tags.highway==='pedestrian'?6:2.2):['primary','secondary','tertiary','trunk'].includes(tags.highway)?10:['service','residential','unclassified'].includes(tags.highway)?5.5:3.2;
   strip(pedestrian?walks:roads,p,width,pedestrian?0xc7c6b4:0x596570,pedestrian?.052:.047);
   roadCount++;
  }else if(tags.railway&&['rail','light_rail','tram'].includes(tags.railway)){
   strip(rails,p,3.1,0x806e65,.075);railCount++;
  }
 }
 const meshes=[floor,...buildings,roads,walks,rails].filter(m=>m.positions.length>0);
 return {meshes,labels,counts:{buildings:buildingCount,roads:roadCount,rails:railCount}};
}
export function createMatsudoLabels(host){
 const layer=document.createElement('div');layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);let items=[];
 function setLabels(labels){
  layer.replaceChildren();items=labels.map(label=>{
   const el=document.createElement('div');el.textContent=label.name;
   el.style.cssText='position:absolute;display:none;max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 8px;background:#142435e8;border:1px solid #fff8be;border-radius:6px;color:#fff;font:bold 13px system-ui;transform:translate(-50%,-100%);text-shadow:0 1px #000';
   layer.appendChild(el);return {...label,el};
  });
 }
 function update(camera){
  if(!camera||!layer.isConnected)return;
  const [ex,ey,ez]=camera.eye,[tx,ty,tz]=camera.target;
  let fx=tx-ex,fy=ty-ey,fz=tz-ez,fl=Math.hypot(fx,fy,fz)||1;fx/=fl;fy/=fl;fz/=fl;
  let rx=-fz,rz=fx,rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;
  const ux=-fy*rz,uy=fx*rz-fz*rx,uz=fy*rx;
  const w=layer.clientWidth,h=layer.clientHeight;
  if(!w||!h)return;
  const scale=h/(2*Math.tan(45*Math.PI/360)),occupied=[];
  const visible=items.map(item=>({item,d:Math.hypot(item.x-ex,item.y-ey,item.z-ez)})).sort((a,b)=>a.d-b.d);
  let shown=0;
  for(const {item,d} of visible){
   const vx=item.x-ex,vy=item.y-ey,vz=item.z-ez,depth=vx*fx+vy*fy+vz*fz;
   if(d>180||depth<=.2){item.el.style.display='none';continue;}
   const x=w/2+(vx*rx+vz*rz)*scale/depth,y=h/2-(vx*ux+vy*uy+vz*uz)*scale/depth;
   const wd=Math.min(190,Math.max(68,item.name.length*13+16));
   if(shown>=18||x<wd/2+4||x>w-wd/2-4||y<36||y>h-4||
     occupied.some(p=>Math.abs(x-p.x)<(wd+p.wd)/2+8&&Math.abs(y-p.y)<34)){
    item.el.style.display='none';continue;
   }
   occupied.push({x,y,wd});shown++;item.el.style.display='block';item.el.style.left=x+'px';item.el.style.top=y+'px';
  }
 }
 return {setLabels,update,dispose(){layer.remove();items=[];}};
}
