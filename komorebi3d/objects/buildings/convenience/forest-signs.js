// Forest-only convenience-store signs. No OpenStreetMap, level matching,
// store facade, or common.js dependency. Only brand sign data is shared.
import {familymart} from './familymart.js?v=convenience-sign-v1-20261112';
import {sevenEleven} from './seven-eleven.js?v=seven-sign-green-bands-v2-20261112';
import {ministop} from './ministop.js?v=ministop-white-logo-v2-20261112';
const FOREST_SIGN_BRANDS={
 'familymart':familymart,'seven-eleven':sevenEleven,'ministop':ministop
};

// x/y are local to an 8m-wide box; positive z faces the forest visitor.
// The sign occupies the upper 20% of the 4m storefront, like Matsudo.
export function addForestStoreSign(part,quad,brandId){
 const sign=FOREST_SIGN_BRANDS[brandId]?.sign;
 if(!sign)return false;
 const mesh=part('forest-store-sign-'+brandId);
 const width=8,panels=6,unit=width/panels,half=panels/2;
 const low=3.2,high=4,depth=3.012;
 const rect=(x0,x1,y0,y1,color,offset=0)=>{
  if(x1<=x0||y1<=y0)return;
  quad(mesh,[x0,y0,depth+offset],[x1,y0,depth+offset],
    [x1,y1,depth+offset],[x0,y1,depth+offset],color);
 };
 const seam=Math.min(.065,unit*.055);
 for(let k=0;k<panels;k++){
  const x0=-width/2+k*unit,x1=x0+unit;
  rect(x0,x1,low,high,sign.background);
  if(sign.bands){
   for(const band of sign.bands)
    rect(x0,x1,low+(high-low)*band.from,low+(high-low)*band.to,band.color,.006);
  }else{
   rect(x0,x1,high-(high-low)*.20,high,sign.upper,.006);
   rect(x0,x1,low,low+(high-low)*.11,sign.lower,.006);
  }
  if(k>0&&k!==half)rect(x0-seam/2,x0+seam/2,low,high,0xc3c9cb,.008);
 }
 const start=-unit,end=unit;
 rect(start,end,low,high,sign.logo?.background??sign.background,.012);
 if(!sign.logo){
  rect(start,end,high-(high-low)*.20,high,sign.upper,.018);
  rect(start,end,low,low+(high-low)*.11,sign.lower,.018);
 }
 if(sign.logo){
  const logoH=(high-low)*.91;
  const logoW=Math.min((end-start)*.9,logoH*(sign.logo.aspect??1.24));
  const lx=-logoW/2,ly=low+((high-low)-logoH)/2;
  const p=([x,y],z)=>[lx+x*logoW,ly+y*logoH,depth+z];
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
 return true;
}
