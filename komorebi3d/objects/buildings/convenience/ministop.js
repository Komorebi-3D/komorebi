// Brand-specific sign only; store glass and two-bay entrance are in common.js.
const blue=0x0875da,yellow=0xffd900,red=0xf23f32,white=0xffffff;
const glyphs={
 M:['101','111','111','101','101'],
 I:['111','010','010','010','111'],
 N:['101','111','111','111','101'],
 S:['111','100','111','001','111'],
 T:['111','010','010','010','010'],
 O:['111','101','101','101','111'],
 P:['110','101','110','100','100']
};
// Short thick-line quads recreate the blue storefront-shaped symbol behind
// MINISTOP, with a white rim. All coordinates are inside the logo panel.
function stroke(a,b,width,color,depth){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
 const nx=-dy/len*width/2,ny=dx/len*width/2;
 return [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],
         [b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny],color,depth];
}
const outline=[
 [[.07,.38],[.07,.55]],[[.07,.55],[.22,.89]],
 [[.22,.89],[.33,.72]], // stylized house roof
 [[.07,.38],[.07,.17]],[[.07,.17],[.86,.17]],
 [[.86,.17],[.94,.33]],[[.94,.33],[.97,.51]],
 [[.97,.51],[.93,.68]],[[.93,.68],[.84,.79]],
 [[.84,.79],[.76,.82]]
];
const logoQuads=[
 ...outline.map(([a,b])=>stroke(a,b,.082,white,.031)),
 ...outline.map(([a,b])=>stroke(a,b,.042,blue,.035))
];
export const ministop={
 id:'ministop',
 names:['ミニストップ','ministop'],
 sign:{
  background:white,
  bands:[
   {from:.68,to:.96,color:yellow},
   {from:.29,to:.56,color:blue},
   {from:.07,to:.18,color:red}
  ],
  label:'MINISTOP',glyphs,textColor:blue,
  logo:{background:yellow,aspect:3.2,wordmark:true,quads:logoQuads}
 },
 stripes:[
  {height:0.65,color:0xf5cc22},
  {height:0.225,color:0x1769b3},
  {height:0.125,color:0xffffff}
 ]
};
