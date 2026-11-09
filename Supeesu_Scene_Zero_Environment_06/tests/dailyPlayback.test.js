import test from 'node:test';
import assert from 'node:assert/strict';
import { DailyPlaybackPolicy, dailyPlaybackEligibility, DAILY_PLAYBACK_LEDGER_KEY } from '../src/audio/dailyPlaybackPolicy.js';
import { PondSoundscape } from '../src/audio/soundscape.js';
const localMs = text => new Date(text).getTime();
const makeStorage = () => {
  const db = new Map();
  return { getItem: k => db.get(k) ?? null, setItem: (k, v) => db.set(k, v), db };
};

test('daily session advances at 05:30 local, never at midnight', () => {
  const storage = makeStorage();
  let now = localMs('2026-11-09T05:29:59');
  const policy = new DailyPlaybackPolicy({ clock: { nowMs: () => now }, storage });
  assert.equal(policy.eligibility().sessionId, '2026-11-08');
  now = localMs('2026-11-09T05:30:00');
  assert.equal(policy.eligibility().sessionId, '2026-11-09');
  assert.equal(policy.eligibility().eligible, true);
  policy.markActualPlaybackSuccess(true);
  assert.equal(policy.eligibility().eligible, false);
  assert.equal(storage.db.get(DAILY_PLAYBACK_LEDGER_KEY).includes('2026-11-09'), true);
});
test('failed playback does not write ledger; simulated controllers cannot write ledger', () => {
  const storage = makeStorage();
  const clock = { nowMs: () => localMs('2026-11-09T14:00:00') };
  const prod = new DailyPlaybackPolicy({ clock, storage });
  assert.throws(() => prod.markActualPlaybackSuccess(false));
  assert.equal(storage.db.size, 0);
  const lab = new DailyPlaybackPolicy({ clock, storage, enabled: false });
  assert.throws(() => lab.markActualPlaybackSuccess(true));
  assert.equal(storage.db.size, 0);
});
test('session eligibility is derived without writing to storage', () => {
  const expected = dailyPlaybackEligibility(localMs('2026-11-09T14:00:00'), { lastSuccessfulSession: '2026-11-08' });
  assert.equal(expected.eligible, true);
  assert.equal(expected.recordedSuccess, false);
});
test('audio source instances operate independently and ownership is released after stop', async () => {
  let acquired = 0, released = 0;
  const audio = () => ({ paused: true, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } });
  const sound = new PondSoundscape({
    sources: { ambience: 'ambience.wav', music: 'music.wav', splash: 'splash.wav' },
    audioFactory: audio,
    ownership: { acquire: async () => { acquired++; return true; }, release: () => { released++; } }
  });
  assert.equal(await sound.start(), true);
  await sound.toggleMusic();
  assert.equal(sound.track('ambience').paused, false);
  assert.equal(sound.track('music').paused, false);
  await sound.toggleMusic();
  assert.equal(sound.track('ambience').paused, false);
  assert.equal(sound.track('music').paused, true);
  sound.stop();
  assert.equal(sound.track('ambience').paused, true);
  assert.equal(acquired, 1);
  assert.equal(released, 1);
});
test('autoplay denial returns false and releases ownership without claiming success', async () => {
  let releases = 0;
  const sound = new PondSoundscape({
    sources: { ambience: 'x', music: 'y', splash: 'z' },
    audioFactory: () => ({ paused: true, play: async () => { throw new Error('NotAllowedError'); }, pause() {} }),
    ownership: { acquire: async () => true, release: () => { releases++; } }
  });
  assert.equal(await sound.start(), false);
  assert.equal(sound.active, false);
  assert.equal(releases, 1);
});
