const MILLISECONDS_PER_DAY = 86_400_000;

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function parseCivilDate(dateId) {
  if (typeof dateId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateId)) {
    throw new Error(`Invalid civil date: ${dateId}`);
  }
  const [year, month, day] = dateId.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() + 1 !== month || utc.getUTCDate() !== day) {
    throw new Error(`Nonexistent civil date: ${dateId}`);
  }
  return { year, month, day, ordinal: Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY };
}

function civilOrdinal(instantMs) {
  const date = new Date(instantMs);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY;
}

function localDateId(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function validateUniqueIds(entries, label) {
  const seen = new Set();
  for (const item of entries) {
    if (typeof item?.id !== 'string' || !item.id || seen.has(item.id)) {
      throw new Error(`Invalid or duplicated ${label} ID.`);
    }
    seen.add(item.id);
  }
}

export function validateWorldCalendar(config) {
  if (!config || config.schemaVersion !== 1) throw new Error('Unsupported world calendar schema.');
  parseCivilDate(config.epochLocalDate);
  if (config.dateBasis?.worldDay !== 'local-civil-midnight' ||
      config.dateBasis?.sessionDay !== 'separate-05:30-local-boundary' ||
      config.dateBasis?.preEpoch !== 'continuous-cycle') {
    throw new Error('Unsupported calendar date-basis policy.');
  }
  if (config.ecologyCycleDays !== 800) throw new Error('Ecology cycle must be 800 days.');
  if (!Array.isArray(config.ecologicalSeasons) || config.ecologicalSeasons.length !== 8) {
    throw new Error('Exactly eight ecological seasons are required.');
  }
  validateUniqueIds(config.ecologicalSeasons, 'season');
  let total = 0;
  for (const season of config.ecologicalSeasons) {
    if (!Number.isInteger(season.durationDays) || season.durationDays !== 100) {
      throw new Error('Each ecological season must contain exactly 100 days.');
    }
    for (const value of Object.values(season.targets ?? {})) {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`Invalid ecological target for ${season.id}.`);
      }
    }
    for (const target of ['moisture', 'radiance', 'biologicalActivity']) {
      if (!Object.hasOwn(season.targets ?? {}, target)) throw new Error(`Missing ${target} target.`);
    }
    total += season.durationDays;
  }
  if (total !== config.ecologyCycleDays) throw new Error('Season durations do not match ecology cycle.');

  const expectedRhythms = { microseasonDays: 7, shortCycleDays: 200, longCycleDays: 400 };
  for (const [key, expected] of Object.entries(expectedRhythms)) {
    if (config.rhythms?.[key] !== expected) throw new Error(`Unsupported rhythm: ${key}`);
  }
  if (config.microseasonPlan?.coverageDays !== 200 || config.microseasonPlan?.profileCount !== 29 ||
      config.microseasonPlan?.phasePolicy !== 'continuous-from-epoch' ||
      config.microseasonPlan?.outsideCoverage !== 'unassigned') {
    throw new Error('Unsupported microseason plan.');
  }

  const events = config.annualEvents ?? [];
  if (!Array.isArray(events)) throw new Error('Annual events must be an array.');
  validateUniqueIds(events, 'annual event');
  for (const event of events) {
    // A leap year validates February 29 while rejecting impossible month/day combinations.
    const padded = value => String(value).padStart(2, '0');
    const parsed = parseCivilDate(`2028-${padded(event.month)}-${padded(event.day)}`);
    if (parsed.month !== event.month || parsed.day !== event.day) {
      throw new Error(`Invalid annual event date: ${event.id}`);
    }
    if (!['canonical', 'provisional'].includes(event.status) || typeof event.developmentOnly !== 'boolean') {
      throw new Error(`Invalid annual event status: ${event.id}`);
    }
    if (event.status === 'provisional' && !event.developmentOnly) {
      throw new Error(`Provisional event must be development-only: ${event.id}`);
    }
  }
  return true;
}

export class CalendarEngine {
  constructor(config) {
    validateWorldCalendar(config);
    this.config = config;
    this.epochOrdinal = parseCivilDate(config.epochLocalDate).ordinal;
  }

  describe(instantMs, { includeDevelopmentEvents = false } = {}) {
    if (!Number.isFinite(instantMs)) throw new TypeError('World instant must be finite.');
    const date = new Date(instantMs);
    const dayOffset = civilOrdinal(instantMs) - this.epochOrdinal;
    const status = 'active';
    const worldLocalDate = localDateId(date);
    const cycleIndex = Math.floor(dayOffset / this.config.ecologyCycleDays);
    const cycleStartOrdinal = this.epochOrdinal + cycleIndex * this.config.ecologyCycleDays;
    const cycleStartLocalDate = new Date(cycleStartOrdinal * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
    const cycleEndLocalDate = new Date((cycleStartOrdinal + this.config.ecologyCycleDays - 1) * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
    const dayInCycle = modulo(dayOffset, this.config.ecologyCycleDays);
    let seasonDayIndex = dayInCycle;
    let seasonIndex = 0;
    for (let index = 0; index < this.config.ecologicalSeasons.length; index += 1) {
      const season = this.config.ecologicalSeasons[index];
      if (seasonDayIndex < season.durationDays) {
        seasonIndex = index;
        break;
      }
      seasonDayIndex -= season.durationDays;
    }

    const rhythms = this.config.rhythms;
    const profileIndex = dayOffset >= 0 && dayOffset < this.config.microseasonPlan.coverageDays
      ? Math.floor(dayOffset / rhythms.microseasonDays)
      : null;
    const events = this.config.annualEvents.filter(event =>
      event.month === date.getMonth() + 1 && event.day === date.getDate() &&
      (!event.developmentOnly || includeDevelopmentEvents)
    );

    return {
      worldLocalDate,
      dayOffsetFromEpoch: dayOffset,
      status,
      ecology: {
        cycleIndex,
        cycleStartLocalDate,
        cycleEndLocalDate,
        day: dayInCycle + 1,
        seasonIndex: seasonIndex + 1,
        seasonId: this.config.ecologicalSeasons[seasonIndex].id,
        seasonDay: seasonDayIndex + 1,
        seasonTargets: { ...this.config.ecologicalSeasons[seasonIndex].targets },
        seasonTargetsStatus: this.config.ecologicalSeasons[seasonIndex].status
      },
      rhythms: {
        day200: modulo(dayOffset, rhythms.shortCycleDays) + 1,
        day400: modulo(dayOffset, rhythms.longCycleDays) + 1,
        microseasonAbsoluteIndex: Math.floor(dayOffset / rhythms.microseasonDays),
        microseasonDay: modulo(dayOffset, rhythms.microseasonDays) + 1,
        authoredMicroseasonId: profileIndex === null
          ? null : `microseason_${String(profileIndex + 1).padStart(2, '0')}`
      },
      annualEvents: events.map(event => ({ id: event.id, status: event.status, label: event.label }))
    };
  }
}
