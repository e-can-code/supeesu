export const FLOW_RATES = Object.freeze([1, 60, 3600, 86400]);
export const DEFAULT_FLOW_RATE = 3600;

export function validatedFlowRate(value) {
  const parsed = Number(value);
  if (!FLOW_RATES.includes(parsed)) throw new RangeError('Unrecognized world simulation speed.');
  return parsed;
}

export function flowDescription(rate) {
  if (rate === 1) return 'Real-speed simulation';
  if (rate === 60) return '1 world minute per real second';
  if (rate === 3600) return '1 world hour per real second · 1 day / 24 seconds';
  if (rate === 86400) return '1 world day per real second';
  return 'Custom simulation speed';
}
