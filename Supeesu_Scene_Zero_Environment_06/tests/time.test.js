import test from 'node:test';
import assert from 'node:assert/strict';
import { RealClock } from '../src/time/realClock.js';
import { WorldClock } from '../src/time/worldClock.js';
import { SessionClock, sessionForInstant } from '../src/time/sessionClock.js';

const localMs = (year, month, day, hour, minute) => new Date(year, month - 1, day, hour, minute).getTime();

test('real clock delegates to the supplied source', () => {
  let now = 100;
  const clock = new RealClock(() => now);
  assert.equal(clock.nowMs(), 100);
  now = 900;
  assert.equal(clock.nowMs(), 900);
});

test('world clock simulation is continuous through rate changes', () => {
  let realMs = 10_000;
  const real = new RealClock(() => realMs);
  const world = new WorldClock(real);
  assert.equal(world.nowMs(), 10_000);
  world.seek(100_000);
  world.setRate(60);
  realMs += 500;
  assert.equal(world.nowMs(), 130_000);
  world.setRate(10);
  assert.equal(world.nowMs(), 130_000);
  realMs += 1_000;
  assert.equal(world.nowMs(), 140_000);
  assert.equal(real.nowMs(), 11_500);
});

test('world clock pauses, resumes and returns to actual time without changing its source', () => {
  let now = 3000;
  const real = new RealClock(() => now);
  const world = new WorldClock(real);
  world.seek(6000);
  world.setRate(10);
  now += 100;
  world.pause();
  assert.equal(world.nowMs(), 7000);
  now += 1200;
  assert.equal(world.nowMs(), 7000);
  world.resume();
  now += 100;
  assert.equal(world.nowMs(), 8000);
  world.useRealTime();
  assert.equal(world.nowMs(), now);
  assert.equal(world.getState().mode, 'real');
});

test('invalid simulation speeds and instants are rejected', () => {
  const world = new WorldClock(new RealClock(() => 0));
  assert.throws(() => world.setRate(-1), RangeError);
  assert.throws(() => world.seek(Infinity), TypeError);
});

test('session day changes at exactly 05:30, not midnight', () => {
  const before = sessionForInstant(localMs(2027, 1, 29, 5, 29));
  const at = sessionForInstant(localMs(2027, 1, 29, 5, 30));
  const afterMidnight = sessionForInstant(localMs(2027, 1, 30, 0, 1));
  assert.equal(before.id, '2027-01-28');
  assert.equal(at.id, '2027-01-29');
  assert.equal(afterMidnight.id, '2027-01-29');
  assert.equal(before.endsAtMs, at.startsAtMs);
});

test('production and simulation session clocks are isolated by their sources', () => {
  const real = new RealClock(() => localMs(2027, 1, 29, 5, 29));
  const simulated = new WorldClock(real);
  const actualDay = new SessionClock(real);
  const previewDay = new SessionClock(simulated);
  assert.equal(actualDay.current().id, '2027-01-28');
  simulated.seek(localMs(2027, 7, 29, 19, 0));
  assert.equal(previewDay.current().id, '2027-07-29');
  assert.equal(actualDay.current().id, '2027-01-28');
});

test('local 05:30 sessions span daylight saving transitions correctly', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'America/Denver';
    const spring = sessionForInstant(localMs(2027, 3, 13, 6, 0));
    const fall = sessionForInstant(localMs(2027, 11, 6, 6, 0));
    assert.equal((spring.endsAtMs - spring.startsAtMs) / 3_600_000, 23);
    assert.equal((fall.endsAtMs - fall.startsAtMs) / 3_600_000, 25);
    assert.equal(spring.boundaryLocalTime, '05:30');
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});
