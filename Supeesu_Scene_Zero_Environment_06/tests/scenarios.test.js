import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CalendarEngine } from '../src/calendar/calendarEngine.js';
import { sessionForInstant } from '../src/time/sessionClock.js';

const read = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const calendar = new CalendarEngine(read('../calendar/calendar.json'));
const scenarios = read('../dev/scenarios.json').scenarios;

for (const scenario of scenarios) {
  test(`Time Laboratory assertions: ${scenario.id}`, () => {
    const ms = new Date(scenario.worldLocalDateTime).getTime();
    assert.ok(Number.isFinite(ms), `Invalid scenario date: ${scenario.id}`);
    const calendarState = calendar.describe(ms, { includeDevelopmentEvents: true });
    const observed = {
      ...calendarState,
      simulatedSessionDay: sessionForInstant(ms).id,
      annualEventIds: calendarState.annualEvents.map(event => event.id)
    };
    assert.ok(Object.keys(scenario.assertions ?? {}).length > 0, `No assertions: ${scenario.id}`);
    for (const [path, expected] of Object.entries(scenario.assertions)) {
      const actual = path.split('.').reduce((value, segment) => value?.[segment], observed);
      assert.deepEqual(actual, expected, `${scenario.id}: ${path}`);
    }
  });
}
