// The orrery has three reversible, independent world-time scales.
// No ring reads or writes real timers, daily playback, or preferences.
export const TAU = 2 * Math.PI;
export const DAY_MS = 86_400_000;

export const DIAL_RINGS = Object.freeze({
  ecology: { label: '800-day ecology', spanMs: 800 * DAY_MS, keyboardStepMs: 10 * DAY_MS },
  microseason: { label: '7-day rhythm', spanMs: 7 * DAY_MS, keyboardStepMs: DAY_MS },
  day: { label: '24-hour light', spanMs: DAY_MS, keyboardStepMs: 30 * 60_000 }
});

export function wrappedAngleDelta(currentAngle, previousAngle) {
  let delta = currentAngle - previousAngle;
  while (delta > Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  return delta;
}

export function angleAtPointer(x, y, centerX, centerY) {
  // Zero is twelve o'clock; clockwise rotation advances world time.
  return Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
}

export function seekByRotation(startMs, ring, radians) {
  const settings = DIAL_RINGS[ring];
  if (!settings || !Number.isFinite(startMs) || !Number.isFinite(radians)) {
    throw new TypeError('A known ring, a world instant, and a finite rotation are required.');
  }
  return startMs + radians / TAU * settings.spanMs;
}

export function ringProgress(instantMs, ring, dayOffsetFromEpoch) {
  const d = new Date(instantMs);
  const dayFraction = (d.getHours() * 3600 + d.getMinutes() * 60 +
    d.getSeconds() + d.getMilliseconds() / 1000) / 86400;
  if (ring === 'ecology') return (((dayOffsetFromEpoch + dayFraction) % 800) + 800) % 800 / 800;
  if (ring === 'microseason') return (((dayOffsetFromEpoch + dayFraction) % 7) + 7) % 7 / 7;
  if (ring === 'day') return dayFraction;
  throw new RangeError('Unknown dial ring.');
}
