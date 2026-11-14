// Matsudo map data is a checked-in static JSON snapshot, not a live OSM API request.
const MAP_URL='./maps/data/matsudo.json';
const TILE_INDEX_URL='./maps/data/tiles-2km/index.json';
const TILE_ROOT='./maps/data/tiles-2km/';
// Future regional tests change this one ID only. JSON files remain untouched.
export const TEST_TILE_ID='0_0';
const facilityKeys=['shop','amenity','tourism','office','leisure','healthcare'];
function verify(map){
 if(map?.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements))throw Error('OSM形式不正');
 const buildings=map.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
 const roads=map.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
 const facilities=map.elements.filter(e=>facilityKeys.some(k=>e.tags?.[k])).length;
 if(buildings<10||roads<10||facilities<1)throw Error('地図JSONデータ不足');
 return map;
}
export async function loadMap({onLog=()=>{},signal,source='old'}={}){
 if(source!=='old'&&source!=='new')throw Error('不明な地図ソース: '+source);
 const start=performance.now();
 let url=MAP_URL,label='matsudo.json';
 if(source==='new'){
  onLog('JSON: 2km索引 index.json 読み込み開始');
  const indexResponse=await fetch(TILE_INDEX_URL,{cache:'no-cache',signal});
  onLog('JSON: 索引 HTTP '+indexResponse.status+' / '+Math.round(performance.now()-start)+'ms');
  if(!indexResponse.ok)throw Error('索引 HTTP '+indexResponse.status);
  const index=await indexResponse.json();
  if(!/^-?\d+_-?\d+$/.test(TEST_TILE_ID))throw Error('テストタイルIDが不正');
  const filename=index?.tiles?.[TEST_TILE_ID];
  const expected=new RegExp('^tile_'+TEST_TILE_ID+'_\\d{14}\\.json
 }
 onLog('JSON: '+label+' 読み込み開始');
 const response=await fetch(url,{cache:'no-cache',signal});
 onLog('JSON: '+label+' HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!response.ok)throw Error('JSON HTTP '+response.status);
 const map=verify(await response.json());
 if(source==='new'&&(map.tile?.id!==TEST_TILE_ID||map.tile?.sizeM!==2000))throw Error('タイルのID/サイズが不正: '+TEST_TILE_ID);
 onLog('JSON: '+label+' 検証PASS / 要素 '+map.elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
 return map;
}
);
  if(typeof filename!=='string'||!expected.test(filename))throw Error('2km索引のタイル指定が不正: '+TEST_TILE_ID);
  label=filename;url=TILE_ROOT+filename;
  onLog('JSON: タイル '+TEST_TILE_ID+' / '+filename+' / 索引タイル '+Object.keys(index.tiles).length+'件');
 }
 onLog('JSON: '+label+' 読み込み開始');
 const response=await fetch(url,{cache:'no-cache',signal});
 onLog('JSON: '+label+' HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!response.ok)throw Error('JSON HTTP '+response.status);
 const map=verify(await response.json());
 if(source==='new'&&(map.tile?.id!=='0_0'||map.tile?.sizeM!==2000))throw Error('中央タイルのID/サイズが不正');
 onLog('JSON: '+label+' 検証PASS / 要素 '+map.elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
 return map;
}
