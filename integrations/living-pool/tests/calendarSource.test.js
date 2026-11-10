import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const current = load('../calendar/calendar.json');
const temporal = load('../calendar/source/temporal_map.original.json');
const micro = load('../calendar/source/microseasons_first_200_days.original.json');

test('season names, sequence, durations, and target values match preserved design sources', () => {
  assert.deepEqual(current.ecologicalSeasons.map(season => season.label), temporal.eight_seasons.map(season => season.name));
  for (let index = 0; index < 8; index += 1) {
    const actual = current.ecologicalSeasons[index];
    const original = temporal.eight_seasons[index];
    assert.equal(actual.durationDays, original.day_end - original.day_start + 1);
    assert.equal(actual.targets.moisture, original.moisture_target);
    assert.equal(actual.targets.radiance, original.radiance_target);
    assert.equal(actual.targets.biologicalActivity, original.biological_activity_target);
  }
});

test('microseason references preserve the 29-week, 200-day discrepancy explicitly', () => {
  assert.equal(micro.epoch, current.epochLocalDate);
  assert.equal(micro.weekly_profiles.length, 29);
  assert.equal(micro.coverage_days, 200);
  assert.equal(current.microseasonPlan.profileCount, 29);
  assert.equal(current.microseasonPlan.coverageDays, 200);
  assert.equal(micro.weekly_profiles.length * 7 - micro.coverage_days, 3);
  assert.equal(current.microseasonPlan.outsideCoverage, 'unassigned');
});

test('annual Great Convergence remains canonical and July event cannot leak into production', () => {
  const january = current.annualEvents.find(event => event.id === 'great-convergence');
  const july = current.annualEvents.find(event => event.id === 'july-convergence-diagnostic');
  assert.deepEqual([january.month, january.day, january.developmentOnly], [1, 29, false]);
  assert.equal(july.developmentOnly, true);
  assert.equal(july.status, 'provisional');
});
