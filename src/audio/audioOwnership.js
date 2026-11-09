export function createAudioOwnership(lockManager = globalThis.navigator?.locks) {
  const lockName = 'supeesu-world-audio-v1';
  let releaseLock = null;
  let acquisitionInProgress = false;

  return {
    async acquire() {
      if (releaseLock) return true;
      if (acquisitionInProgress) return false;
      if (!lockManager?.request) return false;
      acquisitionInProgress = true;
      let reportAcquisition;
      const acquired = new Promise(resolve => { reportAcquisition = resolve; });
      lockManager.request(lockName, { ifAvailable: true, mode: 'exclusive' }, async lock => {
        if (!lock) {
          acquisitionInProgress = false;
          reportAcquisition(false);
          return;
        }
        await new Promise(resolve => {
          releaseLock = resolve;
          acquisitionInProgress = false;
          reportAcquisition(true);
        });
        releaseLock = null;
      }).catch(() => {
        acquisitionInProgress = false;
        reportAcquisition(false);
      });
      return acquired;
    },
    release() {
      if (releaseLock) releaseLock();
    },
    isOwner() {
      return Boolean(releaseLock);
    }
  };
}
