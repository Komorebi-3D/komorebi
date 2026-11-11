// Generic, renderer-independent convenience-store appearance.
// The brand modules can later provide signs, doors, shelves and interiors.
import {sevenEleven} from './seven-eleven.js?v=convenience-v1-20261112';
import {familymart} from './familymart.js?v=convenience-v1-20261112';
// Distance tolerance in centimetres; edit 100 to adjust the allowed POI offset.
export const CONVENIENCE_MATCH_TOLERANCE_CM=100;
const brands=[sevenEleven,familymart];
const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyBrand(tags){
 if(tags.shop!=='convenience')return null;
 const values=[tags['brand:ja'],tags.brand,tags['brand:en'],tags['name:ja'],tags.name,tags['name:en']];
 for(const value of values){
  const name=normalized(value);
  if(!name)continue;
  const brand=brands.find(entry=>entry.names.some(alias=>name.startsWith(normalized(alias))));
  if(brand)return brand;
 }
 return null;
}
function polygonArea(poly){
 let area=0;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++)
  area+=poly[j][0]*poly[i][1]-poly[i][0]*poly[j][1];
 return Math.abs(area/2);
}
function insidePolygon(point,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&
      point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
// Shortest planar distance from a POI to one footprint edge, in metres.
function edgeDistance(point,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1];
 const lengthSquared=dx*dx+dz*dz;
 const t=lengthSquared?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/lengthSquared)):0;
 return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);
}
function footprintDistance(point,points){
 let shortest=Infinity;
 for(let i=0;i<points.length;i++)
  shortest=Math.min(shortest,edgeDistance(point,points[i],points[(i+1)%points.length]));
 return shortest;
}
// One-time matching. Containing footprints take priority; an outside POI may
// match only if exactly one building is within the configurable tolerance.
export function matchConvenienceBuildings(elements,project,halfSize){
 const candidates=[];
 for(const element of elements){
  if(element.type!=='way'||!element.tags?.building||element.tags.building==='no')continue;
  const geometry=element.geometry||[];
  if(geometry.length<4)continue;
  const points=geometry.map(project);
  if(Math.hypot(points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1])>.5)continue;
  points.pop();
  if(points.length<3)continue;
  const area=polygonArea(points);
  if(area<3||area>35000)continue;
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  if(minX>halfSize||maxX< -halfSize||minZ>halfSize||maxZ< -halfSize)continue;
  candidates.push({id:element.id,points,area,minX,maxX,minZ,maxZ});
 }
 const matched=new Map(),conflicts=new Set();
 const toleranceMetres=CONVENIENCE_MATCH_TOLERANCE_CM/100;
 for(const element of elements){
  if(element.type!=='node'||!Number.isFinite(element.lat)||!Number.isFinite(element.lon))continue;
  const brand=identifyBrand(element.tags||{});
  if(!brand)continue;
  const point=project(element);
  if(Math.abs(point[0])>halfSize||Math.abs(point[1])>halfSize)continue;
  let best=null;
  for(const building of candidates){
   if(point[0]<building.minX||point[0]>building.maxX||point[1]<building.minZ||point[1]>building.maxZ)continue;
   if(!insidePolygon(point,building.points))continue;
   if(!best||building.area<best.area)best=building;
  }
  if(!best&&toleranceMetres>0){
   // Do not guess when two or more building outlines are nearby.
   const nearby=[];
   for(const building of candidates){
    if(point[0]<building.minX-toleranceMetres||point[0]>building.maxX+toleranceMetres||
       point[1]<building.minZ-toleranceMetres||point[1]>building.maxZ+toleranceMetres)continue;
    if(footprintDistance(point,building.points)<=toleranceMetres)nearby.push(building);
    if(nearby.length>1)break;
   }
   if(nearby.length===1)best=nearby[0];
  }
  if(!best)continue;
  const previous=matched.get(best.id);
  if(previous&&previous.id!==brand.id)conflicts.add(best.id);
  else matched.set(best.id,brand);
 }
 for(const id of conflicts)matched.delete(id);
 return matched;
}
// Repeat brand colours across the entire exterior wall, without changing the footprint.
export function paintConvenienceWall(quad,mesh,a,b,height,baseColor,brand){
 if(!brand){
  quad(mesh,[a[0],0,a[1]],[b[0],0,b[1]],[b[0],height,b[1]],[a[0],height,a[1]],baseColor);
  return;
 }
 const cycleHeight=3;
 for(let start=0;start<height;start+=cycleHeight){
  let bottom=start;
  for(const stripe of brand.stripes){
   const top=Math.min(height,bottom+stripe.height*cycleHeight);
   if(top>bottom+1e-8)
    quad(mesh,[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],stripe.color);
   bottom=top;
   if(bottom>=height-1e-8)break;
  }
 }
}
