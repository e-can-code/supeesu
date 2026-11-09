import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WorldClock } from '../src/time/worldClock.js';
import { CalendarEngine } from '../src/calendar/calendarEngine.js';
import { EnvironmentResolver } from '../src/environment/environmentResolver.js';
import { approximateEarthMoonPhase, jadeMoonPhase, diagnosticWeather } from '../src/environment/diagnosticCycles.js';
import { DEFAULT_FLOW_RATE, FLOW_RATES, validatedFlowRate } from '../src/time/flowRates.js';

const root = new URL('../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const calData=json('calendar/calendar.json');
const envData=json('scenes/living-pool/environment.json');
const cal=new CalendarEngine(calData);
const env=new EnvironmentResolver(envData,calData);
const at=(date, dev=false) => {
  const ms=new Date(date).getTime();
  const snapshot=cal.describe(ms, {includeDevelopmentEvents:dev});
  return {snapshot, resolved:env.resolve(ms,snapshot)};
};

test('FLOW default travels one simulated hour per actual second',()=>{
  let time=0;
  const w=new WorldClock({nowMs:()=>time});
  w.seek(new Date('2027-01-29T12:00:00').getTime());
  w.setRate(DEFAULT_FLOW_RATE);
  time+=2000;
  assert.equal(DEFAULT_FLOW_RATE,3600);
  assert.equal((w.nowMs()-new Date('2027-01-29T12:00:00').getTime())/3600000,2);
  assert.deepEqual(FLOW_RATES,[1,60,3600,86400]);
  assert.throws(()=>validatedFlowRate('NaN'));
});
test('moon models are deterministic and distinguish earth estimate from jade design',()=>{
  const earth=approximateEarthMoonPhase(Date.parse('2027-01-29T12:00:00Z'));
  assert.equal(earth.model,'synodic-estimate-not-ephemeris');
  assert.ok(earth.phase>=0&&earth.phase<1);
  assert.equal(jadeMoonPhase(0,0).phase,0);
  assert.ok(Math.abs(jadeMoonPhase(18,0).illumination-1)<0.0001);
  assert.ok(jadeMoonPhase(-1,0).phase>=0);
});
test('daily tree growth is inactive before 05:30 and reaches maturity at 18:30',()=>{
  const a=at('2027-02-07T05:29:00').resolved.diagnostics.tree;
  const b=at('2027-02-07T05:30:00').resolved.diagnostics.tree;
  const c=at('2027-02-07T18:30:00').resolved.diagnostics.tree;
  assert.equal(a.dailyGrowth,0);assert.equal(b.dailyGrowthActive,true);
  assert.equal(c.dailyGrowthActive,false);assert.equal(c.dailyGrowth,1);
  assert.equal(c.februaryBloom,true);
});
test('5:30 simulated session boundary cannot alter real session or playback',()=>{
  const a=at('2027-01-29T05:29:00').resolved.diagnostics.sessionDay;
  const b=at('2027-01-29T05:30:00').resolved.diagnostics.sessionDay;
  assert.equal(a,'2027-01-28');assert.equal(b,'2027-01-29');
});
test('fictional rain and rainbow history reconstruct from arbitrary seeks',()=>{
  const r=diagnosticWeather('2027-02-05',780,0.6);
  const r2=diagnosticWeather('2027-02-05',780,0.6);
  assert.deepEqual(r,r2);assert.equal(r.raining,true);
  const rainbow=at('2027-01-29T10:11:00').resolved.diagnostics.weather;
  assert.equal(rainbow.rainbow,true);
  assert.equal(rainbow.model,'deterministic-synthetic-diagnostic');
});
test('8 seasons, 7/200/400-day rhythms, 800-day, and annual event all reach environment',()=>{
  for(let i=0;i<8;i++){
    const d=new Date(2027,0,29+i*100+45,12).getTime();
    const s=cal.describe(d),e=env.resolve(d,s);
    assert.equal(s.ecology.seasonIndex,i+1);
    assert.ok(e.diagnostics.rhythms.day200>=1&&e.diagnostics.rhythms.day200<=200);
    assert.ok(e.diagnostics.rhythms.day400>=1&&e.diagnostics.rhythms.day400<=400);
    assert.ok(e.diagnostics.microseason.day>=1&&e.diagnostics.microseason.day<=7);
  }
  const jan=at('2028-01-29T20:00:00');
  assert.ok(jan.resolved.eventTreatments.some(e=>e.id==='great-convergence'));
  const july=at('2027-07-29T19:00:00',true);
  assert.ok(july.resolved.eventTreatments.some(e=>e.id==='july-convergence-diagnostic'));
});
test('field guide has unique real scenarios covering every required testing category',()=>{
  const scenarios=json('dev/coverageScenarios.json').scenarios;
  const ids=scenarios.map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const group of ['Eight seasons','Day and night','Independent rhythms','Seven-day rhythm','Moons','Weather','Tree','Annual convergence','Historical cycle','Session']) {
    assert.ok(scenarios.some(s=>s.group===group),group);
  }
  for(const s of scenarios) assert.ok(Number.isFinite(new Date(s.worldLocalDateTime).getTime()),s.id);
});

test('first-200-day authored microseason profiles are available but never invented afterward',async()=>{
  const {MicroseasonCatalog}=await import('../src/calendar/microseasonCatalog.js');
  const catalog=new MicroseasonCatalog(json('calendar/source/microseasons_first_200_days.original.json'));
  const first=catalog.describe(cal.describe(new Date('2027-01-29T12:00:00').getTime()));
  assert.equal(first.id,'microseason_01');
  assert.ok(first.title.length>0);assert.equal(first.dailyWeight,.08);
  assert.equal(catalog.describe(cal.describe(new Date('2027-09-01T12:00:00').getTime())),null);
});

test('high-speed FLOW may show crossed splash events but never replays manual seeks',async()=>{
  const {crossedAcceleratedSplash}=await import('../src/behavior/acceleratedEvents.js');
  const hit=Date.parse('2027-01-29T20:00:00');
  const timeline={eventsForDay:()=>[{atMs:hit,id:'ripple-1',x:50,y:40}]};
  assert.equal(crossedAcceleratedSplash(hit-100,hit+100,timeline).id,'ripple-1');
  assert.equal(crossedAcceleratedSplash(hit+100,hit-100,timeline),null);
  assert.equal(crossedAcceleratedSplash(hit-100,hit+3*86_400_000,timeline),null);
});
