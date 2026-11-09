const DAY_MS = 86_400_000;
const localDate = ms => {
  const date = new Date(ms);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
};

// FLOW has a diagnostic visual event path, separate from real-time audible cue
// scheduling. Large manual seeks and huge jumps must never replay history.
export function crossedAcceleratedSplash(previousWorldMs, worldMs, timeline) {
  if (!Number.isFinite(previousWorldMs) || !Number.isFinite(worldMs) ||
    worldMs <= previousWorldMs || worldMs - previousWorldMs > DAY_MS * 2) return null;
  const dates = [localDate(previousWorldMs), localDate(worldMs)];
  const seen = new Set();
  for (const date of dates) {
    if (seen.has(date)) continue;
    seen.add(date);
    const match = timeline.eventsForDay(date).find(event =>
      event.atMs > previousWorldMs && event.atMs <= worldMs);
    if (match) return match;
  }
  return null;
}
