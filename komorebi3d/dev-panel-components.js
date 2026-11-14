// Developer panel views. No game-engine imports or global panel lookup.
// Each view owns only its supplied DOM root and receives game state through the Game API.
// @screen-settings-ui:start
export function renderScreenSettingsUI(root,state){
 const settings=root.querySelector('.screen-settings');
 if(!settings)return;
 const mode=['A','B','compare'].includes(state.renderMode)?state.renderMode:'compare';
 const comparing=mode==='compare',screens=state.screens;
 settings.dataset.visible=mode;
 for(const card of settings.querySelectorAll('[data-screen]')){
  const screen=card.dataset.screen;
  card.hidden=!comparing&&screen!==mode;
  for(const kind of ['map','engine']){
   const group=card.querySelector('[data-setting="'+kind+'"]');
   const different=comparing&&screens.A[kind]!==screens.B[kind];
   group?.classList.toggle('is-different',different);
   for(const input of group?.querySelectorAll('input')||[])input.checked=screens[screen][kind]===input.value;
  }
 }
 for(const button of root.querySelectorAll('[data-mode]')){
  const selected=button.dataset.mode===mode;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
 const caption=root.querySelector('#mode-status');
 if(caption)caption.textContent='表示：'+(comparing?'画面A＋画面B':'画面'+mode+'のみ');
}
// @screen-settings-ui:end

export function createGameView(root){
 if(!root)return null;
 const get=id=>root.querySelector('#'+id);
 const elements={
  movePad:get('pad'),cameraPad:get('camera-pad'),
  canvasA:get('a'),canvasB:get('b'),
  panelA:get('panel-a'),panelB:get('panel-b'),
  views:get('views'),surface:get('play-surface'),
  map:get('debug-map'),mapCanvas:get('debug-map-canvas')
 };
 if(Object.values(elements).some(el=>!el))throw new Error('Game view elements incomplete');
 const ctx=elements.mapCanvas.getContext('2d');
 return {
  movePad:elements.movePad,cameraPad:elements.cameraPad,
  get canvasA(){return elements.canvasA;},get canvasB(){return elements.canvasB;},
  replaceCanvas(screen){
   const key=screen==='A'?'canvasA':screen==='B'?'canvasB':null;
   if(!key)throw new Error('Invalid screen');
   const old=elements[key],next=old.cloneNode(false);
   old.replaceWith(next);elements[key]=next;
   return next;
  },
  surface:elements.surface,
  setRenderMode(mode){
   const showA=mode!=='B',showB=mode!=='A';
   elements.panelA.classList.toggle('off',!showA);
   elements.panelB.classList.toggle('off',!showB);
   elements.views.classList.toggle('single',mode!=='compare');
   elements.surface.classList.toggle('ab-compare',mode==='compare');
  },
  setMapVisible(visible){
   elements.map.hidden=!visible;
   elements.map.setAttribute('aria-hidden',String(!visible));
  },
  paintMap({worldId,playerX,playerZ,agents=[],cafeX=0,cafeZ=0,features=null}){
   if(!ctx)return;
   const town=worldId==='matsudo',span=town?500:100,half=span/2;
   const w=elements.mapCanvas.width,h=elements.mapCanvas.height;
   const wx=x=>(x+half)*w/span,wz=z=>(z+half)*h/span;
   const title=elements.map.querySelector('.debug-map-title');
   const legend=elements.map.querySelector('.debug-map-legend');
   if(title)title.textContent=town?'🗺️ 松戸 500m × 500m':'🗺️ 100m × 100m / 全NPC位置';
   if(legend)legend.textContent=town?'🔴 おばけヘリ　▧ 建物　━ 道路・鉄道':'🔴 主人公　🟡 ハム全員（3D非表示も）';
   ctx.clearRect(0,0,w,h);
   ctx.fillStyle='rgba(15,36,27,.74)';ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='rgba(225,248,228,.20)';ctx.lineWidth=1;
   for(let n=0;n<=4;n++){
    const v=n*w/4;ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,h);
    ctx.moveTo(0,v);ctx.lineTo(w,v);ctx.stroke();
   }
   if(town){
    // Reuse the same canvas and player marker; the town supplies only its geometry.
    for(const feature of features||[]){
     const points=feature.points;if(points.length<2)continue;
     ctx.beginPath();ctx.moveTo(wx(points[0][0]),wz(points[0][1]));
     for(let i=1;i<points.length;i++)ctx.lineTo(wx(points[i][0]),wz(points[i][1]));
     if(feature.type==='building'){
      ctx.closePath();ctx.fillStyle='rgba(192,194,173,.55)';ctx.fill();
     }else{
      ctx.strokeStyle=feature.type==='rail'?'rgba(213,158,135,.9)':'rgba(181,203,205,.78)';
      ctx.lineWidth=feature.type==='rail'?1.2:1.7;ctx.stroke();
     }
    }
   }else{
    ctx.fillStyle='rgba(230,216,174,.38)';
    ctx.fillRect(wx(-2.5),wz(-9.5),14*w/100,10*h/100);
    ctx.fillStyle='rgba(228,163,111,.47)';
    ctx.fillRect(wx(cafeX-7),wz(cafeZ-5),14*w/100,10*h/100);
    ctx.fillStyle='#7cb78b';ctx.beginPath();ctx.arc(wx(-7),wz(-5),3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffe04c';
    for(const a of agents)ctx.fillRect(wx(a.x)-1.2,wz(a.z)-1.2,2.4,2.4);
   }
   ctx.fillStyle='#fb4343';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.3;
   ctx.beginPath();ctx.arc(wx(playerX),wz(playerZ),4,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.font='bold 11px system-ui';ctx.fillStyle='rgba(255,255,255,.88)';
   ctx.fillText('N',w/2-4,12);
  }
 };
}

export function mountRuntimeStatusPanel(root,api){
 if(!root)return ()=>{};
 // Diagnostics are created only for the live runtime panel, not the protected mock.
 const diagnostic=document.createElement('div');
 diagnostic.style.cssText='margin:8px 0;padding:8px;border:1px solid #a5bcb0;border-radius:8px;';
 const title=document.createElement('div');title.textContent='🧪 地図JSON読み込みログ';
 title.style.cssText='font-weight:700;font-size:12px;margin-bottom:6px;';
 const copy=document.createElement('button');copy.type='button';copy.textContent='📋 ログをコピー';
 copy.style.cssText='font-size:12px;margin-bottom:6px;padding:5px 8px;';
 const pre=document.createElement('pre');pre.id='map-debug-log';pre.textContent='松戸で地図を読み込むとログを表示';
 pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;max-height:230px;overflow:auto;font-size:11px;line-height:1.5;margin:0;';
 diagnostic.append(title,copy,pre);
 (root.querySelector('#map-source-status')||root.querySelector('#label-status')||root).after(diagnostic);
 const onCopy=async()=>{try{await navigator.clipboard.writeText(pre.textContent||'');copy.textContent='コピーしました';}
 catch(_){copy.textContent='テキストを長押ししてコピー';}};
 copy.addEventListener('click',onCopy);
 const fields=new Map(Array.from(root.querySelectorAll('[id]'),node=>[node.id,node]));
 const render=event=>{
  if(event.type!=='status')return;
  const field=fields.get(event.id);
  if(field)field.textContent=event.value;
 };
 for(const [id,value] of Object.entries(api.getState().status ?? {}))render({type:'status',id,value});
 const unsubscribe=api.subscribe(render);
 return ()=>{unsubscribe();copy.removeEventListener('click',onCopy);diagnostic.remove();};
}

export function mountTestControlsPanel(root,api){
 if(!root)return ()=>{};
 const find=id=>root.querySelector('#'+id), cleanups=[];
 const bind=(el,event,fn)=>{if(!el)return;el.addEventListener(event,fn);cleanups.push(()=>el.removeEventListener(event,fn));};
 const write=(id,value)=>{const el=find(id);if(el)el.textContent=value;};
 // When no Game API is supplied, operate this same UI locally.
 // Defaults come from the canonical HTML controls, not a second game model.
 const initial=Object.freeze({
  worldId:'forest',
  npcCount:1,
  npcRenderLimit:Number(find('npc-render-limit')?.defaultValue ?? 65),
  npcRenderDistance:Number(find('npc-render-distance')?.defaultValue ?? 70),
  renderMode:find('mode-a')?.getAttribute('aria-pressed')==='true'?'A':
   find('mode-compare')?.getAttribute('aria-pressed')==='true'?'compare':'B',
  screens:{A:{map:'old',engine:'B'},B:{map:'new',engine:'B'}},
  mapVisible:find('map-toggle')?.getAttribute('aria-pressed')==='true'
 });
 let localState={...initial};
 const readState=()=>api?api.getState():localState;
 const act=(method,value)=>{
  if(api)return api[method](value);
  if(method==='reset')localState={...initial,screens:{A:{...initial.screens.A},B:{...initial.screens.B}}};
  else if(method==='setScreenConfig'){
   const {screen,setting,value}=value||{};
   if(['A','B'].includes(screen)&&['map','engine'].includes(setting)&&
      (setting==='map'?['old','new']:['A','B']).includes(value))
    localState={...localState,screens:{...localState.screens,[screen]:{...localState.screens[screen],[setting]:value}}};
  }
  else if(method==='setWorld')localState.worldId=value;
  else if(method==='setRenderMode')localState.renderMode=value;
  else if(method==='setNpcCount')localState.npcCount=value;
  else if(method==='setNpcRenderLimit')localState.npcRenderLimit=Number(value);
  else if(method==='setNpcRenderDistance')localState.npcRenderDistance=Number(value);
  else if(method==='setMapVisible')localState.mapVisible=Boolean(value);
  // A location button has no game world to teleport in standalone mode.
  render();
 };
 const render=()=>{
  const s=readState(),stress=s.npcCount===1000;
  const limit=find('npc-render-limit'),distance=find('npc-render-distance');
  if(limit)limit.value=String(s.npcRenderLimit);
  if(distance)distance.value=String(s.npcRenderDistance);
  write('npc-render-limit-value',s.npcRenderLimit+'匹');
  write('npc-render-distance-value',s.npcRenderDistance+'m');
  const stressButton=find('npc-stress-toggle');
  if(stressButton){
   stressButton.textContent=stress?'🐹 1匹に戻す':'🐹 ハムスター ×1000';
   stressButton.setAttribute('aria-pressed',String(stress));
   stressButton.classList.toggle('selected',stress);
  }
  const mapButton=find('map-toggle');
  if(mapButton){
   mapButton.textContent=s.mapVisible?'🗺️ マップを閉じる':'🗺️ マップ表示';
   mapButton.setAttribute('aria-pressed',String(s.mapVisible));
   mapButton.classList.toggle('selected',Boolean(s.mapVisible));
  }
  renderScreenSettingsUI(root,s);
  for(const button of root.querySelectorAll('[data-world]')){
   const selected=(s.worldId||'forest')===button.dataset.world;
   button.setAttribute('aria-pressed',String(selected));
   button.classList.toggle('selected',selected);
  }
 };
 bind(find('reset'),'click',()=>act('reset',));
 for(const button of root.querySelectorAll('[data-world]'))bind(button,'click',()=>{
  try{const promise=act('setWorld',button.dataset.world);Promise.resolve(promise).catch(error=>{write('mode-status','ワープ失敗：'+String(error.message||error));});}
  catch(error){write('mode-status','ワープ失敗：'+String(error.message||error));}
 });
 for(const [id,mode] of [['mode-a','A'],['mode-b','B'],['mode-compare','compare']])
  bind(find(id),'click',()=>act('setRenderMode',mode));
 for(const input of root.querySelectorAll('.screen-settings input[type="radio"]'))bind(input,'change',()=>{
  if(!input.checked)return;
  const screen=input.closest('[data-screen]')?.dataset.screen;
  const setting=input.closest('[data-setting]')?.dataset.setting;
  if(screen&&setting)act('setScreenConfig',{screen,setting,value:input.value});
 });
 bind(find('npc-render-limit'),'input',e=>act('setNpcRenderLimit',e.currentTarget.value));
 bind(find('npc-render-distance'),'input',e=>act('setNpcRenderDistance',e.currentTarget.value));
 for(const button of root.querySelectorAll('[data-step-target]')){
  bind(button,'click',()=>{
   const target=find(button.dataset.stepTarget);if(!target)return;
   const delta=Number(button.dataset.stepAmount);if(!Number.isFinite(delta))return;
   const value=Math.max(Number(target.min),Math.min(Number(target.max),Number(target.value)+delta));
   if(button.dataset.stepTarget==='npc-render-limit')act('setNpcRenderLimit',value);
   else if(button.dataset.stepTarget==='npc-render-distance')act('setNpcRenderDistance',value);
  });
 }
 bind(find('npc-stress-toggle'),'click',()=>{
  try{act('setNpcCount',readState().npcCount===1000?1:1000);}
  catch(error){console.error('NPC負荷テストエラー',error);}
 });
 bind(find('map-toggle'),'click',()=>act('setMapVisible',!readState().mapVisible));
 for(const button of root.querySelectorAll('[data-spot]'))
  bind(button,'click',()=>act('teleport',button.dataset.spot));
 const unsubscribe=api?api.subscribe(e=>{if(e.type==='state')render();}):()=>{};
 render();return ()=>{unsubscribe();for(const off of cleanups)off();};
}
