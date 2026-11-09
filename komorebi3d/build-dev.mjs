#!/usr/bin/env node
// Build the product page by default, or a lightweight two-panel mock with --mode=mock.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const modeArgs=process.argv.filter(arg=>arg.startsWith('--mode='));
if(modeArgs.length>1)throw Error('Specify --mode only once');
const mode=modeArgs[0]?.slice('--mode='.length)??'product';
if(!['product','mock'].includes(mode))throw Error('Unknown mode: '+mode);
const mock=mode==='mock';
const panelIds=mock?['build','game']:['build','game','test','runtime'];
const variant=id=>mock&&id==='game'?'game.mock':id;
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
if(!html.includes('/* @component-styles */'))throw Error('Missing CSS placeholder');
html=html.replace('/* @component-styles */',css);
for(const id of panelIds){
 const marker='<!-- @panel:'+id+' -->';
 if(!html.includes(marker))throw Error('Missing panel '+id);
 html=html.replace(marker,read('panels/'+variant(id)+'.html').trimEnd());
}
if(html.includes('<!-- @panel:')||html.includes('/* @component-styles */'))throw Error('Unresolved placeholder');
const output=join(dir,mock?'mock.html':'dev.html');
if(process.argv.includes('--check')){
 let actual='';
 try{actual=readFileSync(output,'utf8')}catch{}
 if(actual!==html){console.error((mock?'mock.html':'dev.html')+' out of sync; run node komorebi3d/build-dev.mjs'+(mock?' --mode=mock':''));process.exitCode=1;}
 else console.log((mock?'Mock page':'Developer page')+' sync: OK');
}else{writeFileSync(output,html,'utf8');console.log('Updated '+(mock?'mock.html':'developer page'));}
