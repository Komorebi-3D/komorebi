const origin=[4.5,0,-4.5],base=part('foundation',origin),walls=part('walls',origin),frontWall=part('front-wall',origin),siding=part('siding',origin),roof=part('roof',origin),windows=part('windows',origin),door=part('door',origin),porch=part('porch',origin),chimney=part('chimney',origin),floors=part('floorBase',origin),timber=0xb98a5b,dark=0x654832,glass=0x83b8c1,stone=0x96938b;cube(base,0,-.3,0,14,.35,10,stone);cube(floors,0,-.09,0,13.6,.16,9.6,0xa17b53);for(const x of [-3.95,3.95])cube(frontWall,x,0,4.9,6.1,6.2,.2,timber);cube(frontWall,0,2.6,4.9,1.8,3.6,.2,timber);cube(walls,0,0,-4.9,14,6.2,.2,timber);for(const x of [-6.9,6.9])cube(walls,x,0,0,.2,6.2,10,timber);for(let i=0;i<20;i++){const y=.15+i*.3,c=[0xc59a6b,0xb88a59,0xc39868,0xb08252][i%4];cube(siding,0,y,-5.07,14,.245,.04,c);for(const x of [-7.04,7.04])cube(siding,x,y,0,.04,.245,10,c);if(y>=2.6)cube(frontWall,0,y,5.07,14,.245,.04,c);else for(const x of [-3.95,3.95])cube(frontWall,x,y,5.07,6.1,.245,.04,c)}for(const x of [-7,7])for(const z of [-5,5])cube(siding,x,0,z,.24,6.2,.24,dark);slab(roof,[-7.6,6.2,5.6],[0,8.8,5.6],[0,8.8,-5.6],[-7.6,6.2,-5.6],.3,0x795144);slab(roof,[0,8.8,5.6],[7.6,6.2,5.6],[7.6,6.2,-5.6],[0,8.8,-5.6],.3,0x795144);tri(roof,[-7,6.2,5],[7,6.2,5],[0,8.8,5],0x946a46);tri(roof,[7,6.2,-5],[-7,6.2,-5],[0,8.8,-5],0x946a46);for(let i=1;i<9;i++){const t=i/9;for(const s of [-1,1])cube(roof,s*7.6*(1-t),6.2+2.6*t+.015,0,.055,.04,11.2,0x503b35)}function windowFront(x,y,z,w,h){cube(windows,x,y,z,w,h,.08,0x45646a);cube(windows,x,y+.05,z+.065,w-.22,h-.22,.055,glass);for(const xx of [x-w/2,x+w/2])cube(windows,xx,y,z+.14,.16,h+.22,.2,dark);for(const yy of [y,y+h])cube(windows,x,yy,z+.14,w+.22,.16,.2,dark);cube(windows,x,y+h/2,z+.2,w,.09,.1,0xd4a774);cube(windows,x,y,z+.2,.09,h,.1,0xd4a774);cube(windows,x,y-.14,z+.2,w+.4,.12,.3,stone)}for(const y of [1.25,4.35])for(const x of [-5.05,-2.6,2.6,5.05])windowFront(x,y,5.18,1.35,1.5);for(const y of [1.25,4.35])for(const x of [-4.5,0,4.5])windowFront(x,y,-5.18,1.6,1.5);// Door stays open: the existing frame remains, the door leaf is omitted.for(const x of [-.95,.95])cube(door,x,0,5.12,.12,2.75,.16,dark);cube(door,0,2.67,5.13,2.12,.16,.16,dark);cube(porch,0,-.14,6.25,4.5,.22,2.5,stone);for(let i=0;i<10;i++)cube(porch,-2+i*.44,.1,6.25,.4,.1,2.25,0xa5794b);for(const x of [-2,2])cube(porch,x,.1,7.32,.19,3.15,.19,dark);cube(porch,0,3.25,6.25,4.7,.23,2.8,0x60463b);cube(porch,0,-.34,7.7,2.4,.22,.65,stone);cube(chimney,4.7,5.4,-2.8,1.4,3.4,1.4,stone);for(let i=0;i<9;i++){const y=5.5+i*.36;cube(chimney,4.7,y,-2.8,1.43,.045,1.43,0x696760);cube(chimney,4.7+(i%2?.28:-.28),y+.1,-2.07,.045,.22,.045,0x77746b)}cube(chimney,4.7,8.8,-2.8,1.7,.22,1.7,0x655f59);
// Walkable two-storey interior, separate meshes so both renderers can hide upper levels.
const secondFloor=part('interior-upper-floor',origin);
cube(secondFloor,0,3.28,0,13.55,.16,9.55,0xc99a67);
const staircase=part('interior-stairs',origin);
for(let i=0;i<17;i++){const z=3.95-i*.45;cube(staircase,4.85, i*.197,z,2.05,.195,.46, i%2?0xb98a58:0xc69a67);}
for(const x of [3.72,5.98])cube(staircase,x,.2,.45,.13,3.5,.13,0x6e4d35);
const furniture=part('interior-furniture',origin);
cube(furniture,-3.9,0,-1.8,2.7,.55,1.1,0x8c6247);
cube(furniture,-3.9,.55,-1.8,2.7,.3,1.1,0xd9b89a);
cube(furniture,-3.9,.55,-2.3,2.7,1,.25,0x94674d);
cube(furniture,-1.15,0,-2.1,1.5,.8,.85,0xb68a5b);
cube(furniture,-4.5,0,-4.25,3.1,.85,1.35,0x8a6545);
cube(furniture,-4.5,.85,-4.25,3.1,.12,1.35,0xe8d6b1);
cube(furniture,1.4,0,-4.15,2.3,.85,1.3,0xa67b4f);
cube(furniture,1.4,.85,-4.15,2.3,.1,1.3,0xe4d0a6);
const bedroom=part('interior-bedroom',origin);
cube(bedroom,-3.8,3.44,-2.1,3.5,.45,4.25,0x8d644c);
cube(bedroom,-3.8,3.9,-2.1,3.15,.35,3.85,0xf2e6d1);
cube(bedroom,-3.8,4.25,-3.25,2.65,.18,1.05,0xf8f4e7);
cube(bedroom,-3.8,4.25,-.8,3.0,.11,2.25,0xb6c6a1);
cube(bedroom,-1.1,3.44,-3.3,.95,.65,.95,0x9e744f);
cube(bedroom,1.35,3.44,-2.1,2.1,.85,.8,0xa47a54);
cube(bedroom,1.35,4.29,-2.1,2.1,.09,.8,0xe0bd8b);
const upperRug=part('interior-bedroom-rug',origin);
cube(upperRug,-.3,3.45,1.5,3.4,.025,2.1,0xb9a7a1);
