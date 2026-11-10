import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Quiet Hours instrument loads as classic script, not MIME-sensitive module',()=>{
 const html=read('../integrations/quiet-hours-helm/index.html');
 assert.match(html,/defer src="helm-runtime.js"/);
 assert.match(html,/instrument-mode/);
 assert.doesNotMatch(html,/type="module" src="helm.js"/);
});
test('Each view has an independent renderer and route',()=>{
 const js=read('../integrations/quiet-hours-helm/helm-runtime.js');
 for(const [name,fn] of [['today','renderToday'],['map','renderMap'],['month','renderMonth'],['rituals','renderRitualModes'],['patterns','renderPatterns'],['create','renderCreate']]){
  assert.ok(js.includes(`if(type==='${name}')${fn}(`),name);
 }
});
test('Runtime no longer relies on MJS loaded by embedded iframe',()=>{
 const js=read('../integrations/quiet-hours-helm/helm-runtime.js');
 assert.doesNotMatch(js,/^import /m);
 assert.doesNotMatch(js,/^export /m);
 assert.match(js,/const instrumentView/);
 assert.match(js,/instrumentLoading/);
});
