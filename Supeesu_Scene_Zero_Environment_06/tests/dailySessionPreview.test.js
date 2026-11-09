import test from 'node:test';
import assert from 'node:assert/strict';
import { previewDailyBoundary } from '../src/audio/dailySessionPreview.js';

test('laboratory 05:30 scenario is pure and proves first eligible / repeat suppressed', () => {
  const result = previewDailyBoundary(new Date(2026,10,9,12).getTime());
  assert.equal(result.before.sessionId,'2026-11-08');
  assert.equal(result.after.sessionId,'2026-11-09');
  assert.equal(result.sessionChanged,true);
  assert.equal(result.firstStartEligible,true);
  assert.equal(result.duplicateStartSuppressed,true);
  assert.equal(result.productionStorageWrites,0);
  assert.equal(result.productionAudioRequests,0);
});

test('civil time boundary is evaluated on daylight saving transition days', () => {
  for (const [year,month,day] of [[2026,2,8],[2026,10,1],[2027,0,29]]) {
    assert.equal(previewDailyBoundary(new Date(year,month,day,12).getTime()).sessionChanged,true);
  }
});
