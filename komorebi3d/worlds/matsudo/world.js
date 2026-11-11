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
 const buildings=palette.map(builder),roads=builder(),walks=builder(),rails=builder(),floor=builder(),labels=[],mapFeatures=[];
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
   mapFeatures.push({type:'building',points:p});
   const name=String(tags['name:ja']||tags.name||'').trim();
   if(name)labels.push({name,x:(minX+maxX)/2,z:(minZ+maxZ)/2,y:height+.9});
   buildingCount++;
  }
  if(tags.highway&&!['construction','proposed'].includes(tags.highway)){
   const pedestrian=['footway','pedestrian','path','steps','cycleway','corridor','living_street'].includes(tags.highway);
   const width=pedestrian?(tags.highway==='pedestrian'?6:2.2):['primary','secondary','tertiary','trunk'].includes(tags.highway)?10:['service','residential','unclassified'].includes(tags.highway)?5.5:3.2;
   strip(pedestrian?walks:roads,p,width,pedestrian?0xc7c6b4:0x596570,pedestrian?.052:.047);
   mapFeatures.push({type:'road',points:p});
   roadCount++;
  }else if(tags.railway&&['rail','light_rail','tram'].includes(tags.railway)){
   strip(rails,p,3.1,0x806e65,.075);mapFeatures.push({type:'rail',points:p});railCount++;
  }
 }
 const meshes=[floor,...buildings,roads,walks,rails].filter(m=>m.positions.length>0);
 return {meshes,labels,mapFeatures,counts:{buildings:buildingCount,roads:roadCount,rails:railCount}};
}
// Project roof labels from the shared camera into the actual A/B viewport rectangles.
export function createMatsudoLabels(host){
 const layer=document.createElement('div');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);
 const viewports=[...host.querySelectorAll('.view-panel canvas')].map(canvas=>({canvas,items:[]}));
 let entries=[];
 function setLabels(labels){
  layer.replaceChildren();
  entries=labels.map(label=>({...label,width:Math.min(210,Math.max(92,Array.from(label.name).length*13+24))}));
  for(const viewport of viewports){
   viewport.items=entries.map(item=>{
    const el=document.createElement('div');
    el.style.cssText='position:absolute;display:none;pointer-events:none;transform:translate(-50%,-100%);flex-direction:column;align-items:center;white-space:nowrap;';
    const card=document.createElement('div');
    card.style.cssText='box-sizing:border-box;max-width:210px;min-width:92px;overflow:hidden;padding:7px 11px 8px;border:1px solid rgba(123,234,216,.72);border-radius:10px;background:rgba(23,40,56,.75);box-shadow:0 3px 14px rgba(6,15,29,.22);color:white;font-family:system-ui,-apple-system,sans-serif;text-align:left;';
    const header=document.createElement('div');
    header.style.cssText='color:#7bead8;font:600 9px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:1.1px;margin-bottom:3px;';
    header.textContent='● BUILDING';
    const title=document.createElement('div');
    title.style.cssText='max-width:186px;overflow:hidden;text-overflow:ellipsis;color:#fff;font:600 13px/1.4 system-ui,-apple-system,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.28);';
    title.textContent=item.name;
    card.append(header,title);
    const stem=document.createElement('div');
    stem.style.cssText='width:1px;height:22px;background:#7bead8;box-shadow:0 0 4px rgba(123,234,216,.35);';
    const dot=document.createElement('div');
    dot.style.cssText='width:7px;height:7px;border-radius:50%;background:#7bead8;box-shadow:0 0 0 2px rgba(23,40,56,.45);';
    el.append(card,stem,dot);layer.appendChild(el);
    return {...item,el};
   });
  }
 }
 function update(camera,player){
  const empty={total:entries.length,inRange:0,inView:0,shown:0};
  if(!camera||!layer.isConnected)return empty;
  const [ex,ey,ez]=camera.eye,[tx,ty,tz]=camera.target;
  const px=player?.x??tx,py=player?.y??ty,pz=player?.z??tz;
  let fx=tx-ex,fy=ty-ey,fz=tz-ez,fl=Math.hypot(fx,fy,fz);
  if(!fl)return empty;
  fx/=fl;fy/=fl;fz/=fl;
  let rx=-fz,rz=fx,rl=Math.hypot(rx,rz);
  if(rl<1e-6){rx=1;rz=0;rl=1;}
  rx/=rl;rz/=rl;
  const ux=-fy*rz,uy=fx*rz-fz*rx,uz=fy*rx;
  const tanHalf=Math.tan((camera.fovDegrees??45)*Math.PI/360);
  if(!(tanHalf>0))return empty;
  const ranked=entries.map((item,i)=>({
   i,item,
   cameraDistance:Math.hypot(item.x-ex,item.y-ey,item.z-ez),
   playerDistance:Math.hypot(item.x-px,item.y-py,item.z-pz)
  })).filter(entry=>entry.cameraDistance<=200)
    .sort((a,b)=>a.playerDistance-b.playerDistance);
  let inView=0,shown=0;
  const hostRect=host.getBoundingClientRect();
  for(const viewport of viewports){
   for(const item of viewport.items)item.el.style.display='none';
   const rect=viewport.canvas.getBoundingClientRect();
   if(rect.width<1||rect.height<1)continue;
   const scale=rect.height/(2*tanHalf),occupied=[];
   let viewShown=0;
   for(const {i,item} of ranked){
    if(viewShown>=20)break;
    const vx=item.x-ex,vy=item.y-ey,vz=item.z-ez;
    const depth=vx*fx+vy*fy+vz*fz;
    if(depth<=.2)continue;
    const x=rect.width/2+(vx*rx+vz*rz)*scale/depth;
    const y=rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth;
    const wd=item.width,top=y-72;
    if(x>=0&&x<=rect.width&&y>=0&&y<=rect.height)inView++;
    if(x<wd/2+4||x>rect.width-wd/2-4||top<4||y>rect.height-4||
      occupied.some(p=>Math.abs(x-p.x)<(wd+p.wd)/2+8&&Math.abs(top-p.top)<42))continue;
    occupied.push({x,top,wd});
    const el=viewport.items[i].el;
    el.style.display='flex';
    el.style.left=(rect.left-hostRect.left+x)+'px';
    el.style.top=(rect.top-hostRect.top+y)+'px';
    viewShown++;shown++;
   }
  }
  return {total:entries.length,inRange:ranked.length,inView,shown};
 }
 return {setLabels,update,dispose(){layer.remove();entries=[];}};
}
