// Matsudo map data is a checked-in static JSON snapshot, not a live OSM API request.
const MAP_URL='./maps/data/matsudo.json';
const facilityKeys=['shop','amenity','tourism','office','leisure','healthcare'];
function verify(map){
 if(map?.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements))throw Error('OSM形式不正');
 const buildings=map.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
 const roads=map.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
 const facilities=map.elements.filter(e=>facilityKeys.some(k=>e.tags?.[k])).length;
 if(buildings<10||roads<10||facilities<1)throw Error('地図JSONデータ不足');
 return map;
}
export async function loadMap({onLog=()=>{},signal}={}){
 const start=performance.now();onLog('JSON: matsudo.json 読み込み開始');
 const response=await fetch(MAP_URL,{cache:'no-cache',signal});
 onLog('JSON: HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!response.ok)throw Error('JSON HTTP '+response.status);
 const map=verify(await response.json());
 onLog('JSON: 検証PASS / 要素 '+map.elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
 return map;
}
