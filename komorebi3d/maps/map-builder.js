// Convert verified OSM map data into renderer-independent meshes and roof labels.
// Defaults preserve the original Matsudo 500m test snapshot.
export function buildMap(map,{latitude=35.78444,longitude=139.90061,halfSize=250}={}){
 const LAT=latitude,LON=longitude,HALF=halfSize;
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
 const buildings=palette.map(builder),roads=builder(),walks=builder(),rails=builder(),floor=builder(),labels=[],mapFeatures=[],poiLabels=[];
 const facilityKeys=['shop','amenity','tourism','office','leisure','healthcare'];
 // Name equality and short geographic distance: no per-store mappings.
 const normalized=name=>String(name).normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d\-]/g,'');
 const isNearby=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<=15;
 rectangle(floor,-HALF,-HALF,HALF,HALF,0x9fce8d);
 let buildingCount=0,roadCount=0,railCount=0;
 for(const e of map.elements){
  const tags=e.tags||{},p=(e.geometry||[]).map(xy);
  // Point-of-interest nodes have coordinates, not a way geometry.
  // Keep their OSM position as the ground-level anchor.
  if(e.type==='node'&&facilityKeys.some(key=>tags[key])){
   const name=String(tags['name:ja']||tags.name||'').trim();
   if(name&&Number.isFinite(e.lat)&&Number.isFinite(e.lon)){
    const [x,z]=xy(e);
    if(Math.abs(x)<=HALF&&Math.abs(z)<=HALF)
     poiLabels.push({kind:'poi',name,tags:{...tags},x,z,y:.9});
   }
  }
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
   if(name)labels.push({kind:'building',name,tags:{...tags},x:(minX+maxX)/2,z:(minZ+maxZ)/2,y:height+.9});
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
 // Deduplicate named facilities automatically against nearby same-name buildings
 // and other nodes. Retain the precise POI anchor and merge tags.
 for(const poi of poiLabels){
  const name=normalized(poi.name);
  const existing=labels.find(label=>normalized(label.name)===name&&isNearby(label,poi));
  if(existing){
   existing.name=poi.name;
   existing.x=poi.x;existing.z=poi.z;existing.y=poi.y;
   existing.kind='poi';
   existing.tags={...existing.tags,...poi.tags};
  }else labels.push(poi);
 }
 const meshes=[floor,...buildings,roads,walks,rails].filter(m=>m.positions.length>0);
 return {meshes,labels,mapFeatures,counts:{buildings:buildingCount,roads:roadCount,rails:railCount}};
}
