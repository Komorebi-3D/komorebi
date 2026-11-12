// Project building and ground-level POI labels using shared A/B viewport camera information.
// Uses a plain-text ignore file; no special handling of newly discovered OSM tag keys.
export function parseOsmTagIgnore(source){
 return String(source).split(/\r?\n/).map(line=>line.trim())
  .filter(line=>line&&!line.startsWith('#'))
  .map(line=>line.endsWith('*')?{prefix:line.slice(0,-1)}:{exact:line});
}
export async function loadOsmTagIgnore(url='./maps/osm-tags.ignore'){
 const response=await fetch(url,{cache:'no-cache'});
 if(!response.ok)throw new Error('OSMタグ除外ルールの読み込み失敗 HTTP '+response.status);
 return parseOsmTagIgnore(await response.text());
}
export function visibleOsmTags(tags={},rules=[]){
 return Object.entries(tags).filter(([key])=>!rules.some(rule=>rule.exact===key||(rule.prefix!==undefined&&key.startsWith(rule.prefix))));
}
export function createMapLabels(host,ignoreRules=[]){
 const layer=document.createElement('div');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);
 const viewports=[...host.querySelectorAll('.view-panel canvas')].map(canvas=>({canvas,items:[]}));
 let entries=[];

 // JSON-first local drafting. Never writes to OpenStreetMap.
 let editor=null;
 const storageKey=item=>'komorebi:osm-draft:'+item.osmType+':'+item.osmId;
 function readDraft(item){
  try{
   const draft=JSON.parse(localStorage.getItem(storageKey(item))||'null');
   return draft&&draft.schema==='komorebi.osm-tags-draft.v1'&&draft.tags&&typeof draft.tags==='object'?draft:null;
  }catch(_){return null;}
 }
 function openEditor(item){
  if(!item.osmType||!item.osmId)return;
  editor?.remove();
  const baseTags={...(item.originalTags||item.tags||{})};
  const stored=readDraft(item);
  const initial={...(stored?.tags||item.tags||{})};
  const mask=document.createElement('div');
  mask.style.cssText='position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(8,18,25,.72);pointer-events:auto;';
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;width:min(100%,430px);max-height:94%;overflow:auto;padding:16px;background:#f8fcfa;color:#18352f;border-radius:14px;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 10px 35px #06140d66;';
  const title=document.createElement('h3');
  title.textContent=item.name+'｜OSMタグの編集';
  title.style.cssText='font-size:17px;line-height:1.4;margin:0 0 7px;';
  const note=document.createElement('p');
  note.textContent='既存のJSONタグを編集します。保存先はこの端末のみ。OSMには送信されません。';
  note.style.cssText='color:#4e655b;font-size:12px;margin:0 0 8px;';
  const metadata=document.createElement('p');
  metadata.textContent='OSM '+item.osmType+'/'+item.osmId+' ／ version: '+(item.osmVersion??'未取得');
  metadata.style.cssText='font-size:11px;color:#587166;margin:4px 0;';
  const rows=document.createElement('div');
  const inputStyle='box-sizing:border-box;width:100%;min-width:0;padding:8px;border:1px solid #aabfb5;border-radius:7px;background:white;color:#152b25;font:13px/1.4 system-ui,-apple-system,sans-serif;';
  function addRow(key='',value=''){
   const row=document.createElement('div');
   row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 32px;gap:5px;margin:6px 0;';
   const k=document.createElement('input');k.value=key;k.placeholder='タグ名';k.setAttribute('aria-label','タグ名');k.style.cssText=inputStyle;
   const v=document.createElement('input');v.value=value;v.placeholder='値';v.setAttribute('aria-label','タグの値');v.style.cssText=inputStyle;
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';
   remove.setAttribute('aria-label',key+' タグを削除');
   remove.style.cssText='border:1px solid #aabfb5;border-radius:7px;background:white;color:#8b3535;font-size:18px;';
   remove.addEventListener('click',()=>row.remove());
   row.append(k,v,remove);rows.appendChild(row);
  }
  const tagsHeader=document.createElement('p');
  tagsHeader.textContent='タグ名 / 値';
  tagsHeader.style.cssText='font-weight:700;margin:12px 0 4px;';
  for(const [k,v] of Object.entries(initial))addRow(k,String(v));
  const add=document.createElement('button');add.type='button';add.textContent='＋ タグを追加';
  add.style.cssText='padding:8px 11px;border:1px solid #aabfb5;border-radius:7px;background:#fff;color:#236c56;font-weight:700;';
  add.addEventListener('click',()=>{addRow();rows.lastElementChild?.firstElementChild?.focus();});
  const error=document.createElement('p');
  error.style.cssText='color:#a52f2f;font-size:12px;min-height:1em;';
  const review=document.createElement('div');review.hidden=true;
  const previewTitle=document.createElement('p');previewTitle.textContent='JSON変更内容の確認（OSM未送信）';previewTitle.style.fontWeight='700';
  const json=document.createElement('pre');json.style.cssText='max-height:40vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#e8f0eb;border-radius:8px;color:#19352f;font:12px/1.5 ui-monospace,monospace;';
  review.append(previewTitle,json);
  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;margin-top:12px;';
  const makeButton=(label,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='flex:1;padding:11px 5px;border:1px solid #91aca0;border-radius:8px;background:'+(primary?'#236c56':'#fff')+';color:'+(primary?'white':'#163c30')+';font:700 14px system-ui;';return b;};
  const close=makeButton('閉じる'),confirm=makeButton('内容を確認',true),back=makeButton('編集に戻る'),save=makeButton('下書きを保存',true);
  const dismiss=()=>{mask.remove();editor=null;};
  close.addEventListener('click',dismiss);
  function collect(){
   const tags={};
   for(const row of rows.children){
    const k=row.children[0].value.trim(),v=row.children[1].value;
    if(!k){if(v.trim())throw Error('タグ名が空欄です');continue;}
    if(Object.prototype.hasOwnProperty.call(tags,k))throw Error('タグ名が重複しています: '+k);
    if(/[\u0000-\u001f=]/.test(k))throw Error('タグ名に使用できない文字が含まれています');
    tags[k]=v;
   }
   const changed={};
   for(const key of new Set([...Object.keys(baseTags),...Object.keys(tags)])){
    if(baseTags[key]!==tags[key])changed[key]=Object.prototype.hasOwnProperty.call(tags,key)?tags[key]:null;
   }
   return {schema:'komorebi.osm-tags-draft.v1',osm:{type:item.osmType,id:String(item.osmId),version:item.osmVersion??null},baseTags,tags,changes:changed,savedAt:new Date().toISOString()};
  }
  let pending=null;
  confirm.addEventListener('click',()=>{
   try{
    pending=collect();error.textContent='';
    json.textContent=JSON.stringify({osm:pending.osm,changes:pending.changes,tags:pending.tags},null,2);
    rows.hidden=true;add.hidden=true;tagsHeader.hidden=true;review.hidden=false;
    controls.replaceChildren(back,save);
   }catch(e){error.textContent=e.message;}
  });
  back.addEventListener('click',()=>{pending=null;rows.hidden=false;add.hidden=false;tagsHeader.hidden=false;review.hidden=true;controls.replaceChildren(close,confirm);});
  save.addEventListener('click',()=>{
   if(!pending)return;
   try{
    localStorage.setItem(storageKey(item),JSON.stringify(pending));
    dismiss();
    setLabels(entries.map(e=>({...e,tags:e.originalTags||e.tags,name:e.originalName||e.name})));
   }catch(_){error.textContent='保存できませんでした。ブラウザの保存設定を確認してください。';}
  });
  form.addEventListener('submit',event=>event.preventDefault());
  mask.addEventListener('pointerdown',event=>event.stopPropagation());
  mask.addEventListener('click',event=>{event.stopPropagation();if(event.target===mask)dismiss();});
  controls.append(close,confirm);
  form.append(title,note,metadata,tagsHeader,rows,add,review,error,controls);
  mask.appendChild(form);host.appendChild(mask);editor=mask;
 }
 function setLabels(labels){
  layer.replaceChildren();
  entries=labels.map(label=>{
   const originalTags={...(label.originalTags||label.tags||{})};
   const draft=readDraft(label);
   const tags=draft?{...draft.tags}:{...originalTags};
   const name=String(tags['name:ja']||tags.name||label.originalName||label.name);
   return {...label,name,originalName:label.originalName||label.name,originalTags,tags,draft:!!draft,visibleTags:visibleOsmTags(tags,ignoreRules)};
  });
  for(const viewport of viewports)viewport.items=entries.map(()=>null);
 }
 // Instantiate HTML only when a feature enters the screen, not for every OSM POI.
 function createItem(item){
    const el=document.createElement('div');
    el.style.cssText='position:absolute;display:none;pointer-events:auto;touch-action:manipulation;cursor:pointer;transform:translate(-50%,-100%);flex-direction:column;align-items:center;white-space:normal;';
    const card=document.createElement('div');
    card.style.cssText='box-sizing:border-box;width:210px;max-width:210px;min-width:92px;overflow-wrap:anywhere;padding:7px 11px 8px;border:1px solid rgba(123,234,216,.72);border-radius:10px;background:rgba(23,40,56,.75);box-shadow:0 3px 14px rgba(6,15,29,.22);color:white;font-family:system-ui,-apple-system,sans-serif;text-align:left;';
    const header=document.createElement('div');
    header.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px;';
    for(const [key,value] of item.visibleTags){
     const tag=document.createElement('span');
     tag.style.cssText='display:inline-block;min-width:0;max-width:100%;box-sizing:border-box;padding:2px 5px;border:1px solid rgba(123,234,216,.55);border-radius:4px;color:#7bead8;font:500 9px/1.35 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;';
     tag.textContent=key+': '+String(value);
     header.appendChild(tag);
    }
    if(!item.visibleTags.length)header.style.display='none';
    const title=document.createElement('div');
    title.style.cssText='max-width:186px;overflow:hidden;text-overflow:ellipsis;color:#fff;font:600 13px/1.4 system-ui,-apple-system,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.28);';
    title.textContent=item.name+(item.draft?' 📝':'');
    card.append(header,title);
    const stem=document.createElement('div');
    stem.style.cssText='width:1px;height:22px;background:#7bead8;box-shadow:0 0 4px rgba(123,234,216,.35);';
    const dot=document.createElement('div');
    dot.style.cssText='width:7px;height:7px;border-radius:50%;background:#7bead8;box-shadow:0 0 0 2px rgba(23,40,56,.45);';
    el.append(card,stem,dot);layer.appendChild(el);
    el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',item.name+'を編集');
    el.addEventListener('click',event=>{event.stopPropagation();openEditor(item);});
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditor(item);}});
    // Measure the complete, wrapped label once (not on every animation frame).
    el.style.display='flex';
    el.style.visibility='hidden';
    const width=el.offsetWidth||210,height=el.offsetHeight||72;
    el.style.display='none';
    el.style.visibility='';
    return {...item,el,width,height};
 }
  function update(camera,player){
  const empty={total:entries.length,inRange:0,inView:0,shown:0};
  if(!camera||!layer.isConnected)return empty;
  const [ex,ey,ez]=camera.eye,[tx,ty,tz]=camera.target;
  const px=player?.x??tx,py=player?.y??ty,pz=player?.z??tz;
  let fx=tx-ex,fy=ty-ey,fz=tz-ez,fl=Math.hypot(fx,fy,fz);
  if(!fl)return empty;
  fx/=fl;fy/=fl;fz/=fl;
  let rx=-fz,rz=fx,rl=Math.hypot(rx,rz);
  if(rl<1e-6){rx=1;rz=0;rl=1;}
  rx/=rl;rz/=rl;
  const ux=-fy*rz,uy=fx*rz-fz*rx,uz=fy*rx;
  const tanHalf=Math.tan((camera.fovDegrees??45)*Math.PI/360);
  if(!(tanHalf>0))return empty;
  const ranked=entries.map((item,i)=>({
   i,item,
   cameraDistance:Math.hypot(item.x-ex,item.y-ey,item.z-ez),
   playerDistance:Math.hypot(item.x-px,item.y-py,item.z-pz)
  })).filter(entry=>entry.cameraDistance<=200)
    .sort((a,b)=>a.playerDistance-b.playerDistance);
  let inView=0,shown=0;
  const hostRect=host.getBoundingClientRect();
  for(const viewport of viewports){
   for(const item of viewport.items)if(item)item.el.style.display='none';
   const rect=viewport.canvas.getBoundingClientRect();
   if(rect.width<1||rect.height<1)continue;
   const scale=rect.height/(2*tanHalf),occupied=[];
   let viewShown=0;
   for(const {i,item} of ranked){
    if(viewShown>=20)break;
    const vx=item.x-ex,vy=item.y-ey,vz=item.z-ez;
    const depth=vx*fx+vy*fy+vz*fz;
    if(depth<=.2)continue;
    const x=rect.width/2+(vx*rx+vz*rz)*scale/depth;
    const y=rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth;
    if(x<0||x>rect.width||y<0||y>rect.height)continue;
    const measured=viewport.items[i]||(viewport.items[i]=createItem(item));
    const wd=measured.width,top=y-measured.height;
    if(x>=0&&x<=rect.width&&y>=0&&y<=rect.height)inView++;
    if(x<wd/2+4||x>rect.width-wd/2-4||top<4||y>rect.height-4||
      occupied.some(p=>x-wd/2<p.right+8&&x+wd/2>p.left-8&&top<p.bottom+8&&y>p.top-8))continue;
    occupied.push({left:x-wd/2,right:x+wd/2,top,bottom:y});
    const el=measured.el;
    el.style.display='flex';
    el.style.left=(rect.left-hostRect.left+x)+'px';
    el.style.top=(rect.top-hostRect.top+y)+'px';
    viewShown++;shown++;
   }
  }
  return {total:entries.length,inRange:ranked.length,inView,shown};
 }
 return {setLabels,update,dispose(){editor?.remove();editor=null;layer.remove();entries=[];}};
}
