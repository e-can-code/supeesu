import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeScenarioApplication,
  describeWorldMode,
  checkScenarioAssertions
} from '../dev/labPresentation.js';

const scenario = { id: 'prior-cycle', worldLocalDateTime: '2026-11-09T12:00:00' };
const scenarioTime = new Date(scenario.worldLocalDateTime).getTime();
const paused = { mode: 'simulated', rate: 0, nowMs: scenarioTime };

test('World Clock modes have distinct, accurate labels', () => {
  assert.deepEqual(describeWorldMode({ mode: 'real', rate: 1 }).id, 'live');
  assert.deepEqual(describeWorldMode({ mode: 'simulated', rate: 0 }).id, 'paused');
  assert.deepEqual(describeWorldMode({ mode: 'simulated', rate: 1 }).label, 'SIMULATED · 1×');
  assert.deepEqual(describeWorldMode({ mode: 'simulated', rate: 60 }).id, 'simulated');
  assert.throws(() => describeWorldMode({ mode: 'unknown', rate: 1 }), /Unknown/);
});

test('selecting a scenario without applying does not imply it is active', () => {
  const result = describeScenarioApplication(scenario, null, paused);
  assert.equal(result.id, 'not-applied');
  assert.equal(result.applied, false);
});

test('scenario becomes applied only if explicitly activated and paused at its exact timestamp', () => {
  assert.equal(describeScenarioApplication(scenario, scenario.id, paused).applied, true);
  assert.equal(describeScenarioApplication(scenario, scenario.id, { ...paused, rate: 1 }).applied, false);
  assert.equal(describeScenarioApplication(scenario, scenario.id, { ...paused, mode: 'real' }).applied, false);
  assert.equal(describeScenarioApplication(scenario, scenario.id, { ...paused, nowMs: scenarioTime + 5000 }).applied, false);
});

test('switching selected scenarios invalidates displayed verification even if another scenario remains loaded', () => {
  const other = { id: 'epoch', worldLocalDateTime: '2027-01-29T05:30:00' };
  const result = describeScenarioApplication(other, scenario.id, paused);
  assert.equal(result.id, 'not-applied');
});

test('scenario assertion reporting preserves expected and actual values, including failures', () => {
  const checks = checkScenarioAssertions({ 'ecology.day': 720, 'ecology.seasonId': 'silvering' },
    { ecology: { day: 720, seasonId: 'deep-renewal' } });
  assert.equal(checks.length, 2);
  assert.equal(checks[0].passes, true);
  assert.equal(checks[1].passes, false);
  assert.equal(checks[1].actual, 'deep-renewal');
});
