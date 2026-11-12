// Shared renderer-independent convenience-store sign and roof geometry.
// This module knows dimensions and brand styles, never OSM tags or POI matching.
import {familymart} from './familymart.js?v=convenience-sign-v1-20261112';
import {sevenEleven} from './seven-eleven.js?v=seven-sign-green-bands-v2-20261112';
import {ministop} from './ministop.js?v=ministop-white-logo-v2-20261112';
const FOREST_SIGN_BRANDS={
 'familymart':familymart,'seven-eleven':sevenEleven,'ministop':ministop
};

// x/y are local to an 8m-wide box; positive z faces the forest visitor.
// The sign occupies the upper 20% of the 4m storefront, like Matsudo.
export function drawConvenienceSign(part,quad,brandId,{width=8,depth=6,height=4,faces=['front']}={}){
 const sign=FOREST_SIGN_BRANDS[brandId]?.sign;
 if(!sign)return false;
 // Each face has its own mesh, so its geometry remains independent and visible.
 for(const face of faces){
  const mesh=part('convenience-sign-'+brandId+'-'+face);
 const low=height*.8,high=height;
 const faceWidth=face==='front'||face==='back'?width:depth;
 const facePanels=Math.max(2,Math.min(40,Math.round(faceWidth/1.34/2)*2));
 const span=faceWidth/facePanels,middle=facePanels/2;
 const place=(u,y,out=0)=>{
  if(face==='front')return [u,y,depth/2+.012+out];
  if(face==='back')return [-u,y,-depth/2-.012-out];
  if(face==='left')return [-width/2-.012-out,y,u];
  return [width/2+.012+out,y,-u];
 };
 const rect=(x0,x1,y0,y1,color,offset=0)=>{
  if(x1<=x0||y1<=y0)return;
  quad(mesh,place(x0,y0,offset),place(x1,y0,offset),
    place(x1,y1,offset),place(x0,y1,offset),color);
 };
 const seam=Math.min(.065,span*.055);
 for(let k=0;k<facePanels;k++){
  const x0=-faceWidth/2+k*span,x1=x0+span;
  rect(x0,x1,low,high,sign.background);
  if(sign.bands){
   for(const band of sign.bands)
    rect(x0,x1,low+(high-low)*band.from,low+(high-low)*band.to,band.color,.006);
  }else{
   rect(x0,x1,high-(high-low)*.20,high,sign.upper,.006);
   rect(x0,x1,low,low+(high-low)*.11,sign.lower,.006);
  }
  if(k>0&&(face!=='front'||k!==middle))rect(x0-seam/2,x0+seam/2,low,high,0xc3c9cb,.008);
 }
 // Logo only above the front double doors. Side/back keep ordinary bands.
 if(face==='front'){
 const start=-span,end=span;
 rect(start,end,low,high,sign.logo?.background??sign.background,.012);
 if(!sign.logo){
  rect(start,end,high-(high-low)*.20,high,sign.upper,.018);
  rect(start,end,low,low+(high-low)*.11,sign.lower,.018);
 }
 if(sign.logo){
  const logoH=(high-low)*.91;
  const logoW=Math.min((end-start)*.9,logoH*(sign.logo.aspect??1.24));
  const lx=-logoW/2,ly=low+((high-low)-logoH)/2;
  const p=([x,y],z)=>place(lx+x*logoW,ly+y*logoH,z);
  for(const [a,b,c,d,tint,z=.033] of sign.logo.quads)
   quad(mesh,p(a,z),p(b,z),p(c,z),p(d,z),tint);
 }
 const pixels=[];
 for(const ch of sign.label||'')if(sign.glyphs?.[ch])pixels.push(sign.glyphs[ch]);
 if(pixels.length){
  const cols=pixels.length*4-1;
  const pixel=sign.logo?.wordmark?
   Math.min((end-start)*.84/cols,(high-low)*.91*.35/5):
   sign.logo?Math.min((high-low)*.91*1.24*1.05/cols,(high-low)*.91*.18/5):
   Math.min((end-start)*.90/cols,(high-low)*.43/5);
  const left=-cols*pixel/2;
  const bottom=sign.logo?.wordmark?low+(high-low)*.30:
    sign.logo?low+(high-low)*(.045+.91*.31):low+(high-low)*.30;
  for(let i=0;i<pixels.length;i++)for(let j=0;j<5;j++)for(let k=0;k<3;k++){
   if(pixels[i][j][k]==='1')
    rect(left+(i*4+k)*pixel,left+(i*4+k+.89)*pixel,
      bottom+(4-j)*pixel,bottom+(4-j+.89)*pixel,
      sign.textColor,sign.logo?.05:.03);
  }
 }
 }
 }
 return true;
}

// Geometry-only rule; OSM adapter decides whether a building is single-storey.
export function convenienceRoofColor({hasStore=true,singleStorey=true,baseColor=0xb9bbbd}={}){
 return hasStore&&singleStorey?0xffffff:baseColor;
}
export function drawConvenienceRoof(part,quad,brandId,{width=8,depth=6,height=4,singleStorey=true}={}){
 if(!singleStorey)return false;
 const mesh=part('convenience-roof-'+brandId);
 const x=width/2,z=depth/2,y=height+.005;
 quad(mesh,[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],
   convenienceRoofColor({hasStore:true,singleStorey,baseColor:0xb9bbbd}));
 return true;
}

// Reusable geometry-only facade glazing. Coordinates are along a flat wall:
// rect(start,end,bottom,top,color,outwardOffset). The caller supplies its wall
// orientation; neither the glazing nor the door knows about OSM.
export function paintConvenienceGlazing(rect,{length,panels,bottom=0,top,side='front',backWall=false}){
 if(!(length>0&&top>bottom))return false;
 const unit=length/panels,center=panels/2;
 const frame=Math.min(.065,unit*.055),glassBottom=bottom+.06;
 const glass=0x415c6a,frameColor=0x273b47;
 for(let k=0;k<panels;k++){
  const x0=k*unit,x1=(k+1)*unit;
  rect(x0,x1,bottom,top,backWall&&side==='back'?0xc4c9c7:glass);
  if(k>0&&!(side==='front'&&k===center))
   rect(x0-frame/2,x0+frame/2,glassBottom,top,frameColor,.008);
 }
 if(side==='front'){
  const start=(center-1)*unit,end=(center+1)*unit;
  rect(start,end,glassBottom,top,0x668995,.011);
  rect(start,start+frame,glassBottom,top,frameColor,.018);
  rect(end-frame,end,glassBottom,top,frameColor,.018);
  rect(length/2-frame/2,length/2+frame/2,glassBottom,top,frameColor,.019);
  const handleY=bottom+(top-bottom)*.46,handleH=Math.min(.32,(top-bottom)*.16);
  rect(length/2-.12,length/2-.095,handleY,handleY+handleH,0xdfe9ec,.025);
  rect(length/2+.095,length/2+.12,handleY,handleY+handleH,0xdfe9ec,.025);
 }
 return true;
}

// Four-sided windows, with the central double door on the front face only.
// The upper sign zone is reserved for drawConvenienceSign.
export function drawConvenienceWindows(part,quad,brandId,{width=8,depth=6,height=4,faces=['front','right','back','left']}={}){
 if(!(width>0&&depth>0&&height>0))return false;
 for(const face of faces){
  const mesh=part('convenience-windows-'+brandId+'-'+face);
  const faceWidth=face==='front'||face==='back'?width:depth;
  const panels=Math.max(2,Math.min(40,Math.round(faceWidth/1.34/2)*2));
  const place=(u,y,out=0)=>{
   if(face==='front')return [u,y,depth/2+.024+out];
   if(face==='back')return [-u,y,-depth/2-.024-out];
   if(face==='left')return [-width/2-.024-out,y,u];
   return [width/2+.024+out,y,-u];
  };
  const rect=(a,b,y0,y1,tint,out=0)=>{
   if(b<=a||y1<=y0)return;
   quad(mesh,place(a-faceWidth/2,y0,out),place(b-faceWidth/2,y0,out),
     place(b-faceWidth/2,y1,out),place(a-faceWidth/2,y1,out),tint);
  };
  paintConvenienceGlazing(rect,{length:faceWidth,panels,bottom:0,top:height*.8,side:face});
 }
 return true;
}
