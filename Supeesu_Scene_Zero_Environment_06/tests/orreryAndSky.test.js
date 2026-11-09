import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAY_MS, DIAL_RINGS, TAU, seekByRotation, wrappedAngleDelta, ringProgress } from '../src/time/dialMath.js';
import { resolveSky } from '../src/environment/skyConditions.js';
import { WorldClock } from '../src/time/worldClock.js';

const environment = JSON.parse(readFileSync(new URL('../scenes/living-pool/environment.json', import.meta.url)));
test('orrery scales are reversible and differ by defined factors', () => {
  const start = new Date('2027-01-29T12:00:00').getTime();
  assert.equal(seekByRotation(start, 'day', TAU), start + DAY_MS);
  assert.equal(seekByRotation(start, 'microseason', TAU), start + 7 * DAY_MS);
  assert.equal(seekByRotation(start, 'ecology', TAU), start + 800 * DAY_MS);
  assert.equal(seekByRotation(seekByRotation(start,'day',TAU/4),'day',-TAU/4),start);
  assert.equal(DIAL_RINGS.day.keyboardStepMs, 30 * 60_000);
});
test('angle delta unwraps across the twelve-o-clock seam', () => {
  assert.ok(wrappedAngleDelta(-Math.PI + .07, Math.PI - .04) > 0);
  assert.ok(wrappedAngleDelta(Math.PI - .07, -Math.PI + .04) < 0);
});
test('world dial phase is consistent for negative cycles', () => {
  assert.equal(ringProgress(0,'ecology',-81),719/800);
  assert.equal(ringProgress(0,'microseason',-7),0);
  assert.ok(ringProgress(new Date('2026-11-09T12:00:00').getTime(),'day',-81) > .49);
});
test('world dial changes simulated time without modifying a real clock', () => {
  let now=1770000000000;
  const real = {nowMs:()=>now};
  const world = new WorldClock(real);
  const original=real.nowMs();
  world.seek(seekByRotation(world.nowMs(),'day',TAU/2));
  world.pause();
  now+=100_000;
  assert.equal(real.nowMs(),original+100_000);
  assert.equal(world.nowMs(),original+DAY_MS/2);
});
test('sky colors meet at midnight and provisional moon placement is deferred', () => {
  const a=resolveSky(0,environment.skyColorKnots),b=resolveSky(1440,environment.skyColorKnots);
  assert.equal(a.top,b.top); assert.equal(a.horizon,b.horizon);
  assert.equal(resolveSky(780,environment.skyColorKnots).sun.visible,true);
  assert.equal(resolveSky(780,environment.skyColorKnots).moon.visible,false);
  assert.equal(resolveSky(1400,environment.skyColorKnots).sun.visible,false);
  assert.equal(resolveSky(1400,environment.skyColorKnots).moon.visible,false);
  assert.equal(resolveSky(1400,environment.skyColorKnots).moon.model,'position-deferred-universe-map');
  assert.ok(resolveSky(1400,environment.skyColorKnots).stars>0);
});
test('sun visibly climbs from horizon to midday', () => {
  const sunrise=resolveSky(360,environment.skyColorKnots).sun;
  const noon=resolveSky(750,environment.skyColorKnots).sun;
  const sunset=resolveSky(1140,environment.skyColorKnots).sun;
  assert.ok(noon.y<sunrise.y && noon.y<sunset.y);
  assert.ok(sunrise.x<noon.x && noon.x<sunset.x);
});
