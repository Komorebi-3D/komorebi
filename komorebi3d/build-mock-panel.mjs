#!/usr/bin/env node
// Generated mock stays in sync with the canonical dev.html, without a game engine.
// No third-party dependencies and no automatic GitHub commits.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const input=join(dir,'dev.html'),output=join(dir,'mock-panel.html');

const generateMock=function generateMock(source){
 const styleEnd=source.indexOf('</style>');
 const bodyStart=source.indexOf('<body>',styleEnd);
 const firstScript=source.indexOf('<script>',bodyStart);
 const layout=source.match(/const PANEL_LAYOUT=Object\.freeze\((\{[^;\n]+\})\);/);
 if(styleEnd<0||bodyStart<0||firstScript<0||!layout)throw new Error('Canonical dev.html structure changed');
 const mockCss=String.raw`
/* Mock-only presentation: leave every canonical panel and layout rule intact. */
#launch-diagnostic{display:none}
.landscape-game .play-surface{background:#000}
.landscape-game .views canvas{background:#000}
.landscape-game .debug-map{display:none !important}
.landscape-game .touch-layer{pointer-events:none}
`;
 const markup=source.slice(0,styleEnd)+mockCss+source.slice(styleEnd,firstScript);
 return markup+`
<script type="module">
import {mountTestControlsPanel} from "./dev-panel-components.js";
import {mountPanelLayoutEditor} from "./dev-panel-layout.js";
const PANEL_LAYOUT=Object.freeze(${layout[1]});
mountTestControlsPanel(document.querySelector('#test-ops-panel'));
mountPanelLayoutEditor(document,PANEL_LAYOUT);
</script></body></html>
`;
};

const result=generateMock(readFileSync(input,'utf8'));
if(process.argv.includes('--check')){
 let current='';
 try{current=readFileSync(output,'utf8');}catch{}
 if(current!==result){
  console.error('mock-panel.html is out of sync; run: node komorebi3d/build-mock-panel.mjs');
  process.exitCode=1;
 }else console.log('Mock panel sync: OK');
}else{
 writeFileSync(output,result,'utf8');
 console.log('Updated komorebi3d/mock-panel.html');
}
