// Komorebi Forest Cafe v1: shared Renderer A/B 3D geometry at provisional coordinates.
const cafeOrigin=[CAFE_X,0,CAFE_Z];
const cafeFoundation=part('cafe-foundation',cafeOrigin);
const cafeFloor=part('cafe-floor',cafeOrigin);
const cafeSideWalls=part('cafe-side-walls',cafeOrigin);
const cafeBackWall=part('cafe-back-wall',cafeOrigin);
const cafeFrontWall=part('cafe-front-wall',cafeOrigin);
const cafeSideWindows=part('cafe-side-windows',cafeOrigin);
const cafeBackWindows=part('cafe-back-windows',cafeOrigin);
const cafeFrontGlass=part('cafe-front-glass',cafeOrigin);
const cafeFrontTrim=part('cafe-front-trim',cafeOrigin);
const cafeRoof=part('cafe-roof',cafeOrigin);
const cafeDeck=part('cafe-deck',cafeOrigin);
const cafeFurniture=part('cafe-furniture',cafeOrigin);
const cafeCounter=part('cafe-counter',cafeOrigin);
const cafeEquipment=part('cafe-equipment',cafeOrigin);
const cafeSigns=part('cafe-sign',cafeOrigin);
const woodLight=0xd2aa78,woodDeep=0x80563a,woodMedium=0xac7b50;
const cafeGlass=0x91c9d0,frameWood=0x76533c;
cube(cafeFoundation,0,-.14,0,14,.14,10,0xb6aea0);
cube(cafeFloor,0,0,0,13.8,.13,9.8,0xbf945f);
for(let i=0;i<21;i++)cube(cafeFloor,-6.55+i*.66,.13,0,.035,.012,9.76,0xa67d54);
// Wide glass spans between floor-level timber sills and overhead wooden beams.
for(const x of [-6.96,6.96]){
 cube(cafeSideWalls,x,0,0,.19,1.05,10,woodLight);
 cube(cafeSideWalls,x,2.98,0,.19,.7,10,woodLight);
 for(const z of [-3.75,-1.25,1.25,3.75]){
  cube(cafeSideWindows,x,1.05,z,.075,1.93,2.37,cafeGlass);
  cube(cafeSideWalls,x,1.02,z-1.23,.25,2.01,.15,frameWood);
 }
 for(const z of [-5,0,5])cube(cafeSideWalls,x,0,z,.26,3.68,.27,frameWood);
}
cube(cafeBackWall,0,0,-4.96,14,.98,.18,woodLight);
cube(cafeBackWall,0,3.03,-4.96,14,.65,.18,woodLight);
for(const x of [-5.25,-1.75,1.75,5.25]){
 cube(cafeBackWindows,x,.98,-4.96,3.37,2.05,.09,cafeGlass);
 cube(cafeBackWall,x,1.96,-5.045,.06,2.04,.1,0xcbd6bd);
}
for(const x of [-7,-3.5,0,3.5,7])cube(cafeBackWall,x,0,-4.97,.21,3.68,.25,frameWood);
// Front: two glazed wall sections flanking a genuinely open 3m wide entry.
for(const x of [-4.25,4.25]){
 cube(cafeFrontWall,x,0,4.96,5.5,.98,.2,woodLight);
 cube(cafeFrontWall,x,3.0,4.96,5.5,.68,.2,woodLight);
 cube(cafeFrontGlass,x,.98,4.97,5.18,2.02,.09,cafeGlass);
 cube(cafeFrontTrim,x,1.97,5.08,.08,2.03,.16,0xe3d8b5);
 for(const xx of [x-2.62,x+2.62])cube(cafeFrontTrim,xx,0,5.03,.2,3.67,.25,frameWood);
}
cube(cafeFrontWall,0,2.78,4.95,3,.9,.2,woodLight);
for(const x of [-1.5,1.5])cube(cafeFrontTrim,x,0,5.06,.18,2.9,.3,frameWood);
cube(cafeFrontTrim,0,2.86,5.07,3.25,.16,.3,frameWood);
for(const x of [-7,7])for(const z of [-5,5])cube(cafeSideWalls,x,0,z,.28,3.7,.28,frameWood);
// Gabled roof hidden when indoors; building remains fully visible outside.
slab(cafeRoof,[-7.55,3.69,5.55],[0,5.95,5.55],[0,5.95,-5.55],[-7.55,3.69,-5.55],.24,0x6d5847);
slab(cafeRoof,[0,5.95,5.55],[7.55,3.69,5.55],[7.55,3.69,-5.55],[0,5.95,-5.55],.24,0x6d5847);
tri(cafeRoof,[-7,3.65,5],[7,3.65,5],[0,5.95,5],0xb78355);
tri(cafeRoof,[7,3.65,-5],[-7,3.65,-5],[0,5.95,-5],0xb78355);
cube(cafeRoof,0,5.92,0,.2,.14,11.2,0x453f37);
// Coffee pictogram on a timber sign at the entrance.
cube(cafeSigns,0,3.18,5.22,2.65,.55,.17,0x6a4a37);
cube(cafeSigns,0,3.36,5.33,.73,.035,.025,0xf1e8ca);
cube(cafeSigns,0,3.03,5.34,.62,.06,.035,0xf1e8ca);
cube(cafeSigns,.42,3.12,5.35,.08,.17,.035,0xf1e8ca);
for(const x of [-.2,0,.2])cube(cafeSigns,x,3.45,5.35,.035,.13,.035,0xf1e8ca);
// 10x4m wood deck flush with the interior floor and free central walkway.
cube(cafeDeck,0,0,7,10,.13,4,0xa7774f);
for(let i=0;i<13;i++)cube(cafeDeck,0,.13,5.2+i*.29,9.78,.012,.025,i%2?0x926540:0xbd9160);
for(const x of [-4.95,4.95])cube(cafeDeck,x,0,7,.14,.18,4,0x73543d);
function makeCafeTable(m,x,z,w=1.45,d=1.2){
 cube(m,x,.72,z,w,.12,d,0xb98656);
 for(const dx of [-w*.35,w*.35])for(const dz of [-d*.34,d*.34])
  cube(m,x+dx,.13,z+dz,.11,.59,.11,woodDeep);
}
function makeCafeChair(m,x,z){
 cube(m,x,.39,z,.56,.09,.55,0xa87951);
 for(const dx of [-.22,.22])cube(m,x+dx,.11,z,.075,.28,.08,woodDeep);
 cube(m,x,.45,z+.27,.58,.58,.09,0xa87951);
}
// Four interior tables + window-facing seats.
for(const z of [-1.2,1.8])for(const x of [-3.15,1.75]){
 makeCafeTable(cafeFurniture,x,z);
 makeCafeChair(cafeFurniture,x,z-1.05);
 makeCafeChair(cafeFurniture,x,z+1.05);
}
// Service counter on the right, with open preparation area behind it.
cube(cafeCounter,4.25,0,.5,1.15,1.08,5,woodMedium);
cube(cafeCounter,4.25,1.08,.5,1.32,.12,5.13,0xe2c59b);
cube(cafeCounter,5.8,0,.2,1.35,.85,4.8,0x96704c);
cube(cafeCounter,5.8,.85,.2,1.48,.1,4.9,0xd8b98b);
cube(cafeCounter,-1.65,0,-3.88,7.7,.89,.7,0x9e714b);
cube(cafeCounter,-1.65,.89,-3.88,7.8,.1,.76,0xd0a377);
for(const x of [-4.35,-1.85,.65])makeCafeChair(cafeFurniture,x,-2.85);
cube(cafeCounter,3.83,0,-2.27,1.3,.86,1.25,woodMedium);
cube(cafeEquipment,3.83,.86,-2.27,1.29,.46,1.24,0xa3cbd0);
cube(cafeEquipment,3.83,1.32,-2.27,1.42,.08,1.35,0x66513a);
for(const x of [3.5,3.82,4.12])ellipsoid(cafeEquipment,x,1.0,-2.28,.14,.075,.13,0xe9d6a4);
cube(cafeEquipment,4.0,1.2,2.25,.55,.22,.47,0x4c5450);
cube(cafeEquipment,4.0,1.43,2.25,.45,.13,.38,0xd9cfb3);
cube(cafeEquipment,5.8,.95,.3,.77,.68,.65,0x5c625f);
cube(cafeEquipment,5.8,1.54,.36,.69,.13,.5,0x3a4241);
for(const x of [5.54,6.05])cube(cafeEquipment,x,1.35,.65,.13,.42,.1,0xd1d8cf);
for(const y of [1.7,2.35])cube(cafeEquipment,6.58,y,.4,.42,.095,4.5,0x875d3b);
for(const z of [-1.3,.4,1.8]){cube(cafeEquipment,6.4,1.8,z,.17,.38,.28,0xe9d8b2);cube(cafeEquipment,6.42,2.45,z,.15,.28,.26,0x71966c);}
for(const z of [-1.8,.1,2.0]){cube(cafeEquipment,4.25,2.93,z,.06,.34,.06,0x74604d);ellipsoid(cafeEquipment,4.25,2.61,z,.4,.22,.4,0xe9cb97,6,8);}
for(const x of [-3.8,0,2.5]){cube(cafeEquipment,x,3.25,.2,.055,.25,.055,0x7b6145);ellipsoid(cafeEquipment,x,2.95,.2,.37,.22,.37,0xe9d8b0,6,9);}
// Outdoor tables leave direct open path to the 3m doorway.
for(const x of [-3.1,3.1]){
 makeCafeTable(cafeFurniture,x,7.05,1.4,1.3);
 makeCafeChair(cafeFurniture,x,6.05);
 makeCafeChair(cafeFurniture,x,8.1);
}
