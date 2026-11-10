import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthCells,dateISO,dayEvents,scheduleKinds,shiftCivil} from '../integrations/quiet-hours-helm/calendarModel.mjs';
import {previewHistorical} from '../src/historicalImport.js';
const source=JSON.parse(readFileSync(new URL('../data/quiet-hours-reference.json',import.meta.url),'utf8'));
test('month grid is 42 cells, Monday first and crosses years',()=>{
 const cells=monthCells(2026,0);assert.equal(cells.length,42);assert.equal(cells[0].getDay(),1);assert.equal(dateISO(cells[0]),'2025-12-29');
});
test('month grid includes leap February 29',()=>{const days=monthCells(2028,1);assert.ok(days.some(d=>dateISO(d)==='2028-02-29'));});
test('civil day stepping retains local date across DST',()=>{
 const d=new Date(2026,2,7,12);assert.equal(dateISO(shiftCivil(d,2)),'2026-03-09');
});
test('weekly and one-time events appear on correct dates',()=>{
 const schedule={events:[{id:'a',title:'Routine',days:[1],start:'08:00',end:'09:00'}]};
 const plan={exceptions:[{id:'b',title:'One-off',date:'2026-11-09',start:'07:00',end:'08:00'}],overrides:{}};
 assert.deepEqual(dayEvents(schedule,plan,new Date(2026,10,9,12)).map(x=>x.id),['b','a']);
 assert.deepEqual(dayEvents(schedule,plan,new Date(2026,10,10,12)),[]);
});
test('per-date removal override does not delete routine',()=>{
 const schedule={events:[{id:'a',title:'Routine',days:[1],start:'08:00',end:'09:00'}]};
 const planning={exceptions:[],overrides:{'2026-11-09':{'a@2026-11-09':{removed:true}}}};
 assert.equal(dayEvents(schedule,planning,new Date(2026,10,9,12)).length,0);
 assert.equal(dayEvents(schedule,planning,new Date(2026,10,16,12)).length,1);
});
test('historical import adds missing IDs without replacing existing',()=>{
 const existing=[{id:'wake-weekday',title:'Changed by user'}];const preview=previewHistorical(source,existing);
 assert.equal(preview.sourceCount,source.events.length);assert.equal(preview.collisionCount,1);
 assert.ok(!preview.additions.some(x=>x.id==='wake-weekday'));
 assert.ok(preview.additions.every(x=>x.repeat==='weekly'));
});
test('rituals, modes and routines are distinct views',()=>{
 const x=scheduleKinds([{id:'a',category:'ritual',days:[1]},{id:'b',kind:'mode',days:[2]},{id:'c',kind:'routine',days:[3]}]);
 assert.equal(x.rituals.length,1);assert.equal(x.modes.length,1);assert.equal(x.routines.length,1);
});

test('nested monthly instrument has a path and receives local schedule',()=>{
 const source=readFileSync(new URL('../integrations/quiet-hours-helm/long-voyage/voyage-instruments.js',import.meta.url),'utf8');
 assert.match(source,/'month'/);
 const html=readFileSync(new URL('../integrations/quiet-hours-helm/index.html',import.meta.url),'utf8');
 assert.match(html,/defer src="helm-runtime.js"/);
 const runtime=readFileSync(new URL('../integrations/quiet-hours-helm/helm-runtime.js',import.meta.url),'utf8');
 assert.match(runtime,/function renderMap/);assert.match(runtime,/function renderMonth/);assert.match(runtime,/function renderRitualModes/);
 assert.doesNotMatch(runtime,/^import /m);
});
test('Parent supports additive historical import and nested event editing',()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/supeesu:request-historical-import/);
 assert.match(source,/supeesu:edit-shared-event/);
 assert.match(source,/historicalImportPreview/);
});

test('semantic mode role survives the original weekly editor boundary',async()=>{
 const {toQuietHours,fromQuietHours}=await import('../src/quietHoursBridge.js');
 const e={id:'mode-1',title:'Deep Work',kind:'mode',repeat:'weekly',days:[2],start:'09:00',end:'10:00',category:'focus'};
 const wrapped=toQuietHours([e]);assert.equal(wrapped.events[0].kind,'mode');
 const restored=fromQuietHours(wrapped,[e]);assert.equal(restored[0].kind,'mode');
});
