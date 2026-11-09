#!/usr/bin/env node
// Build the canonical page from independent panel HTML/CSS (no runtime fetching).
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const names=['common','build','game','test','runtime'];
const read=path=>readFileSync(join(dir,path),'utf8');
const split=css=>{
 const pos=css.indexOf('@media ');
 return pos<0?[css.trim(),'']:[css.slice(0,pos).trim(),css.slice(pos).trim()];
};
const pieces=names.map(name=>split(read(name==='common'?'common.css':'panels/'+name+'.css')));
const css=[...pieces.map(x=>x[0]),...pieces.map(x=>x[1])].filter(Boolean).join('\n\n');
let html=read('dev.template.html');
if(!html.includes('/* @component-styles */'))throw Error('Missing CSS placeholder');
html=html.replace('/* @component-styles */',css);
for(const name of names.slice(1)){
 const marker='<!-- @panel:'+name+' -->';
 if(!html.includes(marker))throw Error('Missing panel '+name);
 html=html.replace(marker,read('panels/'+name+'.html').trimEnd());
}
if(html.includes('<!-- @panel:')||html.includes('/* @component-styles */'))throw Error('Unresolved placeholder');
const output=join(dir,'dev.html');
if(process.argv.includes('--check')){
 let actual='';
 try{actual=readFileSync(output,'utf8')}catch{}
 if(actual!==html){console.error('dev.html out of sync; run node komorebi3d/build-dev.mjs');process.exitCode=1;}
 else console.log('Developer page sync: OK');
}else{writeFileSync(output,html,'utf8');console.log('Updated developer page');}
