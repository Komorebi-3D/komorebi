// Developer panel views. No game-engine imports or global panel lookup.
// Each view owns only its supplied DOM root and receives game state through the Game API.
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
  canvasA:elements.canvasA,canvasB:elements.canvasB,
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
  paintMap(agents,playerX,playerZ,cafeX,cafeZ){
   if(!ctx)return;
   const w=elements.mapCanvas.width,h=elements.mapCanvas.height;
   const wx=x=>(x+50)*w/100,wz=z=>(z+50)*h/100;
   ctx.clearRect(0,0,w,h);
   ctx.fillStyle='rgba(15,36,27,.74)';ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='rgba(225,248,228,.20)';ctx.lineWidth=1;
   for(let n=0;n<=4;n++){
    const v=n*w/4;ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,h);
    ctx.moveTo(0,v);ctx.lineTo(w,v);ctx.stroke();
   }
   ctx.fillStyle='rgba(230,216,174,.38)';
   ctx.fillRect(wx(-2.5),wz(-9.5),14*w/100,10*h/100);
   ctx.fillStyle='rgba(228,163,111,.47)';
   ctx.fillRect(wx(cafeX-7),wz(cafeZ-5),14*w/100,10*h/100);
   ctx.fillStyle='#7cb78b';ctx.beginPath();ctx.arc(wx(-7),wz(-5),3,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ffe04c';
   for(const a of agents)ctx.fillRect(wx(a.x)-1.2,wz(a.z)-1.2,2.4,2.4);
   ctx.fillStyle='#fb4343';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.3;
   ctx.beginPath();ctx.arc(wx(playerX),wz(playerZ),4,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.font='bold 11px system-ui';ctx.fillStyle='rgba(255,255,255,.88)';
   ctx.fillText('N',w/2-4,12);
  }
 };
}

export function mountRuntimeStatusPanel(root,api){
 if(!root)return ()=>{};
 const fields=new Map(Array.from(root.querySelectorAll('[id]'),node=>[node.id,node]));
 const render=event=>{
  if(event.type!=='status')return;
  const field=fields.get(event.id);
  if(field)field.textContent=event.value;
 };
 for(const [id,value] of Object.entries(api.getState().status ?? {}))render({type:'status',id,value});
 return api.subscribe(render);
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
  mapVisible:find('map-toggle')?.getAttribute('aria-pressed')==='true',
  testWarning:find('npc-render-warning')?.textContent ?? ''
 });
 let localState={...initial};
 const readState=()=>api?api.getState():localState;
 const act=(method,value)=>{
  if(api)return api[method](value);
  if(method==='reset')localState={...initial};
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
  write('npc-stress-info',stress?
   '1,000匹が移動計算中。3D表示は表示距離・同時描画上限スライダーで調整できます。1匹に戻すことも可能。':
   '通常1匹。×1000で1,000匹に増やし、表示距離と同時描画上限を調節できます。');
  const mapButton=find('map-toggle');
  if(mapButton){
   mapButton.textContent=s.mapVisible?'🗺️ マップを閉じる':'🗺️ マップ表示';
   mapButton.setAttribute('aria-pressed',String(s.mapVisible));
   mapButton.classList.toggle('selected',Boolean(s.mapVisible));
  }
  for(const [id,mode] of [['mode-a','A'],['mode-b','B'],['mode-compare','compare']]){
   const button=find(id);if(!button)continue;
   const selected=s.renderMode===mode;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  }
  for(const button of root.querySelectorAll('[data-world]')){
   const selected=(s.worldId||'forest')===button.dataset.world;
   button.setAttribute('aria-pressed',String(selected));
   button.classList.toggle('selected',selected);
  }
  write('mode-status',s.renderMode==='A'?'描画モード：Engine A（WebGL）':s.renderMode==='B'?'描画モード：Engine B（Three.js）':'描画モード：Engine A/B比較・共通Snapshot');
  write('npc-render-warning',s.testWarning);
 };
 bind(find('reset'),'click',()=>act('reset',));
 for(const button of root.querySelectorAll('[data-world]'))bind(button,'click',()=>{
  try{const promise=act('setWorld',button.dataset.world);Promise.resolve(promise).catch(error=>{write('mode-status','ワープ失敗：'+String(error.message||error));});}
  catch(error){write('mode-status','ワープ失敗：'+String(error.message||error));}
 });
 for(const [id,mode] of [['mode-a','A'],['mode-b','B'],['mode-compare','compare']])
  bind(find(id),'click',()=>act('setRenderMode',mode));
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
  catch(error){write('npc-stress-info','NPC負荷テストエラー：'+String(error.message||error));}
 });
 bind(find('map-toggle'),'click',()=>act('setMapVisible',!readState().mapVisible));
 for(const button of root.querySelectorAll('[data-spot]'))
  bind(button,'click',()=>act('teleport',button.dataset.spot));
 const unsubscribe=api?api.subscribe(e=>{if(e.type==='state')render();}):()=>{};
 render();return ()=>{unsubscribe();for(const off of cleanups)off();};
}
