import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PersonalStore,defaultRecords} from '../src/store.js';
import {restoreHistoricalWeekOnce,markWeekInitialized,WEEK_RESTORE_KEY} from '../src/weekRestore.js';
const reference=JSON.parse(readFileSync(new URL('../data/quiet-hours-reference.json',import.meta.url),'utf8'));
const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const init=s=>new PersonalStore(s,defaultRecords([]));
test('fresh browser gets historical weekly rhythm automatically, only once',()=>{
 const s=storage(),d=init(s);const r=restoreHistoricalWeekOnce(s,d,reference);
 assert.equal(r.status,'restored');assert.equal(d.data.events.length,reference.events.length);
 const second=init(s);assert.equal(second.data.events.length,reference.events.length);
 assert.equal(restoreHistoricalWeekOnce(s,second,reference).status,'previously-initialized');
});
test('existing events never overwritten and auto-import is skipped',()=>{
 const s=storage(),d=init(s);d.update(x=>x.events=[{id:'custom',title:'Custom',repeat:'weekly',days:[1],start:'08:00',end:'09:00'}]);
 assert.equal(restoreHistoricalWeekOnce(s,d,reference).status,'existing-schedule');assert.equal(d.data.events.length,1);
});
test('deleting entire week does not resurrect events on next tab',()=>{
 const s=storage(),d=init(s);restoreHistoricalWeekOnce(s,d,reference);d.update(x=>x.events=[]);
 const reopened=init(s);assert.equal(restoreHistoricalWeekOnce(s,reopened,reference).added,0);assert.deepEqual(reopened.data.events,[]);
});
test('user-managed empty calendar remains empty',()=>{
 const s=storage();markWeekInitialized(s);const d=init(s);
 assert.equal(restoreHistoricalWeekOnce(s,d,reference).added,0);assert.equal(d.data.events.length,0);
});
test('historical data validation excludes malformed records',()=>{
 const s=storage(),d=init(s);const r=restoreHistoricalWeekOnce(s,d,{events:[{id:'x',title:'Broken',start:'bad',end:'bad',days:[1]}]});
 assert.equal(r.added,0);assert.equal(s.getItem(WEEK_RESTORE_KEY),'no-valid-reference-events');
});
