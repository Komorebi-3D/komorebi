// Live four-slot editor for the development page. Never imports Engine or Game API.
// Panels are retained as DOM nodes (including their canvases and event subscriptions).
export const PANEL_IDS=Object.freeze(['build','game','test','runtime']);
export const SLOT_IDS=Object.freeze(['top','left','right','bottom']);
const LABELS=Object.freeze({
 build:'🧪 開発情報パネル',game:'🎮 ゲーム画面',
 test:'🧪 テスト操作パネル',runtime:'📊 実行ステータス'
});

export function transitionPanelLayout(layout,action){
 const next={...layout};
 if(!SLOT_IDS.includes(action.from))throw new Error('Unknown source slot');
 const fromId=next[action.from];
 if(action.type==='remove'){
  if(!fromId)throw new Error('Source slot is empty');
  next[action.from]=null;
 }else if(action.type==='swap'){
  if(!SLOT_IDS.includes(action.to)||action.to===action.from||!fromId)
   throw new Error('Invalid panel swap');
  [next[action.from],next[action.to]]=[next[action.to],fromId];
 }else if(action.type==='add'){
  if(next[action.from]!=null||!PANEL_IDS.includes(action.panel)||Object.values(next).includes(action.panel))
   throw new Error('Panel cannot be added here');
  next[action.from]=action.panel;
 }else throw new Error('Unknown layout action');
 const values=Object.values(next).filter(Boolean);
 if(new Set(values).size!==values.length)throw new Error('Duplicate panel');
 return next;
}

export function mountPanelLayoutEditor(doc,initialLayout,{preserveSlotSize=false}={}){
 let layout={...initialLayout},drag=null,menuSlot=null;
 const slots=new Map(SLOT_IDS.map(id=>[id,doc.querySelector('[data-panel-slot="'+id+'"]')]).filter(([,node])=>node));
 const panels=new Map(PANEL_IDS.map(id=>[id,doc.querySelector('[data-panel-id="'+id+'"]')]).filter(([,node])=>node));
 // Optional components: only existing slots and panels participate.
 for(const name of SLOT_IDS)if(!slots.has(name)||!panels.has(layout[name]))layout[name]=null;
 if(!slots.size)return {getLayout:()=>({...layout})};
 const parked=doc.createDocumentFragment();
 const hovered=new Set(),focused=new Set();
 const trashSVG='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/><path d="m19 6-1 14c-.08 1.14-.95 2-2 2H8c-1.05 0-1.92-.86-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
 const help=new Map();

 for(const [id,panel] of panels){
  const button=panel.querySelector('.panel-help-button');
  const overlay=panel.querySelector('.panel-help-overlay');
  if(!button||!overlay)continue;
  const trash=doc.createElement('button');
  trash.type='button';trash.className='panel-trash-target';
  trash.dataset.panelTrash=id;trash.setAttribute('aria-label',LABELS[id]+'を削除');
  trash.innerHTML=trashSVG;trash.hidden=true;
  const hint=doc.createElement('span');
  hint.className='panel-edit-hint';hint.textContent='ゴミ箱で離すと削除';hint.hidden=true;
  overlay.append(trash,hint);
  help.set(id,{button,overlay,trash,hint});
  button.addEventListener('pointerdown',event=>onGripDown(event,id,button));
  button.addEventListener('pointerenter',event=>{
   if(event.pointerType==='mouse'){hovered.add(id);refreshHelp();}
  });
  button.addEventListener('pointerleave',event=>{
   if(event.pointerType==='mouse'){hovered.delete(id);refreshHelp();}
  });
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))focused.add(id);refreshHelp();});
  button.addEventListener('blur',()=>{focused.delete(id);refreshHelp();});
  button.addEventListener('keydown',event=>{
   if(event.key==='Escape'){cancel();event.preventDefault();}
  });
 }
 function slotFor(id){return SLOT_IDS.find(name=>layout[name]===id);}
 function refreshHelp(){
  for(const [id,{button,overlay,trash,hint}] of help){
   const editing=drag?.fromId===id;
   const showingInfo=editing||hovered.has(id)||focused.has(id);
   overlay.hidden=!showingInfo;
   trash.hidden=!editing;hint.hidden=!editing;
   panels.get(id).classList.toggle('panel-editor-armed',editing);
   button.setAttribute('aria-expanded',String(!overlay.hidden));
  }
 }
 function clearTargets(){
  for(const slot of slots.values())slot.classList.remove('panel-drop-target');
  for(const {trash} of help.values())trash.classList.remove('panel-trash-hot');
 }
 function closeMenu(){
  for(const slot of slots.values())slot.querySelector('.panel-add-menu')?.remove();
  menuSlot=null;
 }
 function makePlus(name){
  const button=doc.createElement('button');
  button.type='button';button.className='panel-add-button';
  button.dataset.panelAddButton=name;button.setAttribute('aria-label','パネルを追加');
  const mark=doc.createElement('span');mark.textContent='＋';button.appendChild(mark);
  return button;
 }
 function refreshSlotMeta(){
  for(const [name,slot] of slots)slot.dataset.panel=layout[name]||'empty';
  const main=doc.querySelector('.landscape-main');
  if(main)main.dataset.visiblePanels=String(['left','right'].filter(name=>layout[name]).length);
 }
 function commit(action){
  const next=transitionPanelLayout(layout,action);
  const previous=layout;
  const affected=SLOT_IDS.filter(name=>previous[name]!==next[name]);
  if(preserveSlotSize){
   for(const name of affected){
    const slot=slots.get(name);
    if(previous[name]&&!next[name])slot.style.minHeight=Math.ceil(slot.getBoundingClientRect().height)+'px';
    else if(next[name])slot.style.minHeight='';
   }
  }
  closeMenu();clearTargets();drag=null;
  // Unmount only from the layout: never delete an existing panel node/canvas.
  for(const name of affected){
   const id=previous[name];
   if(id)parked.appendChild(panels.get(id));
   slots.get(name).replaceChildren();
  }
  layout=next;
  for(const name of affected){
   const id=layout[name],slot=slots.get(name);
   slot.appendChild(id?panels.get(id):makePlus(name));
  }
  refreshSlotMeta();refreshHelp();
 }
 function openMenu(slotName){
  closeMenu();refreshHelp();
  const container=slots.get(slotName);
  if(!container||layout[slotName])return;
  const unused=[...panels.keys()].filter(id=>!Object.values(layout).includes(id));
  const menu=doc.createElement('div');
  menu.className='panel-add-menu';menu.setAttribute('role','group');
  menu.setAttribute('aria-label','追加するパネル');
  const heading=doc.createElement('div');heading.className='panel-add-menu-title';
  heading.textContent='追加するパネル';menu.appendChild(heading);
  for(const id of unused){
   const choice=doc.createElement('button');
   choice.type='button';choice.dataset.panelAddOption=id;
   choice.dataset.targetSlot=slotName;choice.textContent=LABELS[id];menu.appendChild(choice);
  }
  container.appendChild(menu);menuSlot=slotName;
 }
 function locateTarget(x,y){
  if(!drag)return null;
  const trash=help.get(drag.fromId).trash;
  const rect=trash.getBoundingClientRect();
  if(x>=rect.left-8&&x<=rect.right+8&&y>=rect.top-8&&y<=rect.bottom+8)
   return {type:'remove',from:drag.fromSlot};
  for(const [name,slot] of slots){
   if(name===drag.fromSlot)continue;
   const r=slot.getBoundingClientRect();
   if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)
    return {type:'swap',from:drag.fromSlot,to:name};
  }
  return null;
 }
 function updateDrag(event){
  if(!drag||event.pointerId!==drag.pointerId)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(Math.hypot(dx,dy)>7)drag.moved=true;
  drag.target=locateTarget(event.clientX,event.clientY);
  clearTargets();
  if(drag.target?.type==='swap')slots.get(drag.target.to).classList.add('panel-drop-target');
  if(drag.target?.type==='remove')help.get(drag.fromId).trash.classList.add('panel-trash-hot');
 }
 function onGripDown(event,id,button){
  if(drag||!slotFor(id)||(event.pointerType==='mouse'&&event.button!==0))return;
  event.preventDefault();
  closeMenu();
  // Description and trash appear together while the info icon is held.
  drag={fromId:id,fromSlot:slotFor(id),pointerId:event.pointerId,
   startX:event.clientX,startY:event.clientY,target:null};
  try{button.setPointerCapture?.(event.pointerId);}catch(_){}
  refreshHelp();
 }
 function onMove(event){
  if(!drag||event.pointerId!==drag.pointerId)return;
  if(event.cancelable)event.preventDefault();
  updateDrag(event);
 }
 function onUp(event){
  if(!drag||event.pointerId!==drag.pointerId)return;
  if(event.cancelable)event.preventDefault();
  updateDrag(event);
  const target=drag.target;
  if(target)commit(target);
  else{clearTargets();drag=null;refreshHelp();}
 }
 function cancel(){drag=null;clearTargets();closeMenu();refreshHelp();}
 function onClick(event){
  const choice=event.target.closest('[data-panel-add-option]');
  if(choice){
   const from=choice.dataset.targetSlot,id=choice.dataset.panelAddOption;
   if(menuSlot===from)commit({type:'add',from,panel:id});
   event.preventDefault();event.stopPropagation();return;
  }
  const plus=event.target.closest('[data-panel-add-button]');
  if(plus){
   const name=plus.dataset.panelAddButton;
   if(menuSlot===name)closeMenu();else openMenu(name);
   event.preventDefault();event.stopPropagation();return;
  }
  // A quick tap never leaves the trash visible after release.
  if(menuSlot!==null&&!event.target.closest('.panel-add-menu'))closeMenu();
 }
 // Suppress scrolling only for pointer sequences that begin on an info icon.
 function onTouchMove(event){
  if(drag&&event.cancelable)event.preventDefault();
 }
 doc.addEventListener('pointermove',onMove,true);
 doc.addEventListener('pointerup',onUp,true);
 doc.addEventListener('pointercancel',event=>{
  if(drag?.pointerId===event.pointerId)cancel();
 },true);
 doc.addEventListener('lostpointercapture',event=>{
  if(drag?.pointerId===event.pointerId)cancel();
 },true);
 doc.addEventListener('touchmove',onTouchMove,{passive:false,capture:true});
 doc.addEventListener('click',onClick,true);
 doc.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
 doc.defaultView?.addEventListener('blur',cancel);
 // When only some panels exist, empty slots may still offer the available components.
 for(const [name,slot] of slots)if(!layout[name])slot.replaceChildren(makePlus(name));
 refreshSlotMeta();refreshHelp();
 return {getLayout:()=>({...layout})};
}
