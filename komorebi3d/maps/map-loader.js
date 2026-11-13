const LAT=35.78444,LON=139.90061,dlat=250/111320,dlon=250/(111320*Math.cos(LAT*Math.PI/180));
const bbox=[LAT-dlat,LON-dlon,LAT+dlat,LON+dlon].map(x=>x.toFixed(6)).join(',');
const keys=['shop','amenity','tourism','office','leisure','healthcare'];
const query='[out:json][timeout:8];(way["building"]('+bbox+');way["highway"]('+bbox+');way["railway"]('+bbox+');'+keys.map(k=>'nwr["'+k+'"]('+bbox+');').join('')+');out geom;';
function verify(map){
 if(map?.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements))throw Error('OSM形式不正');
 const buildings=map.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
 const roads=map.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
 const facilities=map.elements.filter(e=>keys.some(k=>e.tags?.[k])).length;
 if(buildings<10||roads<10||facilities<1)throw Error('OSMデータ不足');
 return map;
}
async function json(url,log=()=>{}){
 const start=performance.now();log('JSON: リクエスト開始');
 const response=await fetch(url,{cache:'no-cache'});
 log('JSON: HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!response.ok)throw Error('JSON HTTP '+response.status);
 const map=verify(await response.json());
 log('JSON: 検証PASS / 要素 '+map.elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
 return map;
}
async function osm(log=()=>{}){
 const controller=new AbortController(),start=performance.now(),timer=setTimeout(()=>controller.abort(),8000);
 log('OSM: overpass-api.de / GET / タイムアウト8秒');
 try{
  const response=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{method:'GET',signal:controller.signal,cache:'no-store'});
  log('OSM: HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
  if(!response.ok)throw Error('Overpass HTTP '+response.status);
  const raw=await response.json();
  log('OSM: 応答解析 '+Math.round(performance.now()-start)+'ms / 生要素 '+(Array.isArray(raw.elements)?raw.elements.length:'なし')+'件');
  if(raw.remark)throw Error('Overpass: '+String(raw.remark).slice(0,180));
  if(!Array.isArray(raw.elements))throw Error('Overpass形式不正');
  const elements=[];
  for(const e of raw.elements){
   const tags=e.tags||{};
   if(e.type==='way'&&e.geometry?.length>=2)elements.push({type:'way',id:e.id,version:e.version??null,tags,geometry:e.geometry});
   else if(e.type==='node'&&keys.some(k=>tags[k])&&Number.isFinite(e.lat)&&Number.isFinite(e.lon))elements.push({type:'node',id:e.id,version:e.version??null,tags,lat:e.lat,lon:e.lon});
   else if(e.type==='relation'&&keys.some(k=>tags[k]))elements.push({type:'relation',id:e.id,version:e.version??null,tags,members:e.members||[]});
  }
  const map=verify({source:'OpenStreetMap contributors',license:'ODbL-1.0',center:[LAT,LON],bbox,elements});
  log('OSM: 検証PASS / 要素 '+elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
  return map;
 }catch(error){
  log('OSM: 失敗 '+(controller.signal.aborted?'8秒タイムアウト / ':'')+(error.name||'Error')+' / '+String(error.message||error)+' / '+Math.round(performance.now()-start)+'ms');
  throw error;
 }finally{clearTimeout(timer);}
}
export async function loadMap({mode='auto',url='./maps/data/matsudo.json',onLog=()=>{}}={}){
 if(!['auto','osm','json'].includes(mode))throw RangeError('Invalid map mode');
 onLog('モード: '+mode);
 if(mode==='json')return {map:await json(url,onLog),source:'json',fallbackError:null};
 try{return {map:await osm(onLog),source:'osm',fallbackError:null};}
 catch(error){
  if(mode==='osm')throw error;
  onLog('自動切替: OSM失敗 → JSON');
  return {map:await json(url,onLog),source:'json',fallbackError:String(error.message||error)};
 }
}
