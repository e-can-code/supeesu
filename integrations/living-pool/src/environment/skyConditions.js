function blendHex(a, b, fraction) {
  const t = Math.max(0, Math.min(1, fraction));
  const channel = (color, start) => parseInt(color.slice(start, start + 2), 16);
  return '#' + [1, 3, 5].map(start => Math.round(channel(a, start) +
    (channel(b, start) - channel(a, start)) * t).toString(16).padStart(2, '0')).join('');
}

const clamp = n => Math.min(1, Math.max(0, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

// Authored palette knots define visual time; the day arc is a diagnostic shorthand,
// not a claim of physically accurate solar or lunar ephemerides.
export function resolveSky(minute, paletteKnots) {
  if (!Array.isArray(paletteKnots) || paletteKnots.length < 2) throw new Error('Sky palette requires at least two knots.');
  const nextIndex = paletteKnots.findIndex(k => k.minute > minute);
  const rightIndex = nextIndex < 0 ? paletteKnots.length - 1 : Math.max(1, nextIndex);
  const a = paletteKnots[rightIndex - 1];
  const b = paletteKnots[rightIndex];
  const t = smooth((minute - a.minute) / (b.minute - a.minute));
  const daylight = clamp((minute - 360) / 780);
  const sunUp = minute >= 360 && minute <= 1140;
  const moonT = minute > 1140 ? (minute - 1140) / 660 : (minute + 300) / 660;
  const night = minute < 330 ? smooth((330 - minute) / 115) : minute > 1170 ? smooth((minute - 1170) / 110) : 0;
  return {
    top: blendHex(a.top, b.top, t),
    horizon: blendHex(a.horizon, b.horizon, t),
    sun: { visible: sunUp, x: 110 + daylight * 980, y: 324 - 268 * Math.sin(Math.PI * daylight) },
    moon: { visible: false, model: 'position-deferred-universe-map', x: 150 + clamp(moonT) * 890, y: 158 - 86 * Math.sin(Math.PI * clamp(moonT)) },
    stars: clamp(night),
    phase: minute < 330 || minute >= 1230 ? 'night' : minute < 450 ? 'dawn' : minute < 1020 ? 'day' : 'dusk'
  };
}
