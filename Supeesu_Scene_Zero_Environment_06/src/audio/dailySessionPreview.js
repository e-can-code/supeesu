import { dailyPlaybackEligibility } from './dailyPlaybackPolicy.js';

// Pure diagnostic: no storage adapter, AudioContext, or production clock involved.
// Uses the local date of the provided World Clock solely as a test fixture.
export function previewDailyBoundary(worldMs) {
  const local = new Date(worldMs);
  const parts = [local.getFullYear(), local.getMonth(), local.getDate()];
  const before = new Date(...parts, 5, 29, 59).getTime();
  const after = new Date(...parts, 5, 30, 0).getTime();
  const previous = dailyPlaybackEligibility(before, {});
  const current = dailyPlaybackEligibility(after, {});
  const repeated = dailyPlaybackEligibility(after + 5000, {lastSuccessfulSession: current.sessionId});
  return {
    before: { localTime: new Date(before).toLocaleString(), sessionId: previous.sessionId },
    after: { localTime: new Date(after).toLocaleString(), sessionId: current.sessionId },
    sessionChanged: previous.sessionId !== current.sessionId,
    firstStartEligible: current.eligible,
    duplicateStartSuppressed: !repeated.eligible,
    productionStorageWrites: 0,
    productionAudioRequests: 0
  };
}
