import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EnvironmentResolver } from '../src/environment/environmentResolver.js';
import { CalendarEngine } from '../src/calendar/calendarEngine.js';
import { checkEnvironmentExpectations } from '../dev/environmentChecks.js';
const getJson = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const calendarConfig = getJson('../calendar/calendar.json');
const engine = new CalendarEngine(calendarConfig);
const resolver = new EnvironmentResolver(getJson('../scenes/living-pool/environment.json'), calendarConfig);
const scenarios = getJson('../dev/scenarios.json').scenarios;
for (const scenario of scenarios.filter(s => s.environmentExpectations)) {
  test(`environment scenario: ${scenario.id}`, () => {
    const instant = new Date(scenario.worldLocalDateTime).getTime();
    const environment = resolver.resolve(instant, engine.describe(instant, { includeDevelopmentEvents: true }));
    const outcomes = checkEnvironmentExpectations(scenario.environmentExpectations, environment);
    const errors = outcomes.filter(outcome => !outcome.passes);
    assert.deepEqual(errors, [], JSON.stringify(errors));
  });
}
