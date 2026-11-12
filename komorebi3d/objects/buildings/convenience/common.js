// Generic, renderer-independent convenience-store appearance.
// The brand modules can later provide signs, doors, shelves and interiors.
import {sevenEleven} from './seven-eleven.js?v=convenience-v1-20261112';
import {familymart} from './familymart.js?v=convenience-v1-20261112';
import {lawsonStore100} from './lawson-store100.js?v=convenience-v4-20261112';
import {ministop} from './ministop.js?v=convenience-v4-20261112';
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

const FAMILY_GLASS=0x415c6a,FAMILY_FRAME=0x273b47,FAMILY_WHITE=0xf5f7f5;
const FAMILY_GREEN=0x00a76f,FAMILY_BLUE=0x1687bf;
// Compact 3x5 glyphs; no textures, external fonts or renderer-specific dependencies.
const FAMILY_GLYPHS={
 F:['111','100','110','100','100'],a:['000','011','101','111','101'],
 m:['000','110','111','101','101'],i:['010','000','010','010','010'],
 l:['100','100','100','100','011'],y:['000','101','111','001','110'],
 M:['101','111','111','101','101'],r:['000','110','101','100','100'],
 t:['010','111','010','010','011']
};
function familymartFacade(quad,mesh,a,b,bottom,top,side,signCenter=true){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<.1||top-bottom<.2)return false;
 const panels=Math.max(2,Math.min(40,Math.round(length/1.55/2)*2));
 const unit=length/panels,center=panels/2,signBottom=top-(top-bottom)*.2;
 const xy=(u,y,offset=0)=>[a[0]+dx*u/length+side*dz/length*offset,y,
   a[1]+dz*u/length-side*dx/length*offset];
 const rect=(x0,x1,y0,y1,tint,offset=0)=>{
  if(x1<=x0||y1<=y0)return;
  quad(mesh,xy(x0,y0,offset),xy(x1,y0,offset),xy(x1,y1,offset),xy(x0,y1,offset),tint);
 };
 const frame=Math.min(.065,unit*.055),glassBottom=bottom+.06;
 for(let k=0;k<panels;k++){
  const x0=k*unit,x1=(k+1)*unit;
  // Repeat the same sign/window module on each regular bay.
  rect(x0,x1,signBottom,top,FAMILY_WHITE);
  rect(x0,x1,top-(top-signBottom)*.20,top,FAMILY_GREEN,.006);
  rect(x0,x1,signBottom,signBottom+(top-signBottom)*.11,FAMILY_BLUE,.006);
  if(side==='back')rect(x0,x1,bottom,signBottom,0xc4c9c7);
  else rect(x0,x1,bottom,signBottom,FAMILY_GLASS);
  // Align the sign panel seam exactly with the window mullion.
  if(k>0&&k!==center)rect(x0-frame/2,x0+frame/2,signBottom,top,0xc3c9cb,.008);
  if(k>0&&!(side==='front'&&k===center))
   rect(x0-frame/2,x0+frame/2,glassBottom,signBottom,FAMILY_FRAME,.008);
 }
 // One exception spans exactly two regular modules: sign+door at the front,
 // sign only on side/back. Logo panel has no central seam.
 const logoStart=(center-1)*unit,logoEnd=(center+1)*unit;
 rect(logoStart,logoEnd,signBottom,top,FAMILY_WHITE,.012);
 rect(logoStart,logoEnd,top-(top-signBottom)*.20,top,FAMILY_GREEN,.018);
 rect(logoStart,logoEnd,signBottom,signBottom+(top-signBottom)*.11,FAMILY_BLUE,.018);
 if(side==='front'){
  rect(logoStart,logoEnd,glassBottom,signBottom,0x668995,.011);
  rect(logoStart,logoStart+frame,glassBottom,signBottom,FAMILY_FRAME,.018);
  rect(logoEnd-frame,logoEnd,glassBottom,signBottom,FAMILY_FRAME,.018);
  // The two-door division stays; the two-module window mullion is removed.
  rect(length/2-frame/2,length/2+frame/2,glassBottom,signBottom,FAMILY_FRAME,.019);
  const handleY=bottom+(signBottom-bottom)*.46,handleH=Math.min(.32,(signBottom-bottom)*.16);
  rect(length/2-.12,length/2-.095,handleY,handleY+handleH,0xdfe9ec,.025);
  rect(length/2+.095,length/2+.12,handleY,handleY+handleH,0xdfe9ec,.025);
 }
 // Pixel-built word mark, centered within the merged two-module sign.
 const label='FamilyMart',pixels=[];
 for(const ch of label){const glyph=FAMILY_GLYPHS[ch];if(glyph)pixels.push(glyph);}
 const cols=pixels.length*4-1,markH=(top-signBottom)*.43;
 const pixel=Math.min((logoEnd-logoStart)*.90/cols,markH/5);
 const left=(length-cols*pixel)/2,y0=signBottom+(top-signBottom)*.30;
 for(let i=0;i<pixels.length;i++)for(let j=0;j<5;j++)for(let k=0;k<3;k++)
  if(pixels[i][j][k]==='1')
   rect(left+(i*4+k)*pixel,left+(i*4+k+.89)*pixel,
    y0+(4-j)*pixel,y0+(4-j+.89)*pixel,FAMILY_BLUE,.03);
 return true;
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
export function paintConvenienceWall(quad,mesh,a,b,height,baseColor,spans,facadeSide='side'){
 const wall=(bottom,top,color)=>{
  if(top>bottom+1e-8)
   quad(mesh,[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],color);
 };
 let cursor=0;
 for(const span of spans||[]){
  if(span.bottom>cursor)wall(cursor,span.bottom,baseColor);
  if(span.brand.id!=='familymart'||!familymartFacade(quad,mesh,a,b,span.bottom,span.top,facadeSide))
   paintBrandStripe(quad,mesh,a,b,span.bottom,span.top,span.brand);
  cursor=Math.max(cursor,span.top);
 }
 if(cursor<height)wall(cursor,height,baseColor);
}
