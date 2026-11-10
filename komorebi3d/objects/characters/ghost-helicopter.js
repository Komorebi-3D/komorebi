// Shared low-poly character asset: an unanimated, pilotless ghost helicopter.
// Game/world code owns opacity, position, flight motion and camera.
const ghostHeli=part('ghost-helicopter');
ellipsoid(ghostHeli,0,1.08,0,.66,.69,.62,0xe9f8fb,9,12);
ellipsoid(ghostHeli,0,.70,.04,.59,.39,.61,0xd5edf3,8,12);
for(const x of [-.24,.24])ellipsoid(ghostHeli,x,1.23,-.55,.095,.14,.065,0x273847,6,8);
ellipsoid(ghostHeli,0,.99,-.61,.09,.06,.05,0x4d6878,5,8);
// Compact fixed rotor and tail: simple geometry, no animation.
cube(ghostHeli,0,1.80,0,.08,.20,.08,0x7b9eaa);
cube(ghostHeli,0,1.99,0,2.12,.055,.15,0x64808d);
cube(ghostHeli,0,1.18,.77,.24,.20,1.04,0xd5edf3);
cube(ghostHeli,0,1.18,1.39,.07,.75,.07,0x64808d);
cube(ghostHeli,0,.83,1.46,.65,.07,.07,0x64808d);
for(const x of [-.43,.43])cube(ghostHeli,x,.25,0,.07,.07,1.10,0x78949c);
