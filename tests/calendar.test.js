import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CalendarEngine, validateWorldCalendar } from '../src/calendar/calendarEngine.js';

const config = JSON.parse(readFileSync(new URL('../calendar/calendar.json', import.meta.url), 'utf8'));
const engine = new CalendarEngine(config);
const localAtNoon = (year, month, day) => new Date(year, month - 1, day, 12).getTime();
const plusCivilDays = (days) => {
  const date = new Date(2027, 0, 29 + days, 12);
  return date.getTime();
};

test('world calendar configuration validates', () => {
  assert.equal(validateWorldCalendar(config), true);
  assert.equal(config.ecologicalSeasons.reduce((sum, s) => sum + s.durationDays, 0), 800);
});

test('epoch is ecology day 1 and first season day 1', () => {
  const result = engine.describe(localAtNoon(2027, 1, 29));
  assert.equal(result.dayOffsetFromEpoch, 0);
  assert.equal(result.ecology.day, 1);
  assert.equal(result.ecology.seasonIndex, 1);
  assert.equal(result.ecology.seasonDay, 1);
  assert.equal(result.rhythms.microseasonDay, 1);
});

test('seasons and 200/400-day rhythms transition at their boundaries', () => {
  const d100 = engine.describe(plusCivilDays(99));
  const d101 = engine.describe(plusCivilDays(100));
  assert.equal(d100.ecology.seasonIndex, 1);
  assert.equal(d101.ecology.seasonIndex, 2);
  assert.equal(d101.ecology.seasonDay, 1);
  assert.equal(engine.describe(plusCivilDays(199)).rhythms.day200, 200);
  assert.equal(engine.describe(plusCivilDays(200)).rhythms.day200, 1);
  assert.equal(engine.describe(plusCivilDays(399)).rhythms.day400, 400);
  assert.equal(engine.describe(plusCivilDays(400)).rhythms.day400, 1);
});

test('800-day ecology repeats without forcibly resetting independent seven-day rhythm', () => {
  const day1 = engine.describe(plusCivilDays(0));
  const day800 = engine.describe(plusCivilDays(799));
  const day801 = engine.describe(plusCivilDays(800));
  assert.equal(day800.ecology.day, 800);
  assert.equal(day801.ecology.day, 1);
  assert.equal(day801.ecology.cycleIndex, 1);
  assert.equal(day1.rhythms.microseasonDay, 1);
  assert.equal(day801.rhythms.microseasonDay, 3);
  assert.equal(day801.rhythms.authoredMicroseasonId, null);
});

test('calendar calculation follows local civil dates rather than fixed elapsed milliseconds', () => {
  const previousTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Denver';
    const beforeDst = engine.describe(localAtNoon(2027, 3, 13));
    const afterDst = engine.describe(localAtNoon(2027, 3, 14));
    assert.equal(afterDst.dayOffsetFromEpoch - beforeDst.dayOffsetFromEpoch, 1);
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('Jan 29 repeats annually; July diagnostic is opt-in', () => {
  assert.ok(engine.describe(localAtNoon(2028, 1, 29)).annualEvents.some(e => e.id === 'great-convergence'));
  assert.equal(engine.describe(localAtNoon(2027, 7, 29)).annualEvents.length, 0);
  assert.ok(engine.describe(localAtNoon(2027, 7, 29), { includeDevelopmentEvents: true })
    .annualEvents.some(e => e.id === 'july-convergence-diagnostic'));
});

test('invalid season totals, impossible dates, and duplicate events are rejected', () => {
  assert.throws(() => new CalendarEngine({ ...config, epochLocalDate: '2027-02-30' }), /Nonexistent/);
  assert.throws(() => new CalendarEngine({ ...config, ecologicalSeasons: config.ecologicalSeasons.slice(0, 7) }), /eight/);
  assert.throws(() => new CalendarEngine({ ...config, annualEvents: [config.annualEvents[0], config.annualEvents[0]] }), /duplicat/);
});

test('previous cycle is active and ends the day before the reference epoch', () => {
  const previousDay = engine.describe(localAtNoon(2027, 1, 28));
  assert.equal(previousDay.status, 'active');
  assert.equal(previousDay.dayOffsetFromEpoch, -1);
  assert.equal(previousDay.ecology.cycleIndex, -1);
  assert.equal(previousDay.ecology.day, 800);
  assert.equal(previousDay.ecology.seasonId, 'deep-renewal');
  assert.equal(previousDay.ecology.seasonDay, 100);
  assert.equal(previousDay.ecology.cycleStartLocalDate, '2024-11-20');
  assert.equal(previousDay.ecology.cycleEndLocalDate, '2027-01-28');
  assert.deepEqual([previousDay.rhythms.day200, previousDay.rhythms.day400], [200, 400]);
  assert.equal(previousDay.rhythms.microseasonDay, 7);
  assert.equal(previousDay.rhythms.authoredMicroseasonId, null);
  assert.deepEqual(previousDay.annualEvents, []);
});

test('November 9 2026 is day 720 of previous cycle, Deep Renewal day 20', () => {
  const result = engine.describe(localAtNoon(2026, 11, 9));
  assert.equal(result.worldLocalDate, '2026-11-09');
  assert.equal(result.dayOffsetFromEpoch, -81);
  assert.equal(result.status, 'active');
  assert.deepEqual([
    result.ecology.cycleIndex, result.ecology.day,
    result.ecology.seasonIndex, result.ecology.seasonId, result.ecology.seasonDay
  ], [-1, 720, 8, 'deep-renewal', 20]);
  assert.deepEqual([result.rhythms.day200, result.rhythms.day400, result.rhythms.microseasonDay],
    [120, 320, 4]);
  assert.equal(result.rhythms.authoredMicroseasonId, null);
});

test('previous Silvering ends on Oct 20 2026 and Deep Renewal starts Oct 21', () => {
  const finalSilvering = engine.describe(localAtNoon(2026, 10, 20));
  const firstRenewal = engine.describe(localAtNoon(2026, 10, 21));
  assert.deepEqual([finalSilvering.ecology.day, finalSilvering.ecology.seasonId, finalSilvering.ecology.seasonDay],
    [700, 'silvering', 100]);
  assert.deepEqual([firstRenewal.ecology.day, firstRenewal.ecology.seasonId, firstRenewal.ecology.seasonDay],
    [701, 'deep-renewal', 1]);
});

test('negative 800-day multiples use floor division, not negative remainder', () => {
  const beforeEarlierCycle = engine.describe(localAtNoon(2024, 11, 19));
  const firstPrevious = engine.describe(localAtNoon(2024, 11, 20));
  assert.deepEqual([beforeEarlierCycle.dayOffsetFromEpoch, beforeEarlierCycle.ecology.cycleIndex, beforeEarlierCycle.ecology.day], [-801, -2, 800]);
  assert.deepEqual([firstPrevious.dayOffsetFromEpoch, firstPrevious.ecology.cycleIndex, firstPrevious.ecology.day], [-800, -1, 1]);
  assert.equal(firstPrevious.ecology.seasonId, 'first-stirring');
  assert.equal(firstPrevious.rhythms.microseasonDay, 6);
  assert.equal(beforeEarlierCycle.rhythms.authoredMicroseasonId, null);
  assert.equal(firstPrevious.rhythms.authoredMicroseasonId, null);
});

test('the January 29 annual convergence also occurs before the reference epoch', () => {
  const earlier = engine.describe(localAtNoon(2026, 1, 29));
  assert.equal(earlier.ecology.cycleIndex, -1);
  assert.equal(earlier.ecology.day, 436);
  assert.ok(earlier.annualEvents.some(event => event.id === 'great-convergence'));
});

test('past and future dates reconstruct without depending on query order', () => {
  const earlier = localAtNoon(2026, 11, 9);
  const baseline = engine.describe(earlier);
  engine.describe(localAtNoon(2031, 6, 16));
  engine.describe(localAtNoon(2027, 1, 29));
  assert.deepEqual(engine.describe(earlier), baseline);
  assert.equal(engine.describe(plusCivilDays(800)).ecology.cycleIndex, 1);
});

test('stale prologue-policy configurations fail validation', () => {
  assert.throws(() => new CalendarEngine({
    ...config, dateBasis: { ...config.dateBasis, preEpoch: 'prologue' }
  }), /date-basis/);
});

test('first 200 days have authored microseason IDs; day 201 is explicitly unassigned', () => {
  assert.equal(engine.describe(plusCivilDays(0)).rhythms.authoredMicroseasonId, 'microseason_01');
  assert.equal(engine.describe(plusCivilDays(199)).rhythms.authoredMicroseasonId, 'microseason_29');
  assert.equal(engine.describe(plusCivilDays(200)).rhythms.authoredMicroseasonId, null);
});
