import { unitHash } from '../core/seededRandom.js';

const DAY_MS = 86_400_000;
const clamp = value => Math.max(0, Math.min(1, value));
const mod = (value, period) => ((value % period) + period) % period;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Diagnostic astronomy is deliberately approximate. A verified ephemeris will
// replace the Earth-moon phase provider without changing consumer contracts.
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_DAYS = 29.530588853;

export function approximateEarthMoonPhase(instantMs) {
  const phase = mod((instantMs - KNOWN_NEW_MOON_UTC) / DAY_MS, SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  return { phase, illumination: (1 - Math.cos(phase * 2 * Math.PI)) / 2, model: 'synodic-estimate-not-ephemeris' };
}

export function jadeMoonPhase(dayOffset, worldMinute, periodDays = 36) {
  // The January 29, 2027 reference phase is intentionally provisional.
  const phase = mod(dayOffset + worldMinute / 1440, periodDays) / periodDays;
  return { phase, illumination: (1 - Math.cos(phase * 2 * Math.PI)) / 2, periodDays, model: 'provisional-independent-period' };
}

export function diagnosticWeather(dateId, minute, moisture) {
  // Every day has a reproducible weather history. This is fictional test data,
  // not an assertion about historical rainfall in any real location.
  const chance = unitHash(`living-pool-weather-v1:${dateId}:wet`);
  const wet = chance < 0.25 + 0.52 * clamp(moisture);
  const startMinute = 360 + Math.floor(unitHash(`living-pool-weather-v1:${dateId}:start`) * 470);
  const durationMinutes = 75 + Math.floor(unitHash(`living-pool-weather-v1:${dateId}:duration`) * 165);
  const endMinute = startMinute + durationMinutes;
  const raining = wet && minute >= startMinute && minute < endMinute;
  const afterRain = wet && minute >= endMinute && minute < endMinute + 145;
  const rainbow = afterRain && minute < 1140 && minute > 480;
  return {
    model: 'deterministic-synthetic-diagnostic', wet, raining, afterRain, rainbow,
    startMinute, endMinute,
    rainStrength: raining ? 0.35 + 0.55 * clamp(moisture) : 0,
    dampness: raining ? 1 : afterRain ? clamp(1 - (minute - endMinute) / 145) : 0
  };
}

export function resolveDiagnosticCycles(instantMs, calendar, season) {
  const date = new Date(instantMs);
  const minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const dayOffset = calendar.dayOffsetFromEpoch;
  const treeGrowth = smooth((minute - 330) / (1110 - 330));
  const blooms = date.getMonth() === 1 && date.getDate() <= 16;
  const weather = diagnosticWeather(calendar.worldLocalDate, minute, season.targets.moisture);
  const moon = approximateEarthMoonPhase(instantMs);
  const jade = jadeMoonPhase(dayOffset, minute);
  return {
    earthMoon: moon, jadeMoon: jade, weather,
    tree: { dailyGrowth: treeGrowth, dailyGrowthActive: minute >= 330 && minute < 1110,
      februaryBloom: blooms, yearlyTransformation: calendar.ecology.seasonIndex % 2 === 0 ? 'open-canopy' : 'closed-canopy',
      model: 'diagnostic-not-final-artwork' },
    microseason: { day: calendar.rhythms.microseasonDay,
      authoredId: calendar.rhythms.authoredMicroseasonId,
      profileCoverage: calendar.rhythms.authoredMicroseasonId ? 'original-first-200-days' : 'seven-day-rhythm-only',
      progress: (calendar.rhythms.microseasonDay - 1) / 6 },
    rhythms: { day200: calendar.rhythms.day200, day400: calendar.rhythms.day400,
      wave200: (1 + Math.sin(2 * Math.PI * (calendar.rhythms.day200 - 1) / 200)) / 2,
      wave400: (1 + Math.cos(2 * Math.PI * (calendar.rhythms.day400 - 1) / 400)) / 2 },
    sessionDay: (() => { const boundary = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 30);
      const sessionDate = instantMs < boundary.getTime() ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1) : date;
      return [sessionDate.getFullYear(),String(sessionDate.getMonth()+1).padStart(2,'0'),String(sessionDate.getDate()).padStart(2,'0')].join('-'); })(),
    solarMarkers: {
      predawn: minute >= 240 && minute < 330, growth: minute >= 330 && minute < 1110,
      blueMorning: minute >= 330 && minute < 600, goldenHour: minute >= 930 && minute < 1110,
      moonlit: minute >= 1230 || minute < 240,
      redAmber: minute >= 1320 || minute < 240,
      deepSepia: minute >= 1350 || minute < 240
    }
  };
}
