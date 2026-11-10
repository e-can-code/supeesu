import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioOwnership } from '../src/audio/audioOwnership.js';

class FakeLocks {
  held = false;

  async request(_name, { ifAvailable }, callback) {
    if (ifAvailable && this.held) return callback(null);
    this.held = true;
    try {
      return await callback({ name: 'audio-lock' });
    } finally {
      this.held = false;
    }
  }
}

test('only one cooperating tab can own the soundscape lock', async () => {
  const locks = new FakeLocks();
  const tabA = createAudioOwnership(locks);
  const tabB = createAudioOwnership(locks);
  assert.equal(await tabA.acquire(), true);
  assert.equal(tabA.isOwner(), true);
  assert.equal(await tabB.acquire(), false);
  tabA.release();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(await tabB.acquire(), true);
  tabB.release();
});

test('when locks are unavailable, automatic ownership is denied safely', async () => {
  const owner = createAudioOwnership(null);
  assert.equal(await owner.acquire(), false);
  assert.equal(owner.isOwner(), false);
});
