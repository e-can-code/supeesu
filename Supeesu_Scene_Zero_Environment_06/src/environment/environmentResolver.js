import { resolveSky } from './skyConditions.js';
import { resolveDiagnosticCycles } from './diagnosticCycles.js';

const UNIT_KEYS = ['illumination', 'warmth', 'mist', 'waterHighlights', 'fishActivity'];
const bounded = value => Math.min(1, Math.max(0, value));
const smooth = value => { const t = bounded(value); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => a + (b - a) * t;

function parseHex(color) {
  if (typeof color !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(color)) throw new Error(`Invalid six-digit color ${color}`);
  return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
}

export function blendHex(a, b, factor) {
  const lhs = parseHex(a);
  const rhs = parseHex(b);
  return `#${lhs.map((value, index) => Math.round(blend(value, rhs[index], bounded(factor))).toString(16).padStart(2, '0')).join('')}`;
}

export function validateEnvironmentProfile(config, calendarConfig) {
  if (config?.schemaVersion !== 1 || !Array.isArray(config.timeKnots) || config.timeKnots.length < 2) {
    throw new Error('An environment profile must provide a versioned sequence of time knots.');
  }
  const minutes = config.timeKnots.map(knot => knot.minute);
  if (minutes[0] !== 0 || minutes.at(-1) !== 1440 || minutes.some((minute, index) => index && minute <= minutes[index - 1])) {
    throw new Error('Time knots must increase strictly from minute 0 through minute 1440.');
  }
  for (const knot of config.timeKnots) {
    for (const key of UNIT_KEYS) {
      if (!Number.isFinite(knot[key]) || knot[key] < 0 || knot[key] > 1) throw new Error(`Invalid ${key} time knot.`);
    }
  }
  for (const key of UNIT_KEYS) {
    if (config.timeKnots[0][key] !== config.timeKnots.at(-1)[key]) {
      throw new Error(`The ${key} daily curve must meet continuously at midnight.`);
    }
  }
  if (!Array.isArray(config.skyColorKnots) || config.skyColorKnots.length < 2 ||
      config.skyColorKnots[0].minute !== 0 || config.skyColorKnots.at(-1).minute !== 1440) {
    throw new Error('Sky color knots must run from 00:00 through 24:00.');
  }
  config.skyColorKnots.forEach((knot, index) => {
    if (!Number.isInteger(knot.minute) || (index && knot.minute <= config.skyColorKnots[index - 1].minute)) {
      throw new Error('Sky palette knot minutes must increase.');
    }
    parseHex(knot.top);
    parseHex(knot.horizon);
  });
  for (const field of ['top', 'horizon']) {
    if (config.skyColorKnots[0][field] !== config.skyColorKnots.at(-1)[field]) {
      throw new Error(`Sky ${field} must be continuous at midnight.`);
    }
  }
  for (const season of calendarConfig.ecologicalSeasons) {
    const colors = config.seasonPalettes?.[season.id];
    if (!colors) throw new Error(`Missing palette for ${season.id}.`);
    ['ground', 'water', 'accent'].forEach(key => parseHex(colors[key]));
  }
  const splash = config.splashBehavior;
  if (!splash || !Number.isInteger(splash.bucketMinutes) || 1440 % splash.bucketMinutes !== 0 ||
      splash.baseProbability <= 0 || splash.baseProbability >= 1 || splash.maximumMultiplier !== 1.5 ||
      !(splash.eveningStartMinute < splash.eveningPeakMinute && splash.eveningPeakMinute < splash.eveningEndMinute)) {
    throw new Error('Invalid splash behavior specification.');
  }
  for (const event of Object.values(config.eventCompositions ?? {})) {
    parseHex(event.palette);
    if (![event.strength, event.illuminationBoost].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
      throw new Error('Invalid event composition strength.');
    }
  }
  return true;
}

export function splashRateMultiplier(minute, splash) {
  const { eveningStartMinute: start, eveningPeakMinute: peak, eveningEndMinute: end, maximumMultiplier: max } = splash;
  if (minute < start || minute >= end) return 1;
  const strength = minute <= peak ? smooth((minute - start) / (peak - start)) : smooth((end - minute) / (end - peak));
  return 1 + (max - 1) * strength;
}

function timeValues(minute, knots) {
  const index = Math.min(knots.findIndex(knot => knot.minute > minute), knots.length - 1);
  const right = knots[index < 1 ? 1 : index];
  const left = knots[index < 1 ? 0 : index - 1];
  const weight = smooth((minute - left.minute) / (right.minute - left.minute));
  return Object.fromEntries(UNIT_KEYS.map(key => [key, blend(left[key], right[key], weight)]));
}

function localMinutes(instantMs) {
  const date = new Date(instantMs);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
}

export class EnvironmentResolver {
  constructor(config, calendarConfig, { microseasonCatalog = null } = {}) {
    validateEnvironmentProfile(config, calendarConfig);
    this.config = config;
    this.microseasonCatalog = microseasonCatalog;
    this.seasons = new Map(calendarConfig.ecologicalSeasons.map(season => [season.id, season]));
  }

  resolve(instantMs, calendarSnapshot) {
    if (!Number.isFinite(instantMs) || calendarSnapshot?.status !== 'active') throw new Error('A valid world instant and active calendar state are required.');
    const minute = localMinutes(instantMs);
    const time = timeValues(minute, this.config.timeKnots);
    const season = this.seasons.get(calendarSnapshot.ecology.seasonId);
    if (!season) throw new Error('Unknown ecological season in calendar snapshot.');
    const targets = season.targets;
    const rhythms = calendarSnapshot.rhythms;
    const r200 = Math.sin(2 * Math.PI * (rhythms.day200 - 1) / 200);
    const r400 = Math.cos(2 * Math.PI * (rhythms.day400 - 1) / 400);
    const r7 = Math.sin(2 * Math.PI * (rhythms.microseasonDay - 1) / 7);
    const weights = this.config.rhythmInfluences;
    const influence = {
      mist: weights['200DayMistAmplitude'] * r200,
      highlights: weights['400DayHighlightAmplitude'] * r400,
      accent: weights['sevenDayAccentAmplitude'] * r7
    };

    const resolved = {
      illumination: bounded(time.illumination * (0.75 + 0.25 * targets.radiance)),
      warmth: bounded(time.warmth),
      mist: bounded(time.mist * (0.55 + 0.65 * targets.moisture) + influence.mist),
      waterHighlights: bounded(time.waterHighlights * (0.65 + 0.35 * targets.radiance) + influence.highlights),
      fishActivity: bounded(time.fishActivity * (0.42 + 0.58 * targets.biologicalActivity)),
      splashMultiplier: splashRateMultiplier(minute, this.config.splashBehavior),
      sky: resolveSky(minute, this.config.skyColorKnots),
      diagnostics: resolveDiagnosticCycles(instantMs, calendarSnapshot, season),
      palettes: { ...this.config.seasonPalettes[season.id] },
      eventTreatments: []
    };
    resolved.diagnostics.microseason.authored = this.microseasonCatalog?.describe(calendarSnapshot) ?? null;
    resolved.palettes.accent = blendHex(resolved.palettes.accent, '#ffffff', Math.max(0, influence.accent));
    resolved.palettes.accent = blendHex(resolved.palettes.accent, '#344651', Math.max(0, -influence.accent));

    // Event application is explicit and sorted so data order never changes the result.
    for (const event of [...calendarSnapshot.annualEvents].sort((a, b) => a.id.localeCompare(b.id))) {
      const treatment = this.config.eventCompositions[event.id];
      if (!treatment) continue;
      const arrival = 0.32 + 0.68 * smooth((minute - 330) / (21 * 60 - 330));
      const strength = treatment.strength * arrival;
      for (const part of ['ground', 'water', 'accent']) {
        resolved.palettes[part] = blendHex(resolved.palettes[part], treatment.palette, strength * (part === 'accent' ? 0.84 : 0.48));
      }
      resolved.illumination = bounded(resolved.illumination + treatment.illuminationBoost * arrival);
      resolved.waterHighlights = bounded(resolved.waterHighlights + 0.13 * strength);
      resolved.eventTreatments.push({ id: event.id, strength: Number(strength.toFixed(4)), treatment: treatment.treatment });
    }

    return {
      instantMs,
      worldLocalDate: calendarSnapshot.worldLocalDate,
      worldMinute: Number(minute.toFixed(4)),
      ecologicalSeason: calendarSnapshot.ecology.seasonId,
      ...resolved,
      provenance: {
        timeCurve: 'living-pool-environment-v1:timeKnots',
        season: calendarSnapshot.ecology.seasonId,
        rhythms: { day200: rhythms.day200, day400: rhythms.day400, day7: rhythms.microseasonDay },
        eventOrder: resolved.eventTreatments.map(event => event.id),
        luna: 'Earth: approximate synodic diagnostic; jade: independent 36-day diagnostic, both provisional',
        sky: 'living-pool-environment-v1:skyColorKnots + stylized-diagnostic-sun-arc',
        methods: { illumination: 'season-scaled-continuous-curve-plus-events', mist: 'season-scaled-curve-plus-200-day-wave', waterHighlights: 'season-scaled-curve-plus-400-day-wave', fishActivity: 'season-scaled-continuous-curve', palettes: 'season-base-plus-7-day-accent-plus-authorized-events' }
      }
    };
  }
}
