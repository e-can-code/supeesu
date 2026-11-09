import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CalendarEngine } from '../src/calendar/calendarEngine.js';
import { EnvironmentResolver, validateEnvironmentProfile, splashRateMultiplier, blendHex } from '../src/environment/environmentResolver.js';
import { validateSceneManifest } from '../src/visual/pondRenderer.js';

const calendarData = JSON.parse(readFileSync(new URL('../calendar/calendar.json', import.meta.url)));
const environmentData = JSON.parse(readFileSync(new URL('../scenes/living-pool/environment.json', import.meta.url)));
const sceneData = JSON.parse(readFileSync(new URL('../scenes/living-pool/scene.json', import.meta.url)));
const calendar = new CalendarEngine(calendarData);
const resolver = new EnvironmentResolver(environmentData, calendarData);
function at(localTime, dev = true) {
  const ms = new Date(localTime).getTime();
  return resolver.resolve(ms, calendar.describe(ms, { includeDevelopmentEvents: dev }));
}

test('environment and scene manifests validate without a browser', () => {
  assert.equal(validateEnvironmentProfile(environmentData, calendarData), true);
  assert.equal(validateSceneManifest(sceneData), true);
});
test('all eight canonical seasons receive independent palettes', () => {
  const sampleDate = new Date('2027-01-29T12:00:00');
  const colors = new Set();
  for (let i = 0; i < 8; i++) {
    const date = new Date(sampleDate.getFullYear(), sampleDate.getMonth(), sampleDate.getDate() + i * 100 + 50, 12);
    const e = at(date.getTime());
    colors.add(e.palettes.water);
    assert.equal(e.ecologicalSeason, calendarData.ecologicalSeasons[i].id);
    assert.ok(e.illumination >= 0 && e.illumination <= 1);
  }
  assert.equal(colors.size, 8);
});
test('continuous lighting is brighter in midday than at night', () => {
  const before = at('2027-02-07T04:00:00');
  const day = at('2027-02-07T13:00:00');
  const dusk = at('2027-02-07T18:30:00');
  assert.ok(day.illumination > dusk.illumination);
  assert.ok(dusk.illumination > before.illumination);
  assert.ok(dusk.warmth > day.warmth);
  assert.ok(day.fishActivity > before.fishActivity);
});
test('no discontinuity at midnight', () => {
  const before = at('2027-02-07T23:59:59');
  const after = at('2027-02-08T00:00:00');
  assert.ok(Math.abs(before.illumination - after.illumination) < 0.005);
});
test('splash likelihood rises to exactly 1.5x baseline and returns to baseline', () => {
  const config = environmentData.splashBehavior;
  assert.equal(splashRateMultiplier(1109, config), 1);
  assert.equal(splashRateMultiplier(1110, config), 1);
  assert.equal(splashRateMultiplier(1200, config), 1.5);
  assert.equal(splashRateMultiplier(1290, config), 1);
  assert.ok(splashRateMultiplier(1155, config) > 1);
});
test('annual event composes with the season without replacing season identity', () => {
  const e2026 = at('2026-01-29T20:00:00');
  const e2028 = at('2028-01-29T20:00:00');
  assert.equal(e2026.ecologicalSeason, 'copper-renewal');
  assert.equal(e2028.ecologicalSeason, 'high-radiance');
  assert.deepEqual(e2028.eventTreatments.map(e => e.id), ['great-convergence']);
  assert.notEqual(e2028.palettes.water, e2026.palettes.water);
  assert.notEqual(at('2028-01-29T20:00:00', false).eventTreatments.length, 0);
});
test('development-only July diagnostic does not become production event', () => {
  assert.deepEqual(at('2027-07-29T19:00:00', true).eventTreatments.map(e => e.id), ['july-convergence-diagnostic']);
  assert.deepEqual(at('2027-07-29T19:00:00', false).eventTreatments, []);
});
test('resolving dates is pure, stable, and independent of query order', () => {
  const a = at('2026-11-09T13:00:00');
  at('2028-01-29T20:00:00');
  assert.deepEqual(at('2026-11-09T13:00:00'), a);
});
test('color composition has deterministic, clamped endpoints', () => {
  assert.equal(blendHex('#000000', '#ffffff', -1), '#000000');
  assert.equal(blendHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(blendHex('#000000', '#ffffff', .5), '#808080');
});
test('bad time knots, missing palettes, and duplicate layer IDs are rejected', () => {
  const badKnots = structuredClone(environmentData); badKnots.timeKnots[0].illumination = .5;
  assert.throws(() => validateEnvironmentProfile(badKnots, calendarData));
  const badPalette = structuredClone(environmentData); delete badPalette.seasonPalettes['long-rains'];
  assert.throws(() => validateEnvironmentProfile(badPalette, calendarData));
  const badScene = structuredClone(sceneData); badScene.layers.push({ ...badScene.layers[0] });
  assert.throws(() => validateSceneManifest(badScene));
});
