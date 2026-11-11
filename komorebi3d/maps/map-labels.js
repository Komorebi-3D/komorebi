// Project roof labels from the shared camera into the actual A/B viewport rectangles.
export function createMapLabels(host){
 const layer=document.createElement('div');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);
 const viewports=[...host.querySelectorAll('.view-panel canvas')].map(canvas=>({canvas,items:[]}));
 let entries=[];
 function setLabels(labels){
  layer.replaceChildren();
  entries=labels.map(label=>({...label,width:Math.min(210,Math.max(92,Array.from(label.name).length*13+24))}));
  for(const viewport of viewports){
   viewport.items=entries.map(item=>{
    const el=document.createElement('div');
    el.style.cssText='position:absolute;display:none;pointer-events:none;transform:translate(-50%,-100%);flex-direction:column;align-items:center;white-space:nowrap;';
    const card=document.createElement('div');
    card.style.cssText='box-sizing:border-box;max-width:210px;min-width:92px;overflow:hidden;padding:7px 11px 8px;border:1px solid rgba(123,234,216,.72);border-radius:10px;background:rgba(23,40,56,.75);box-shadow:0 3px 14px rgba(6,15,29,.22);color:white;font-family:system-ui,-apple-system,sans-serif;text-align:left;';
    const header=document.createElement('div');
    header.style.cssText='color:#7bead8;font:600 9px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:1.1px;margin-bottom:3px;';
    header.textContent='● BUILDING';
    const title=document.createElement('div');
    title.style.cssText='max-width:186px;overflow:hidden;text-overflow:ellipsis;color:#fff;font:600 13px/1.4 system-ui,-apple-system,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.28);';
    title.textContent=item.name;
    card.append(header,title);
    const stem=document.createElement('div');
    stem.style.cssText='width:1px;height:22px;background:#7bead8;box-shadow:0 0 4px rgba(123,234,216,.35);';
    const dot=document.createElement('div');
    dot.style.cssText='width:7px;height:7px;border-radius:50%;background:#7bead8;box-shadow:0 0 0 2px rgba(23,40,56,.45);';
    el.append(card,stem,dot);layer.appendChild(el);
    return {...item,el};
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
    const wd=item.width,top=y-72;
    if(x>=0&&x<=rect.width&&y>=0&&y<=rect.height)inView++;
    if(x<wd/2+4||x>rect.width-wd/2-4||top<4||y>rect.height-4||
      occupied.some(p=>Math.abs(x-p.x)<(wd+p.wd)/2+8&&Math.abs(top-p.top)<42))continue;
    occupied.push({x,top,wd});
    const el=viewport.items[i].el;
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
