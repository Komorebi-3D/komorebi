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

 // Editing is local-only until authenticated OSM changeset support is implemented.
 let editor=null;
 function openEditor(item){
  if(!item.osmType||!item.osmId)return;
  editor?.remove();
  const key='komorebi:osm-draft:'+item.osmType+':'+item.osmId;
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){}
  const mask=document.createElement('div');
  mask.style.cssText='position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(8,18,25,.68);pointer-events:auto;';
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;width:min(100%,390px);max-height:95%;overflow:auto;padding:17px;background:#f8fcfa;color:#18352f;border-radius:14px;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 10px 35px #06140d66;';
  const heading=document.createElement('h3');
  heading.textContent=item.name+'｜店舗・階数の編集';
  heading.style.cssText='font-size:17px;line-height:1.4;margin:0 0 6px;';
  const note=document.createElement('p');
  note.textContent='編集内容をJSONで確認してから端末に保存します。OSM本体には送信されません。';
  note.style.cssText='color:#4e655b;font-size:12px;margin:0 0 12px;';
  const fields=document.createElement('div');
  const addField=(labelText,element)=>{
   const wrap=document.createElement('label');
   wrap.style.cssText='display:block;margin:10px 0;font-weight:600;';
   const caption=document.createElement('span');caption.textContent=labelText;caption.style.cssText='display:block;margin-bottom:4px;';
   element.style.cssText='box-sizing:border-box;width:100%;padding:10px;border:1px solid #aabfb5;border-radius:7px;background:#fff;color:#152b25;font:inherit;';
   wrap.append(caption,element);fields.appendChild(wrap);return element;
  };
  const textInput=(value='')=>{const el=document.createElement('input');el.type='text';el.value=value;return el;};
  const floorSelect=document.createElement('select');
  for(let i=1;i<=9;i++){
   const opt=document.createElement('option');opt.value=String(i);opt.textContent=i+'階';floorSelect.appendChild(opt);
  }
  const previousFloor=String(saved.floor??'').trim().match(/^([1-9])(?:F|階)?$/i);
  floorSelect.value=previousFloor?previousFloor[1]:'1';
  const floor=addField('階（1階〜9階）',floorSelect);
  const tenant=addField('店舗・テナント名',textInput(saved.tenant||''));
  tenant.placeholder='例：○○カフェ';
  const status=document.createElement('select');
  for(const [value,name] of [['unknown','未確認'],['occupied','営業中・入居中'],['vacant','空き区画']]){
   const opt=document.createElement('option');opt.value=value;opt.textContent=name;status.appendChild(opt);
  }
  status.value=['unknown','occupied','vacant'].includes(saved.status)?saved.status:'unknown';
  addField('区画の状態',status);
  const notes=addField('メモ（確認した情報など）',document.createElement('textarea'));
  notes.value=saved.notes||'';notes.rows=2;notes.placeholder='現地確認した内容をメモ';
  const metadata=document.createElement('p');
  metadata.textContent='OSM '+item.osmType+'/'+item.osmId+' ・ この端末内の下書き';
  metadata.style.cssText='font-size:11px;color:#587166;';
  const preview=document.createElement('div');
  preview.hidden=true;
  const previewLabel=document.createElement('p');
  previewLabel.textContent='保存予定のJSON（OSM APIへの送信データではありません）';
  previewLabel.style.cssText='font-size:12px;color:#4e655b;margin:12px 0 6px;';
  const json=document.createElement('pre');
  json.style.cssText='box-sizing:border-box;max-height:40vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#e8f0eb;border:1px solid #aabfb5;border-radius:8px;color:#19352f;font:12px/1.5 ui-monospace,SFMono-Regular,monospace;';
  const feedback=document.createElement('p');
  feedback.style.cssText='min-height:1em;font-size:12px;color:#4e655b;';
  preview.append(previewLabel,json,feedback);
  const actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:8px;margin-top:12px;';
  const close=document.createElement('button');close.type='button';close.textContent='閉じる';
  const confirm=document.createElement('button');confirm.type='submit';confirm.textContent='内容を確認';
  const back=document.createElement('button');back.type='button';back.textContent='編集に戻る';
  const save=document.createElement('button');save.type='submit';save.textContent='下書きを保存';
  const copy=document.createElement('button');copy.type='button';copy.textContent='JSONをコピー';
  for(const b of [close,confirm,back,save,copy])b.style.cssText='flex:1;min-width:0;padding:11px 5px;border-radius:8px;border:1px solid #91aca0;background:#fff;color:#163c30;font-weight:700;font:inherit;';
  confirm.style.background='#236c56';confirm.style.color='#fff';
  save.style.background='#236c56';save.style.color='#fff';
  let pending=null,checking=false;
  const payload=()=>({
   schema:'komorebi.osm-tenant-draft.v1',
   osm:{type:item.osmType,id:String(item.osmId)},
   floor:Number(floor.value),
   tenant:tenant.value.trim(),
   status:status.value,
   notes:notes.value.trim(),
   savedAt:new Date().toISOString()
  });
  const setChecking=on=>{
   checking=on;fields.hidden=on;preview.hidden=!on;
   actions.replaceChildren(...(on?[back,save]:[close,confirm]));
   note.textContent=on?'内容を確認し、問題なければ下書きを保存してください。OSMには送信しません。':'編集内容をJSONで確認してから端末に保存します。OSM本体には送信されません。';
  };
  const dismiss=()=>{mask.remove();editor=null;};
  close.addEventListener('click',dismiss);
  back.addEventListener('click',()=>{pending=null;setChecking(false);});
  copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(json.textContent);feedback.textContent='JSONをコピーしました。';}
   catch(_){feedback.textContent='コピーできませんでした。JSONを長押しして選択してください。';}
  });
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!checking){
    pending=payload();
    json.textContent=JSON.stringify(pending,null,2);
    feedback.textContent='';
    setChecking(true);
    const copyRow=document.createElement('div');
    copyRow.style.cssText='display:flex;justify-content:flex-end;';
    copyRow.appendChild(copy);preview.appendChild(copyRow);
    return;
   }
   try{localStorage.setItem(key,JSON.stringify(pending));dismiss();}
   catch(_){feedback.textContent='保存できませんでした。ブラウザの保存設定を確認してください。';}
  });
  mask.addEventListener('pointerdown',event=>event.stopPropagation());
  mask.addEventListener('click',event=>{event.stopPropagation();if(event.target===mask)dismiss();});
  actions.append(close,confirm);
  form.append(heading,note,fields,preview,metadata,actions);mask.appendChild(form);host.appendChild(mask);editor=mask;
 }
 function setLabels(labels){
  layer.replaceChildren();
  entries=labels.map(label=>({...label,visibleTags:visibleOsmTags(label.tags,ignoreRules)}));
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
    title.textContent=item.name;
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
