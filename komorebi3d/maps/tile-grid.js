// Read-only display-coordinate helper for the fixed tile grid in split-map-tiles.py.
// EPSG:6677 = JGD2011 / Japan Plane Rectangular CS IX (GRS80).
// This module never alters the JSON tile or its OSM coordinates.
const ORIGIN_LAT=35.78444,ORIGIN_LON=139.90061,TILE_SIZE_M=2000;
const DEG=Math.PI/180,A=6378137,F=1/298.257222101;
const E2=F*(2-F),E4=E2*E2,E6=E4*E2,EP2=E2/(1-E2),K0=.9999;
const LAT0=36*DEG,LON0=(139+50/60)*DEG;
function meridianArc(phi){
 return A*((1-E2/4-3*E4/64-5*E6/256)*phi
  -(3*E2/8+3*E4/32+45*E6/1024)*Math.sin(2*phi)
  +(15*E4/256+45*E6/1024)*Math.sin(4*phi)
  -(35*E6/3072)*Math.sin(6*phi));
}
const M0=meridianArc(LAT0);
function project(lon,lat){
 const phi=lat*DEG,lambda=lon*DEG,sin=Math.sin(phi),cos=Math.cos(phi);
 const n=A/Math.sqrt(1-E2*sin*sin);
 const t=Math.tan(phi)**2,c=EP2*cos*cos,v=(lambda-LON0)*cos;
 return {
  east:K0*n*(v+(1-t+c)*v**3/6
   +(5-18*t+t*t+72*c-58*EP2)*v**5/120),
  north:K0*(meridianArc(phi)-M0+n*Math.tan(phi)*(
   v*v/2+(5-t+9*c+4*c*c)*v**4/24
   +(61-58*t+t*t+600*c-330*EP2)*v**6/720))
 };
}
const origin=project(ORIGIN_LON,ORIGIN_LAT);
function inverse(east,north){
 let lat=ORIGIN_LAT+(north-origin.north)/111320;
 let lon=ORIGIN_LON+(east-origin.east)/(111320*Math.cos(ORIGIN_LAT*DEG));
 for(let i=0;i<6;i++){
  const p=project(lon,lat),ex=east-p.east,ny=north-p.north;
  if(Math.max(Math.abs(ex),Math.abs(ny))<1e-8)break;
  const d=1e-5,pLon=project(lon+d,lat),pLat=project(lon,lat+d);
  const a=(pLon.east-p.east)/d,b=(pLat.east-p.east)/d;
  const c=(pLon.north-p.north)/d,q=(pLat.north-p.north)/d;
  const det=a*q-b*c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-12)throw Error('タイル座標の逆変換に失敗');
  lon+=(q*ex-b*ny)/det;
  lat+=(-c*ex+a*ny)/det;
 }
 return {latitude:lat,longitude:lon};
}
export function tileCenterWgs84(tile){
 if(!tile||!Number.isSafeInteger(tile.gridX)||!Number.isSafeInteger(tile.gridY)
  ||tile.id!==`${tile.gridX}_${tile.gridY}`||tile.sizeM!==TILE_SIZE_M)
  throw Error('2kmタイルのグリッド情報が不正');
 // Keep the Matsudo 0_0 projection exactly identical to the previous build.
 if(tile.gridX===0&&tile.gridY===0)
  return {latitude:ORIGIN_LAT,longitude:ORIGIN_LON};
 return inverse(origin.east+tile.gridX*TILE_SIZE_M,
  origin.north+tile.gridY*TILE_SIZE_M);
}
