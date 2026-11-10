import test from 'node:test';
import assert from 'node:assert/strict';
import { visibilityPolicy } from '../src/app/visibilityPolicy.js';

test('hidden and not persistent suspends visuals and audio independently', () => {
  assert.deepEqual(visibilityPolicy({ hidden: true, persistentSound: false, audioActive: true }), {
    animateVisuals: false, allowSoundPlayback: false, audioAction: 'pause'
  });
});
test('hidden and persistent suspends visuals but retains audio', () => {
  assert.deepEqual(visibilityPolicy({ hidden: true, persistentSound: true, audioActive: true }), {
    animateVisuals: false, allowSoundPlayback: true, audioAction: 'keep'
  });
});
test('unfocused visible page keeps rendering', () => {
  assert.equal(visibilityPolicy({ hidden: false, persistentSound: false, audioActive: true }).animateVisuals, true);
});
test('inactive sound never receives a resume request', () => {
  assert.equal(visibilityPolicy({ hidden: false, persistentSound: true, audioActive: false }).audioAction, 'none');
});
