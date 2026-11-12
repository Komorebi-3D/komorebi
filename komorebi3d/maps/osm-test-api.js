// Development OSM server ONLY. Never use live OSM endpoints here.
// OAuth 2.0 Authorization Code + PKCE for a public browser application.
export const OSM_TEST_ORIGIN='https://master.apis.dev.openstreetmap.org';
const API=OSM_TEST_ORIGIN+'/api/0.6';
const TOKEN_KEY='komorebi:osm-test:token';
const AUTH_KEY='komorebi:osm-test:oauth';
const ERROR_KEY='komorebi:osm-test:error';
const types=new Set(['node','way','relation']);
const facilities=['shop','amenity','office','tourism','healthcare','leisure'];
const redirectUri=()=>location.origin+location.pathname;

function randomUrlSafe(bytes=32){
 const data=new Uint8Array(bytes);
 crypto.getRandomValues(data);
 return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function urlSafeBase64(buffer){
 return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function scopedStorageGet(key){try{return sessionStorage.getItem(key);}catch(_){return null;}}
function scopedStorageSet(key,val){sessionStorage.setItem(key,val);}
function scopedStorageRemove(key){try{sessionStorage.removeItem(key);}catch(_){}}
export function hasOsmTestToken(){return !!scopedStorageGet(TOKEN_KEY);}
export function forgetOsmTestToken(){scopedStorageRemove(TOKEN_KEY);}
export function consumeOsmTestAuthError(){
 const msg=scopedStorageGet(ERROR_KEY)||'';scopedStorageRemove(ERROR_KEY);return msg;
}
function readToken(){const token=scopedStorageGet(TOKEN_KEY);if(!token)throw Error('先にテストサーバーでOAuth認証してください。');return token;}
export async function startOsmTestLogin(clientId){
 const id=String(clientId||'').trim();
 if(!id||id.length>512)throw Error('開発用OSM OAuthアプリのClient IDを入力してください。');
 if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('このブラウザでは安全なPKCE認証を利用できません。');
 const verifier=randomUrlSafe(32),state=randomUrlSafe(24);
 const challenge=urlSafeBase64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
 scopedStorageSet(AUTH_KEY,JSON.stringify({verifier,state,clientId:id,redirect:redirectUri()}));
 const url=new URL(OSM_TEST_ORIGIN+'/oauth2/authorize');
 for(const [key,value] of Object.entries({response_type:'code',client_id:id,redirect_uri:redirectUri(),scope:'write_api',state,code_challenge:challenge,code_challenge_method:'S256'}))
  url.searchParams.set(key,value);
 location.assign(url.href);
}
export async function finishOsmTestLogin(){
 const params=new URLSearchParams(location.search);
 if(!params.has('code')&&!params.has('error'))return;
 const raw=scopedStorageGet(AUTH_KEY);
 // Do not interpret unrelated authorization codes.
 if(!raw)return;
 const clean=()=>{const next=new URL(location.href);for(const k of ['code','state','error','error_description'])next.searchParams.delete(k);history.replaceState(null,'',next.pathname+next.search+next.hash);};
 try{
  const session=JSON.parse(raw);
  if(params.get('error'))throw Error('OAuth認証が中断されました: '+params.get('error'));
  if(!session?.state||params.get('state')!==session.state||session.redirect!==redirectUri())throw Error('OAuthのstate/リダイレクト照合に失敗しました。');
  const body=new URLSearchParams({grant_type:'authorization_code',code:params.get('code')||'',redirect_uri:session.redirect,client_id:session.clientId,code_verifier:session.verifier});
  const response=await fetch(OSM_TEST_ORIGIN+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!response.ok)throw Error('トークン取得失敗 HTTP '+response.status+': '+(await response.text()).slice(0,180));
  const data=await response.json();
  if(!data.access_token||!String(data.scope||'').split(' ').includes('write_api'))throw Error('write_api 権限のトークンが取得できませんでした。');
  scopedStorageSet(TOKEN_KEY,data.access_token);
 }catch(error){scopedStorageSet(ERROR_KEY,String(error.message||error));}
 finally{scopedStorageRemove(AUTH_KEY);clean();}
}
function parseOsmElement(xml,type,id){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('OSMから受信したXMLの解析に失敗しました。');
 const root=doc.documentElement,element=root?.querySelector(type);
 if(root?.tagName!=='osm'||!element||element.getAttribute('id')!==String(id))throw Error('指定したテスト要素が見つかりません。');
 const version=element.getAttribute('version');
 if(!version)throw Error('テスト要素のversionが取得できません。');
 const tags={};
 for(const tag of element.children)if(tag.tagName==='tag')tags[tag.getAttribute('k')]=tag.getAttribute('v');
 return {type,id:String(id),version,tags,element};
}
export async function getOsmTestElement(type,id){
 if(!types.has(type)||!/^[1-9]\d*$/.test(String(id)))throw Error('テスト要素の種別とIDを確認してください。');
 const response=await fetch(API+'/'+type+'/'+id,{headers:{Accept:'application/xml'},cache:'no-store'});
 if(!response.ok)throw Error('テスト要素の取得失敗 HTTP '+response.status+'（本番OSMのIDは使えません）');
 return parseOsmElement(await response.text(),type,id);
}
export function validateOsmTestLevelTarget(element){
 if(!facilities.some(key=>element.tags[key]))throw Error('テスト対象に店舗・施設のタグがありません。建物そのものには階数を追加しません。');
 if(Object.prototype.hasOwnProperty.call(element.tags,'level'))throw Error('テスト対象には既にlevelタグがあります。未登録の店舗だけ編集できます。');
}
async function apiWrite(path,body,token){
 const response=await fetch(API+path,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'text/xml; charset=utf-8'},body});
 const content=await response.text();
 if(!response.ok)throw Error('テストAPI HTTP '+response.status+': '+content.slice(0,250));
 return content.trim();
}
function makeChangesetXml(){
 const doc=document.implementation.createDocument(null,'osm',null);
 doc.documentElement.setAttribute('version','0.6');
 const changeset=doc.createElement('changeset');doc.documentElement.appendChild(changeset);
 for(const [key,value] of Object.entries({created_by:'Komorebi 3D test editor',comment:'Add verified shop floor level (development server only)'})){
  const tag=doc.createElement('tag');tag.setAttribute('k',key);tag.setAttribute('v',value);changeset.appendChild(tag);
 }
 return new XMLSerializer().serializeToString(doc);
}
function makeElementXml(item,changesetId,level){
 const doc=document.implementation.createDocument(null,'osm',null);doc.documentElement.setAttribute('version','0.6');
 const element=doc.createElement(item.type);
 for(const key of ['id','version','lat','lon','visible']){
  const value=item.element.getAttribute(key);if(value!=null)element.setAttribute(key,value);
 }
 element.setAttribute('changeset',changesetId);
 for(const child of item.element.children){
  if(!['tag','nd','member'].includes(child.tagName))continue;
  const clone=doc.importNode(child,true);
  element.appendChild(clone);
 }
 const tag=doc.createElement('tag');tag.setAttribute('k','level');tag.setAttribute('v',String(level));element.appendChild(tag);
 doc.documentElement.appendChild(element);
 return new XMLSerializer().serializeToString(doc);
}
// A send uses the exact version loaded for preview. Stale version => API 409.
export async function sendOsmTestLevel(item,level){
 const value=Number(level);
 if(!Number.isInteger(value)||value<0||value>8)throw Error('1〜9階の階数を指定してください。');
 validateOsmTestLevelTarget(item);
 const token=readToken();
 let changesetId=null,uploaded=false;
 try{
  changesetId=await apiWrite('/changeset/create',makeChangesetXml(),token);
  if(!/^[1-9]\d*$/.test(changesetId))throw Error('変更セットIDが不正です。');
  const newVersion=await apiWrite('/'+item.type+'/'+item.id,makeElementXml(item,changesetId,value),token);
  uploaded=true;
  return {changesetId,newVersion,elementUrl:OSM_TEST_ORIGIN+'/'+item.type+'/'+item.id};
 }finally{
  if(changesetId&&/^[1-9]\d*$/.test(changesetId)){
   try{await apiWrite('/changeset/'+changesetId+'/close','',token);}
   catch(error){if(!uploaded)console.warn('OSM test changeset close failed',error);else console.warn('OSM test changeset written but closing failed',error);}
  }
 }
}
