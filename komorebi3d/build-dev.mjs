#!/usr/bin/env node
// Build product, lightweight web mock, or a self-contained chat-ready mock.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const modeArgs=process.argv.filter(arg=>arg.startsWith('--mode='));
if(modeArgs.length>1)throw Error('Specify --mode only once');
const mode=modeArgs[0]?.slice('--mode='.length)??'product';
if(!['product','mock','chat'].includes(mode))throw Error('Unknown mode: '+mode);
const chat=mode==='chat';
const mock=mode!=='product';
const panelIds=mock?['build','game','test','runtime']:['build','game','test','runtime'];
const variant=id=>mock&&['game','test'].includes(id)?id+'.mock':id;
const names=['common',...panelIds.map(variant),...(mock?['mock-layout']:[])];
const read=path=>readFileSync(join(dir,path),'utf8');
const split=css=>{
 const pos=css.indexOf('@media ');
 return pos<0?[css.trim(),'']:[css.slice(0,pos).trim(),css.slice(pos).trim()];
};
const cssPath=name=>name==='common'?'common.css':name==='mock-layout'?'mock-layout.css':'panels/'+name+'.css';
// Keep production CSS byte-for-byte identical while excluding dev styles from mocks.
const commonCSS=read('common.css')+(mock?'':read('dev-layout.css'));
const pieces=names.map(name=>split(name==='common'?commonCSS:read(cssPath(name))));
const css=[...pieces.map(x=>x[0]),...pieces.map(x=>x[1])].filter(Boolean).join('\n\n');
let html=read(mock?'mock.template.html':'dev.template.html');
if(!mock){
 // Inline object fragments verbatim into their original game script scope.
 for(const path of ['objects/forest/layout.js','objects/trees/tree-v1.js','objects/trees/tree-v2.js','objects/trees/tree-v3.js','objects/buildings/house.js','objects/buildings/cafe.js','objects/forest/details.js','objects/characters/ghost-helicopter.js']){
  const marker='/* @object:'+path+' */';
  if(!html.includes(marker))throw Error('Missing object '+path);
  html=html.replace(marker,read(path));
 }
 if(html.includes('/* @object:'))throw Error('Unresolved object placeholder');
}
if(!html.includes('/* @component-styles */'))throw Error('Missing CSS placeholder');
html=html.replace('/* @component-styles */',css);
for(const id of panelIds){
 const marker='<!-- @panel:'+id+' -->';
 if(!html.includes(marker))throw Error('Missing panel '+id);
 let panelHtml=read('panels/'+variant(id)+'.html').trimEnd();
 if(mock&&id==='runtime'){
  const endHeading='</h2>';
  if(!panelHtml.includes(endHeading))throw Error('Missing runtime heading');
  panelHtml=panelHtml.replace(endHeading,endHeading+'<p class="mock-runtime-notice">🧪 モック表示：下記のステータスは実際のEngineとは連動していません。</p>');
 }
 html=html.replace(marker,panelHtml);
}
if(html.includes('<!-- @panel:')||html.includes('/* @component-styles */'))throw Error('Unresolved placeholder');
if(chat){
 // Inline the canonical layout editor in a classic script for chat HTML sandboxes.
 // Keep its runtime logic intact: only the ES-module export prefixes are removed.
 const editor=read('dev-panel-layout.js');
 if(/^\s*import\b/m.test(editor))throw Error('Chat mock needs a dependency-free editor');
 const standalone=editor.replace(/^export (?=(?:const|function)\b)/gm,'');
 if(/^\s*export\b/m.test(standalone))throw Error('Unsupported editor export syntax');
 const moduleTag='<script type="module">';
 const importRule=/^import \{mountPanelLayoutEditor\} from '\.\/dev-panel-layout\.js\?v=[^']+';$/gm;
 if(!html.includes(moduleTag)||[...html.matchAll(importRule)].length!==1)
  throw Error('Expected exactly one mock layout editor import');
 html=html.replace(moduleTag,'<script>').replace(importRule,standalone.trimEnd());
 // The output is an embeddable fragment: no document-level wrapper or external JS.
 const start=html.indexOf('<style>');
 if(!html.startsWith('<!doctype html>')||start<0||!html.includes('</head><body>')||!/<\/body><\/html>\s*$/.test(html))
  throw Error('Unexpected mock document wrapper');
 html=html.slice(start).replace('</head><body>','').replace(/<\/body><\/html>\s*$/,'');
}
const outputName=chat?'mock.chat.html':mock?'mock.html':'dev.html';
const output=join(dir,outputName);
if(process.argv.includes('--check')){
 let actual='';
 try{actual=readFileSync(output,'utf8')}catch{}
 if(actual!==html){console.error(outputName+' out of sync; run node komorebi3d/build-dev.mjs'+(mode==='product'?'':' --mode='+mode));process.exitCode=1;}
 else console.log(outputName+' sync: OK');
}else{writeFileSync(output,html,'utf8');console.log('Updated '+outputName);}
