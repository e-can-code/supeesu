import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {instrumentPath,INSTRUMENTS} from '../integrations/quiet-hours-helm/long-voyage/voyage-instruments.js';
import {todaySchedule,currentAndNext,SCHEDULE_KEY,PLANNING_KEY} from '../integrations/quiet-hours-helm/long-voyage/voyage-schedule.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Long Voyage original art and original chapter logic preserved',()=>{const html=read('../integrations/quiet-hours-helm/long-voyage/index.html');assert.match(html,/CHAPTER=36\*3600000/);assert.match(html,/crystalButton/);assert.match(html,/CELESTIAL CHART/);assert.match(html,/window.LongVoyageUI/)});
test('Helm shell enters Long Voyage',()=>assert.match(read('../src/app.js'),/quiet-hours-helm\/long-voyage\/index.html/));
test('instrument paths are validated',()=>{for(const v of INSTRUMENTS)assert.equal(instrumentPath(v),'../index.html?instrument='+v);assert.throws(()=>instrumentPath('invalid'))});
test('original Quiet Hours map and planning preserved',()=>{const js=read('../integrations/quiet-hours-helm/helm.js');assert.match(js,/function renderMap/);assert.match(js,/function renderPatterns/);assert.match(js,/function renderOperations/);assert.match(js,/instrumentView/)});
test('weekly and one-time events both appear in Helm summary',()=>{
 const data={
 [SCHEDULE_KEY]:JSON.stringify({events:[{id:'weekly',title:'Practice',days:[1],start:'09:00',end:'10:00'}]}),
 [PLANNING_KEY]:JSON.stringify({exceptions:[{id:'once',title:'Meeting',date:'2026-11-09',start:'11:00',end:'12:00'}],overrides:{}})
 };
 const storage={getItem:k=>data[k]||null};const now=new Date(2026,10,9,8,0);const events=todaySchedule(storage,now);assert.equal(events.length,2);assert.equal(currentAndNext(events,now).next.title,'Practice');
});
test('accepted day override removes event from summary',()=>{
 const data={[SCHEDULE_KEY]:JSON.stringify({events:[{id:'weekly',title:'Practice',days:[1],start:'09:00',end:'10:00'}]}),[PLANNING_KEY]:JSON.stringify({exceptions:[],overrides:{'2026-11-09':{'weekly@2026-11-09':{removed:true}}}})};
 const storage={getItem:k=>data[k]||null};assert.equal(todaySchedule(storage,new Date(2026,10,9)).length,0);
});
