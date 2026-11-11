// Static OSM source today; can be replaced by an API-backed loader later.
export async function loadMap(url='./maps/data/matsudo.json'){
 const response=await fetch(url,{cache:'no-cache'});
 if(!response.ok)throw new Error('OSMの読み込み失敗 HTTP '+response.status);
 const map=await response.json();
 if(map.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements)||map.elements.length<20)
  throw new Error('OSMデータの形式が不正');
 return map;
}
