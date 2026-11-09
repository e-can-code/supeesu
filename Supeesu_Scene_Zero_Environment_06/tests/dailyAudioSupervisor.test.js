import test from 'node:test';
import assert from 'node:assert/strict';
import { DailyAudioSupervisor } from '../src/audio/dailyAudioSupervisor.js';
import { DailyPlaybackPolicy, DAILY_PLAYBACK_LEDGER_KEY } from '../src/audio/dailyPlaybackPolicy.js';
import { WorldClock } from '../src/time/worldClock.js';

function harness(year = 2026, month = 10, day = 9, hour = 5, minute = 29) {
  let now = new Date(year, month, day, hour, minute).getTime();
  const clock = { nowMs: () => now };
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, val) => data.set(key, val) };
  const policy = new DailyPlaybackPolicy({clock, storage});
  const pending = [];
  let playing = false;
  let attempts = 0;
  let permitted = true;
  let canAttempt = true;
  const states=[];
  const supervisor = new DailyAudioSupervisor({ clock, policy, isPlaying: () => playing,
    canAttempt: () => canAttempt,
    tryStart: async () => { attempts++; if (permitted) playing = true; return permitted; },
    onState: (...args) => states.push(args),
    schedule: (fn, delay) => { const item = {fn, delay, canceled:false}; pending.push(item); return item; },
    cancel: item => { item.canceled = true; }
  });
  return {clock, data, policy, supervisor, states, pending,
    tick: ms => { now += ms; }, setTime: ms => {now = ms;},
    allow: val => {permitted=val;}, visible: val => {canAttempt=val;},
    setPlaying: val => {playing=val;}, get playing() {return playing;}, get attempts() {return attempts;}
  };
}

test('existing tab crosses 05:30 without consulting the World Clock', async () => {
  const t=harness();
  const world = new WorldClock(t.clock);
  world.seek(new Date(2034,0,29,23).getTime()); world.setRate(86400);
  t.supervisor.begin();
  await new Promise(setImmediate);
  assert.equal(t.attempts,1);
  const old=t.policy.eligibility().sessionId;
  assert.equal(t.data.has(DAILY_PLAYBACK_LEDGER_KEY),true);
  t.setPlaying(false);
  t.tick(60_000);
  await t.supervisor.check('05:30 boundary');
  assert.equal(t.attempts,2);
  assert.notEqual(t.policy.eligibility().sessionId,old);
  assert.equal(JSON.parse(t.data.get(DAILY_PLAYBACK_LEDGER_KEY)).lastSuccessfulSession,t.policy.eligibility().sessionId);
  t.supervisor.end();
});

test('blocked autoplay leaves pending state and no successful ledger', async () => {
  const t=harness();t.allow(false);
  t.supervisor.begin();await new Promise(setImmediate);
  assert.equal(t.supervisor.diagnostics.pending,true);
  assert.equal(t.data.has(DAILY_PLAYBACK_LEDGER_KEY),false);
  await t.supervisor.check('clock refresh');
  assert.equal(t.attempts,1);
  t.setPlaying(true);
  assert.equal(t.supervisor.noteManualPlaybackSuccess(),true);
  assert.equal(t.supervisor.diagnostics.pending,false);
  assert.equal(t.policy.eligibility().eligible,false);
  t.supervisor.end();
});

test('delayed hidden-tab session start is evaluated when the tab becomes visible', async () => {
  const t=harness();t.visible(false);
  t.supervisor.begin();await new Promise(setImmediate);
  assert.equal(t.attempts,0);
  assert.equal(t.supervisor.diagnostics.pending,true);
  t.visible(true);
  await t.supervisor.check('visibility');
  assert.equal(t.attempts,1);
  t.supervisor.end();
});

test('multiple tabs use one ledger; automatic success on first tab prevents restart in second', async () => {
  const t=harness();
  t.supervisor.begin();await new Promise(setImmediate);
  const other=new DailyAudioSupervisor({clock:t.clock,policy:t.policy, isPlaying:()=>false,tryStart:()=>{throw Error('duplicate');},
    schedule:()=>42,cancel:()=>{}});
  other.begin();await new Promise(setImmediate);
  assert.equal(other.diagnostics.eligible,false);
  other.end();t.supervisor.end();
});

test('playing at 05:30 records the new session without restarting the audio bed', async () => {
  const t=harness();t.supervisor.begin();await new Promise(setImmediate);
  t.tick(60_000);
  await t.supervisor.check('boundary');
  assert.equal(t.attempts,1);
  assert.equal(t.policy.eligibility().eligible,false);
  t.supervisor.end();
});

test('scheduling targets real upcoming boundary, including clock advances without visual frames', async () => {
  const t=harness(); t.allow(false);t.supervisor.begin();await new Promise(setImmediate);
  const current=t.pending.filter(item=>!item.canceled).at(-1);
  assert.ok(current.delay>0 && current.delay<=30_000);
  t.tick(60_000);
  await t.supervisor.check();
  const advanced=t.pending.filter(item=>!item.canceled).at(-1);
  assert.ok(advanced.delay>0 && advanced.delay<=30_000);
  t.supervisor.end();
  assert.equal(advanced.canceled,true);
});
