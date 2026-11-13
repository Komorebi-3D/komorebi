const LAT=35.78444,LON=139.90061,dlat=250/111320,dlon=250/(111320*Math.cos(LAT*Math.PI/180));
const bbox=[LAT-dlat,LON-dlon,LAT+dlat,LON+dlon].map(x=>x.toFixed(6)).join(',');
const keys=['shop','amenity','tourism','office','leisure','healthcare'];
const query='[out:json][timeout:30];(way["building"]('+bbox+');way["highway"]('+bbox+');way["railway"]('+bbox+');'+keys.map(k=>'nwr["'+k+'"]('+bbox+');').join('')+');out geom;';
function verify(map){
 if(map?.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements))throw Error('OSM形式不正');
 const buildings=map.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
 const roads=map.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
 const facilities=map.elements.filter(e=>keys.some(k=>e.tags?.[k])).length;
 if(buildings<10||roads<10||facilities<1)throw Error('OSMデータ不足');
 return map;
}
async function json(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('JSON HTTP '+response.status);return verify(await response.json());}
async function osm(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('Overpass HTTP '+response.status);
  const raw=await response.json();if(!Array.isArray(raw.elements))throw Error('Overpass形式不正');
  const elements=[];
  for(const e of raw.elements){
   const tags=e.tags||{};
   if(e.type==='way'&&e.geometry?.length>=2)elements.push({type:'way',id:e.id,version:e.version??null,tags,geometry:e.geometry});
   else if(e.type==='node'&&keys.some(k=>tags[k])&&Number.isFinite(e.lat)&&Number.isFinite(e.lon))elements.push({type:'node',id:e.id,version:e.version??null,tags,lat:e.lat,lon:e.lon});
   else if(e.type==='relation'&&keys.some(k=>tags[k]))elements.push({type:'relation',id:e.id,version:e.version??null,tags,members:e.members||[]});
  }
  return verify({source:'OpenStreetMap contributors',license:'ODbL-1.0',center:[LAT,LON],bbox,elements});
 }finally{clearTimeout(timer);}
}
export async function loadMap({mode='auto',url='./maps/data/matsudo.json'}={}){
 if(!['auto','osm','json'].includes(mode))throw RangeError('Invalid map mode');
 if(mode==='json')return {map:await json(url),source:'json',fallbackError:null};
 try{return {map:await osm(),source:'osm',fallbackError:null};}
 catch(error){if(mode==='osm')throw error;return {map:await json(url),source:'json',fallbackError:String(error.message||error)};}
}
