// OSM adapter: brand matching, OSM floor metadata and legacy storefront walls.
import {CONVENIENCE_DOOR_WIDTH_M} from './const.js?v=convenience-double-signs-v2-20261112';
import {convenienceRoofColor,paintConvenienceGlazing,paintConvenienceSign} from './common.js?v=convenience-double-signs-v7-20261112';
import {sevenEleven} from './seven-eleven.js?v=seven-sign-green-bands-v2-20261112';
import {familymart} from './familymart.js?v=convenience-sign-v1-20261112';
import {lawsonStore100} from './lawson-store100.js?v=convenience-v4-20261112';
import {ministop} from './ministop.js?v=ministop-white-logo-v2-20261112';
import {lawson} from './lawson.js?v=convenience-v4-20261112';
// Distance tolerance in centimetres; edit 100 to adjust the allowed POI offset.
export const CONVENIENCE_MATCH_TOLERANCE_CM=100;
// Specific Lawson sub-brands must be resolved before the general Lawson name.
const brands=[sevenEleven,familymart,lawsonStore100,ministop,lawson];
const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyBrand(tags){
 if(tags.shop!=='convenience')return null;
 const values=[tags['brand:ja'],tags.brand,tags['brand:en'],tags['name:ja'],tags.name,tags['name:en']];
 // Natural Lawson remains intentionally unpainted until its own brand module exists.
 // Inspect all provided names so a generic 'LAWSON' tag cannot override it.
 if(values.some(value=>{
  const name=normalized(value);
  return name.startsWith(normalized('ナチュラルローソン'))||name.startsWith('naturallawson');
 }))return null;
 for(const brand of brands){
  if(values.some(value=>{
   const name=normalized(value);
   return name&&brand.names.some(alias=>name.startsWith(normalized(alias)));
  }))return brand;
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
 const matched=new Map();
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
  if(!matched.has(best.id))matched.set(best.id,[]);
  matched.get(best.id).push({brand,level:element.tags?.level});
 }
 return matched;
}
// A valid OSM level is a zero-based integer; semicolons specify multiple floors.
// Unknown/malformed values deliberately paint the whole building to reveal map issues.
function parseLevels(raw){
 if(raw===undefined||raw===null||String(raw).trim()==='')return null;
 const parts=String(raw).split(';').map(value=>value.trim());
 if(parts.some(value=>!/^[-+]?\d+$/.test(value)))return 'invalid';
 const values=parts.map(Number);
 if(values.some(value=>!Number.isSafeInteger(value)))return 'invalid';
 return [...new Set(values)];
}
function validPositiveNumber(value){
 if(value===undefined||value===null||!/^\d+(?:\.\d+)?$/.test(String(value).trim()))return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>0?n:null;
}
// Return sorted wall spans. Null brand means the ordinary building facade.
// Missing both height and floor count, or contradictory metadata, paints the whole wall.
export function resolveConveniencePaint(stores,tags,height){
 if(!stores?.length)return [];
 const whole=brand=>[{bottom:0,top:height,brand}];
 const first=stores[0].brand;
 if('min_height'in tags||'building:min_level'in tags)return whole(first);
 const explicitHeight=validPositiveNumber(tags.height);
 const declaredLevels=tags['building:levels'];
 const levelCount=declaredLevels===undefined?null:validPositiveNumber(declaredLevels);
 if((explicitHeight===null&&levelCount===null)||
    (declaredLevels!==undefined&&(levelCount===null||!Number.isInteger(levelCount))))return whole(first);
 const floorHeight=levelCount===null?3:height/levelCount;
 if(!Number.isFinite(floorHeight)||floorHeight<=0)return whole(first);
 const spans=[];
 for(const store of stores){
  const levels=parseLevels(store.level);
  if(levels===null||levels==='invalid')return whole(first);
  for(const level of levels){
   if(level<0)continue; // Underground geometry does not exist yet.
   const bottom=level*floorHeight,top=Math.min(height,(level+1)*floorHeight);
   if(levelCount!==null&&level>=levelCount||bottom>=height-1e-8||top<=bottom)return whole(first);
   spans.push({bottom,top,brand:store.brand});
  }
 }
 spans.sort((a,b)=>a.bottom-b.bottom||a.top-b.top);
 for(let i=0;i<spans.length;i++){
  for(let j=i+1;j<spans.length&&spans[j].bottom<spans[i].top-1e-8;j++){
   if(spans[i].brand.id!==spans[j].brand.id)return whole(first);
  }
 }
 // Duplicate same-brand store nodes or levels must not double-paint a wall.
 const unique=[];
 for(const span of spans){
  const previous=unique[unique.length-1];
  if(previous&&previous.brand.id===span.brand.id&&span.bottom<previous.top-1e-8)
   previous.top=Math.max(previous.top,span.top);
  else unique.push({...span});
 }
 return unique;
}

function convenienceStoreFacade(quad,mesh,a,b,bottom,top,side,outward,brand){
 if(!brand.sign)return false;
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<.1||top-bottom<.2)return false;
 const entrance=side==='front'&&length>=CONVENIENCE_DOOR_WIDTH_M;
 const signBottom=top-(top-bottom)*.2;
 const point=(u,y,offset=0)=>[a[0]+dx*u/length+outward*dz/length*offset,y,
   a[1]+dz*u/length-outward*dx/length*offset];
 const rect=(u0,u1,y0,y1,tint,offset=0)=>{
  if(u1<=u0||y1<=y0)return;
  quad(mesh,point(u0,y0,offset),point(u1,y0,offset),
    point(u1,y1,offset),point(u0,y1,offset),tint);
 };
 paintConvenienceSign(rect,(p0,p1,p2,p3,t)=>quad(mesh,p0,p1,p2,p3,t),
   point,brand.sign,{length,bottom:signBottom,top,entrance});
 paintConvenienceGlazing(rect,{length,bottom,top:signBottom,
   side:entrance?'front':side==='back'?'back':'side',backWall:true});
 return true;
}

// OSM tags are interpreted here, but the actual roof-color rule is shared.
export function resolveOsmConvenienceRoofColor(spans,tags,height,baseColor){
 if(!spans?.length)return baseColor;
 const levels=tags?.['building:levels'];
 const singleStorey=levels===undefined||levels===null||String(levels).trim()===''?
  height<=5:validPositiveNumber(levels)===1;
 return convenienceRoofColor({hasStore:true,singleStorey,baseColor});
}

// Preserve each brand's stripe proportions, with a repeating 1m physical cycle.
function paintBrandStripe(quad,mesh,a,b,bottom,top,brand){
 const cycleHeight=1;
 for(let start=bottom;start<top-1e-8;start+=cycleHeight){
  let y=start;
  for(const stripe of brand.stripes){
   const next=Math.min(top,y+stripe.height*cycleHeight);
   if(next>y+1e-8)
    quad(mesh,[a[0],y,a[1]],[b[0],y,b[1]],[b[0],next,b[1]],[a[0],next,a[1]],stripe.color);
   y=next;
   if(y>=top-1e-8)break;
  }
 }
}
export function paintConvenienceWall(quad,mesh,a,b,height,baseColor,spans,facadeSide='side',outward=1){
 const wall=(bottom,top,color)=>{
  if(top>bottom+1e-8)
   quad(mesh,[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],color);
 };
 let cursor=0;
 for(const span of spans||[]){
  if(span.bottom>cursor)wall(cursor,span.bottom,baseColor);
  if(!span.brand.sign||!convenienceStoreFacade(quad,mesh,a,b,span.bottom,span.top,facadeSide,outward,span.brand))
   paintBrandStripe(quad,mesh,a,b,span.bottom,span.top,span.brand);
  cursor=Math.max(cursor,span.top);
 }
 if(cursor<height)wall(cursor,height,baseColor);
}
