import { PERSISTENT_SOUND_PREF_KEY } from './dailyPlaybackPolicy.js';

// Persistence is the default for Scene Zero; an explicit opt-out is respected.
// Reading settings is separate from changing them, and never touches playback history.
export function initialPersistentSound(storage, { laboratory = false } = {}) {
  if (laboratory) return false;
  try { return storage?.getItem(PERSISTENT_SOUND_PREF_KEY) !== 'false'; }
  catch { return true; }
}

export function setPersistentSound(storage, enabled, { laboratory = false } = {}) {
  if (laboratory) return false;
  try { storage?.setItem(PERSISTENT_SOUND_PREF_KEY, String(Boolean(enabled))); return true; }
  catch { return false; }
}
