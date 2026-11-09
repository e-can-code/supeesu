// Supervises the real 05:30 session boundary without consulting the World Clock.
// Automatic attempts occur at most once per session. A blocked attempt remains
// pending for a later user gesture; neither failure nor simulation writes history.
export class DailyAudioSupervisor {
  constructor({ clock, policy, tryStart, isPlaying, canAttempt = () => true, onState = () => {},
    schedule = (callback, delay) => setTimeout(callback, delay),
    cancel = token => clearTimeout(token), maxCheckIntervalMs = 30_000 } = {}) {
    if (!clock?.nowMs || !policy?.eligibility || !policy?.markActualPlaybackSuccess ||
        typeof tryStart !== 'function' || typeof isPlaying !== 'function') {
      throw new TypeError('Daily audio supervision requires real clock, ledger, and playback adapters.');
    }
    this.clock = clock;
    this.policy = policy;
    this.tryStart = tryStart;
    this.isPlaying = isPlaying;
    this.canAttempt = canAttempt;
    this.onState = onState;
    this.schedule = schedule;
    this.cancel = cancel;
    this.maxCheckIntervalMs = maxCheckIntervalMs;
    this.running = false;
    this.attemptedSession = null;
    this.pendingSession = null;
    this.inFlight = null;
    this.timer = null;
  }

  begin() {
    if (this.running) return;
    this.running = true;
    void this.check('opening');
  }

  end() {
    this.running = false;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
  }

  scheduleNextCheck() {
    if (!this.running) return;
    if (this.timer !== null) this.cancel(this.timer);
    const now = this.clock.nowMs();
    const { endsAtMs } = this.policy.eligibility().session;
    const untilBoundary = Math.max(10, endsAtMs - now + 10);
    const delay = Math.min(this.maxCheckIntervalMs, untilBoundary);
    this.timer = this.schedule(() => {
      this.timer = null;
      void this.check('time-tick');
    }, delay);
  }

  async check(reason = 'refresh') {
    if (!this.running) return false;
    const eligibility = this.policy.eligibility();
    const session = eligibility.sessionId;
    this.scheduleNextCheck();
    if (!eligibility.eligible) {
      this.pendingSession = null;
      this.onState('already-started', session);
      return false;
    }
    if (this.isPlaying()) {
      this.policy.markActualPlaybackSuccess(true);
      this.pendingSession = null;
      this.onState('already-playing-at-boundary', session);
      return true;
    }
    if (!this.canAttempt()) {
      this.pendingSession = session;
      this.onState('deferred-hidden', session);
      return false;
    }
    if (this.attemptedSession === session || this.inFlight) return false;
    this.attemptedSession = session;
    this.onState('attempting', session);
    const attempt = Promise.resolve().then(() => this.tryStart({ automatic: true, recordDailySuccess: false }));
    this.inFlight = attempt;
    let started = false;
    try {
      started = await attempt;
    } catch (error) {
      this.onState('error', String(error?.message ?? error));
    } finally {
      if (this.inFlight === attempt) this.inFlight = null;
    }
    if (!this.running) return false;
    if (started && this.isPlaying()) {
      // Do not credit a past session if a playback attempt crossed 05:30.
      const currentSession = this.policy.eligibility().sessionId;
      this.policy.markActualPlaybackSuccess(true);
      this.pendingSession = null;
      this.onState('started', currentSession);
      return true;
    }
    this.pendingSession = session;
    this.onState('awaiting-interaction', session);
    return false;
  }

  // Call only after genuine user-initiated audio succeeds, not on World Clock seek.
  noteManualPlaybackSuccess() {
    if (!this.running || !this.isPlaying()) return false;
    this.policy.markActualPlaybackSuccess(true);
    this.pendingSession = null;
    this.onState('started-by-interaction', this.policy.eligibility().sessionId);
    return true;
  }

  get diagnostics() {
    const eligibility = this.policy.eligibility();
    return {
      sessionId: eligibility.sessionId,
      eligible: eligibility.eligible,
      pending: eligibility.eligible && this.pendingSession === eligibility.sessionId,
      attemptMade: this.attemptedSession === eligibility.sessionId,
      running: this.running
    };
  }
}
