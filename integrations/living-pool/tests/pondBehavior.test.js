import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fishPose, scheduledSplashesForDay, SplashTimeline } from '../src/behavior/pondBehavior.js';
import { splashRateMultiplier } from '../src/environment/environmentResolver.js';
const manifest = JSON.parse(readFileSync(new URL('../scenes/living-pool/scene.json', import.meta.url)));
const profile = JSON.parse(readFileSync(new URL('../scenes/living-pool/environment.json', import.meta.url)));
const behavior = profile.splashBehavior;
const rate = minute => splashRateMultiplier(minute, behavior);

test('fish have deterministic and independently phased poses at an arbitrary instant', () => {
  const time = new Date('2028-03-04T16:32:10').getTime();
  const poses = manifest.fish.map(fish => fishPose(fish, time, .65));
  assert.deepEqual(manifest.fish.map(fish => fishPose(fish, time, .65)), poses);
  assert.equal(new Set(poses.map(pose => pose.x)).size, 3);
});
test('seeded splash events reconstruct identically across separate schedulers', () => {
  const a = scheduledSplashesForDay('2027-02-07', behavior, rate);
  const b = scheduledSplashesForDay('2027-02-07', behavior, rate);
  assert.ok(a.length > 0);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, scheduledSplashesForDay('2027-02-08', behavior, rate));
});
test('seek does not trigger a catch-up splash burst', () => {
  const events = scheduledSplashesForDay('2027-02-07', behavior, rate);
  const timeline = new SplashTimeline(behavior, rate, 'living-pool');
  timeline.sample(events[0].atMs - 1, '2027-02-07');
  timeline.resetOnSeek();
  assert.deepEqual(timeline.sample(events.at(-1).atMs + 200, '2027-02-07', { allowLiveEvents: true }).triggered, []);
});
test('normal forward tick can emit one already-scheduled event exactly once', () => {
  const event = scheduledSplashesForDay('2027-02-07', behavior, rate)[0];
  const timeline = new SplashTimeline(behavior, rate, 'living-pool');
  timeline.sample(event.atMs - 100, '2027-02-07');
  const sample = timeline.sample(event.atMs + 100, '2027-02-07', { allowLiveEvents: true });
  assert.equal(sample.triggered[0].id, event.id);
  assert.equal(timeline.sample(event.atMs + 300, '2027-02-07', { allowLiveEvents: true }).triggered.length, 0);
});

test('fish swim within smaller orbits during low-activity times', () => {
  const fish = manifest.fish[0];
  const t = new Date('2027-02-07T18:30:00').getTime();
  const low = fishPose(fish, t, 0.1);
  const high = fishPose(fish, t, 0.9);
  const distance = pose => Math.hypot(pose.x - fish.center[0], pose.y - fish.center[1]);
  assert.ok(distance(low) < distance(high));
});
