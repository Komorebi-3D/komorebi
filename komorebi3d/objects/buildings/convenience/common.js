// Shared renderer-independent convenience-store sign and roof geometry.
// This module knows dimensions and brand styles, never OSM tags or POI matching.
import {CONVENIENCE_DOOR_WIDTH_M,CONVENIENCE_TARGET_PANEL_WIDTH_M} from './const.js?v=convenience-one-sign-v3-20261112';
import {familymart} from './familymart.js?v=convenience-sign-v1-20261112';
import {sevenEleven} from './seven-eleven.js?v=seven-sign-green-bands-v2-20261112';
import {ministop} from './ministop.js?v=ministop-white-logo-v2-20261112';
const FOREST_SIGN_BRANDS={
 'familymart':familymart,'seven-eleven':sevenEleven,'ministop':ministop
};

// Each footprint edge is an independent interval [0,length]. No corner posts or
// offsets: every glass panel terminates at an existing polygon vertex.
// Only entrance edges reserve a fixed-width centre segment for the sliding doors/logo.
export function conveniencePanelLayout(length,{entrance=false,doorWidth=CONVENIENCE_DOOR_WIDTH_M,targetWidth=CONVENIENCE_TARGET_PANEL_WIDTH_M}={}){
 if(!Number.isFinite(length)||length<=0)return {segments:[],entrance:false,door:null};
 const withDoor=entrance&&length>=doorWidth-1e-7;
 const segments=[];
 const divide=(start,end)=>{
  const span=end-start;
  if(span<=1e-8)return;
  const count=Math.max(1,Math.round(span/targetWidth));
  for(let i=0;i<count;i++)segments.push({start:start+span*i/count,end:start+span*(i+1)/count,door:false});
 };
 if(withDoor){
  const left=(length-doorWidth)/2,right=left+doorWidth;
  divide(0,left);
  segments.push({start:left,end:right,door:true});
  divide(right,length);
  return {segments,entrance:true,door:{start:left,end:right}};
 }
 divide(0,length);
 return {segments,entrance:false,door:null};
}

// Unified sign strip: the logo is exactly the same fixed-width interval as
// the opening underneath. Supports arbitrary planar OSM edges and Forest boxes.
export function paintConvenienceSign(rect,quad,point,sign,{length,bottom,top,entrance=false}){
 if(!sign||!(length>0&&top>bottom))return false;
 const layout=conveniencePanelLayout(length,{entrance});
 const bandHeight=top-bottom;
 const frame=.065;
 // One regular sign directly above each window.
 for(const seg of layout.segments){
  rect(seg.start,seg.end,bottom,top,sign.background);
  if(sign.bands){
   for(const band of sign.bands)
    rect(seg.start,seg.end,bottom+bandHeight*band.from,bottom+bandHeight*band.to,band.color,.006);
  }else{
   rect(seg.start,seg.end,top-bandHeight*.20,top,sign.upper,.006);
   rect(seg.start,seg.end,bottom,bottom+bandHeight*.11,sign.lower,.006);
  }
 }
 for(let i=1;i<layout.segments.length;i++){
  const boundary=layout.segments[i].start;
  if(layout.door&&Math.abs(boundary-length/2)<.00001)continue;
  rect(boundary-frame/2,boundary+frame/2,bottom,top,0xc3c9cb,.008);
 }
 if(!layout.door)return true;
 const start=layout.door.start,end=layout.door.end;
 rect(start,end,bottom,top,sign.logo?.background??sign.background,.012);
 if(!sign.logo){
  rect(start,end,top-bandHeight*.2,top,sign.upper,.018);
  rect(start,end,bottom,bottom+bandHeight*.11,sign.lower,.018);
 }
 if(sign.logo){
  const logoH=bandHeight*.91,logoW=Math.min((end-start)*.9,logoH*(sign.logo.aspect??1.24));
  const lx=length/2-logoW/2,ly=bottom+(bandHeight-logoH)/2;
  for(const [a,b,c,d,tint,offset=.033] of sign.logo.quads)
   quad(point(lx+a[0]*logoW,ly+a[1]*logoH,offset),
     point(lx+b[0]*logoW,ly+b[1]*logoH,offset),
     point(lx+c[0]*logoW,ly+c[1]*logoH,offset),
     point(lx+d[0]*logoW,ly+d[1]*logoH,offset),tint);
 }
 const pixels=[];
 for(const ch of sign.label||'')if(sign.glyphs?.[ch])pixels.push(sign.glyphs[ch]);
 if(pixels.length){
  const cols=pixels.length*4-1;
  const pixel=sign.logo?.wordmark?
   Math.min((end-start)*.84/cols,bandHeight*.91*.35/5):
   sign.logo?Math.min(bandHeight*.91*1.24*1.05/cols,bandHeight*.91*.18/5):
   Math.min((end-start)*.90/cols,bandHeight*.43/5);
  const left=length/2-cols*pixel/2;
  const baseline=sign.logo?.wordmark?bottom+bandHeight*.30:
   sign.logo?bottom+bandHeight*(.045+.91*.31):bottom+bandHeight*.30;
  for(let i=0;i<pixels.length;i++)for(let j=0;j<5;j++)for(let k=0;k<3;k++)
   if(pixels[i][j][k]==='1')
    rect(left+(i*4+k)*pixel,left+(i*4+k+.89)*pixel,
     baseline+(4-j)*pixel,baseline+(4-j+.89)*pixel,sign.textColor,sign.logo?.05:.03);
 }
 return true;
}

// Forest-box facade is one special case of the generic edge painter.
export function drawConvenienceSign(part,quad,brandId,{width=8,depth=6,height=4,faces=['front']}={}){
 const sign=FOREST_SIGN_BRANDS[brandId]?.sign;
 if(!sign)return false;
 for(const face of faces){
  const mesh=part('convenience-sign-'+brandId+'-'+face);
  const length=face==='front'||face==='back'?width:depth;
  const point=(u,y,out=0)=>{
   if(face==='front')return [u-length/2,y,depth/2+.012+out];
   if(face==='back')return [length/2-u,y,-depth/2-.012-out];
   if(face==='left')return [-width/2-.012-out,y,u-length/2];
   return [width/2+.012+out,y,length/2-u];
  };
  const rect=(u0,u1,y0,y1,color,out=0)=>{
   if(u1<=u0||y1<=y0)return;
   quad(mesh,point(u0,y0,out),point(u1,y0,out),point(u1,y1,out),point(u0,y1,out),color);
  };
  paintConvenienceSign(rect,(a,b,c,d,t)=>quad(mesh,a,b,c,d,t),point,sign,
   {length,bottom:height*.8,top:height,entrance:face==='front'});
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
export function paintConvenienceGlazing(rect,{length,bottom=0,top,side='front',backWall=false,doorWidth=CONVENIENCE_DOOR_WIDTH_M}){
 if(!(length>0&&top>bottom))return false;
 const layout=conveniencePanelLayout(length,{entrance:side==='front',doorWidth});
 const frame=.065,glassBottom=bottom+.06,glass=0x415c6a,frameColor=0x273b47;
 for(const seg of layout.segments)
  rect(seg.start,seg.end,bottom,top,backWall&&side==='back'?0xc4c9c7:glass);
 for(let i=1;i<layout.segments.length;i++){
  const x=layout.segments[i].start;
  rect(x-frame/2,x+frame/2,glassBottom,top,frameColor,.008);
 }
 if(layout.door){
  const {start,end}=layout.door;
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
  paintConvenienceGlazing(rect,{length:faceWidth,bottom:0,top:height*.8,side:face});
 }
 return true;
}
