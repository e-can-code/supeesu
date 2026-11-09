import { unitHash } from '../core/seededRandom.js';
export { unitHash } from '../core/seededRandom.js';
const TWO_PI = Math.PI * 2;
const round = number => Number(number.toFixed(5));

export function fishPose(fish, worldMs, activity) {
  if (!Number.isFinite(worldMs) || !Number.isFinite(activity)) throw new TypeError('Fish pose requires valid time and activity.');
  const seconds = worldMs / 1000;
  const theta = TWO_PI * ((seconds / fish.periodSeconds) % 1) + fish.phase;
  const movementScale = 0.34 + 0.66 * Math.max(0, Math.min(1, activity));
  const dx = fish.orbit[0] * movementScale * Math.cos(theta);
  const dy = fish.orbit[1] * movementScale * Math.sin(theta);
  const x = fish.center[0] + fish.orbit[0] * movementScale * Math.sin(theta);
  const y = fish.center[1] - fish.orbit[1] * movementScale * Math.cos(theta);
  const heading = Math.atan2(dy, dx) * 180 / Math.PI + (fish.rotationOffset ?? 0);
  return {
    id: fish.id,
    x: round(x), y: round(y), headingDegrees: round(heading),
    wiggleDegrees: round(Math.sin(seconds * 2.3 + fish.phase) * (0.5 + 1.6 * activity))
  };
}

function parseDate(dateId) {
  const [year, month, day] = dateId.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid local date ${dateId}`);
  }
  return [year, month, day];
}

export function scheduledSplashesForDay(dateId, behavior, multiplierForMinute, sceneId = 'living-pool') {
  const [year, month, day] = parseDate(dateId);
  const events = [];
  for (let minute = 0; minute < 1440; minute += behavior.bucketMinutes) {
    const key = `${behavior.seed}|${sceneId}|${dateId}|${minute}`;
    const probability = behavior.baseProbability * multiplierForMinute(minute);
    if (unitHash(`${key}|occurrence`) >= probability) continue;
    const timestamp = new Date(year, month - 1, day, 0, minute);
    const delay = Math.floor(unitHash(`${key}|delay`) * behavior.bucketMinutes * 60000);
    const angle = unitHash(`${key}|angle`) * TWO_PI;
    const radius = 0.15 + 0.76 * Math.sqrt(unitHash(`${key}|radius`));
    events.push({
      id: `${sceneId}:${dateId}:${String(minute).padStart(4, '0')}`,
      atMs: timestamp.getTime() + delay,
      x: 612 + Math.cos(angle) * 382 * radius,
      y: 403 + Math.sin(angle) * 143 * radius,
      source: 'seeded-evening-ripple'
    });
  }
  return events.sort((a, b) => a.atMs - b.atMs);
}

export class SplashTimeline {
  constructor(behavior, multiplierForMinute, sceneId) {
    this.behavior = behavior;
    this.multiplierForMinute = multiplierForMinute;
    this.sceneId = sceneId;
    this.cachedDay = null;
    this.cached = [];
    this.previousMs = null;
  }

  eventsForDay(dateId) {
    if (dateId !== this.cachedDay) {
      this.cachedDay = dateId;
      this.cached = scheduledSplashesForDay(dateId, this.behavior, this.multiplierForMinute, this.sceneId);
    }
    return this.cached;
  }

  sample(nowMs, dateId, { allowLiveEvents = false } = {}) {
    const events = this.eventsForDay(dateId);
    const ripples = events.filter(event => nowMs >= event.atMs && nowMs < event.atMs + this.behavior.rippleDurationMs);
    const delta = this.previousMs === null ? Infinity : nowMs - this.previousMs;
    const mayTrigger = allowLiveEvents && delta >= 0 && delta <= 1250;
    const triggered = mayTrigger ? events.filter(event => event.atMs > this.previousMs && event.atMs <= nowMs) : [];
    this.previousMs = nowMs;
    return { ripples, triggered, next: events.find(event => event.atMs > nowMs) ?? null };
  }

  resetOnSeek() {
    this.previousMs = null;
  }
}
