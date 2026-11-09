import { sessionForInstant } from '../time/sessionClock.js';

export const DAILY_PLAYBACK_LEDGER_KEY = 'supeesu.sceneZero.dailyAudio.v1';
export const PERSISTENT_SOUND_PREF_KEY = 'supeesu.sceneZero.persistentSound.v1';

export function dailyPlaybackEligibility(realMs, ledger) {
  const session = sessionForInstant(realMs);
  return {
    sessionId: session.id,
    session,
    eligible: ledger?.lastSuccessfulSession !== session.id,
    recordedSuccess: ledger?.lastSuccessfulSession === session.id
  };
}

export class DailyPlaybackPolicy {
  constructor({ clock, storage, enabled = true } = {}) {
    if (!clock?.nowMs || !storage?.getItem || !storage?.setItem) throw new Error('Production real clock and explicit storage adapter are required.');
    this.clock = clock;
    this.storage = storage;
    this.enabled = enabled;
  }

  readLedger() {
    try {
      const data = JSON.parse(this.storage.getItem(DAILY_PLAYBACK_LEDGER_KEY) || '{}');
      return typeof data.lastSuccessfulSession === 'string' ? data : {};
    } catch { return {}; }
  }

  eligibility() {
    return dailyPlaybackEligibility(this.clock.nowMs(), this.readLedger());
  }

  markActualPlaybackSuccess(verifiedPlaying) {
    if (!this.enabled) throw new Error('Simulation may never write the production daily playback ledger.');
    if (verifiedPlaying !== true) throw new Error('Do not record a start unless the audio engine confirms active playback.');
    const sessionId = sessionForInstant(this.clock.nowMs()).id;
    this.storage.setItem(DAILY_PLAYBACK_LEDGER_KEY, JSON.stringify({ lastSuccessfulSession: sessionId }));
    return sessionId;
  }
}
