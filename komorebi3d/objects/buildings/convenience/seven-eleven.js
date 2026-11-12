// Only sign design is brand-specific. Window and entrance geometry is shared.
const glyphs={
 E:['111','100','110','100','111'],
 L:['100','100','100','100','111'],
 V:['101','101','101','101','010'],
 N:['101','111','111','111','101']
};
const orange=0xf77d3a,red=0xb31c43,green=0x00774f;
const logoQuads=[
 // Fat orange cap of the 7, with a diagonal terminal.
 [[.08,.97],[.76,.97],[.57,.70],[.08,.70],orange],
 // Curved red stroke, built from just four trapezoids.
 [[.76,.97],[.97,1],[.97,.77],[.82,.75],red],
 [[.82,.75],[.97,.77],[.86,.62],[.72,.62],red],
 [[.72,.62],[.86,.62],[.74,.48],[.60,.48],red],
 [[.60,.48],[.74,.48],[.68,.30],[.52,.30],red],
 // Red stem below ELEVEN.
 [[.43,.03],[.64,.03],[.64,.27],[.43,.27],0xc3002f]
];
export const sevenEleven={
 id:'seven-eleven',
 names:['セブン-イレブン','7-eleven','seven-eleven'],
 sign:{background:0xf6f8fb,upper:orange,lower:red,textColor:green,label:'ELEVEN',glyphs,logo:{quads:logoQuads}},
 stripes:[
  {height:0.36,color:0xffffff},
  {height:0.22,color:0x008f45},
  {height:0.19,color:0xe63b35},
  {height:0.23,color:0xf58220}
 ]
};
