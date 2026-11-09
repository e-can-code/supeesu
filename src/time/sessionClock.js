import { RealClock } from './realClock.js';

function localDateId(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function sessionForInstant(instantMs, boundaryHour = 5, boundaryMinute = 30) {
  if (!Number.isFinite(instantMs)) throw new TypeError('Session instant must be finite.');
  if (!Number.isInteger(boundaryHour) || boundaryHour < 0 || boundaryHour > 23 ||
      !Number.isInteger(boundaryMinute) || boundaryMinute < 0 || boundaryMinute > 59) {
    throw new RangeError('Invalid local session boundary.');
  }

  const current = new Date(instantMs);
  const year = current.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();
  const todayBoundary = new Date(year, month, day, boundaryHour, boundaryMinute);
  const sessionStart = instantMs < todayBoundary.getTime()
    ? new Date(year, month, day - 1, boundaryHour, boundaryMinute)
    : todayBoundary;
  const sessionEnd = new Date(
    sessionStart.getFullYear(), sessionStart.getMonth(), sessionStart.getDate() + 1,
    boundaryHour, boundaryMinute
  );

  return {
    id: localDateId(sessionStart),
    startsAtMs: sessionStart.getTime(),
    endsAtMs: sessionEnd.getTime(),
    boundaryLocalTime: `${String(boundaryHour).padStart(2, '0')}:${String(boundaryMinute).padStart(2, '0')}`
  };
}

export class SessionClock {
  constructor(source = new RealClock(), options = {}) {
    if (typeof source.nowMs !== 'function') throw new TypeError('A time source with nowMs() is required.');
    this.source = source;
    this.boundaryHour = options.boundaryHour ?? 5;
    this.boundaryMinute = options.boundaryMinute ?? 30;
  }

  current() {
    return sessionForInstant(this.source.nowMs(), this.boundaryHour, this.boundaryMinute);
  }
}
