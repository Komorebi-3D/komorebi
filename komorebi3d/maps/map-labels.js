// Project roof labels from the shared camera into the actual A/B viewport rectangles.
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
 function setLabels(labels){
  layer.replaceChildren();
  entries=labels.map(label=>({...label,visibleTags:visibleOsmTags(label.tags,ignoreRules)}));
  for(const viewport of viewports){
   viewport.items=entries.map(item=>{
    const el=document.createElement('div');
    el.style.cssText='position:absolute;display:none;pointer-events:none;transform:translate(-50%,-100%);flex-direction:column;align-items:center;white-space:normal;';
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
    // Measure the complete, wrapped label once (not on every animation frame).
    el.style.display='flex';
    el.style.visibility='hidden';
    const width=el.offsetWidth||210,height=el.offsetHeight||72;
    el.style.display='none';
    el.style.visibility='';
    return {...item,el,width,height};
   });
  }
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
   for(const item of viewport.items)item.el.style.display='none';
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
    const measured=viewport.items[i],wd=measured.width,top=y-measured.height;
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
 return {setLabels,update,dispose(){layer.remove();entries=[];}};
}
