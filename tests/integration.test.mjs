import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('Bundled real Living Pool entrypoint exists',()=>assert.ok(existsSync(new URL('integrations/living-pool/scene/index.html',root))));
test('Bundled pool includes calendar and audio source',()=>{
 assert.ok(existsSync(new URL('integrations/living-pool/calendar/calendar.json',root)));
 assert.ok(existsSync(new URL('integrations/living-pool/src/audio/pondWebAudio.js',root)));
});
test('Bridge uses nested scene entrypoint and stops parent audio',()=>{
 const app=read('src/app.js');
 assert.match(app,/integrations\/living-pool\/scene\/index\.html/);
 assert.match(app,/function enterPool\(\)\{if\(audioOn\)/);
 assert.match(app,/if\(current\.locationId==='pool'\)enterPool\(\)/);
});
test('Recovered Helm and original disruption planner are bundled and connected through an adapter',()=>{
 assert.ok(existsSync(new URL('integrations/quiet-hours-helm/operations/planner.js',root)));
 assert.match(read('src/app.js'),/function enterHelm/);
 assert.match(read('src/quietHoursBridge.js'),/fromQuietPlanning/);
});
test('Event editor includes constraints',()=>{
 const app=read('src/app.js');
 for(const key of ['priority','minimumMinutes','canMove','canSplit','canSkip'])assert.match(app,new RegExp(key));
});
