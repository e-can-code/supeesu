import { RealClock } from './realClock.js';

export class WorldClock {
  constructor(realClock = new RealClock()) {
    this.realClock = realClock;
    this.mode = 'real';
    this.rate = 1;
    this.anchorRealMs = realClock.nowMs();
    this.anchorWorldMs = this.anchorRealMs;
    this.previousRate = 1;
  }

  nowMs() {
    if (this.mode === 'real') return this.realClock.nowMs();
    return this.anchorWorldMs + (this.realClock.nowMs() - this.anchorRealMs) * this.rate;
  }

  getState() {
    return { mode: this.mode, rate: this.rate, nowMs: this.nowMs() };
  }

  seek(instantMs) {
    if (!Number.isFinite(instantMs)) throw new TypeError('World instant must be finite milliseconds.');
    this.anchorRealMs = this.realClock.nowMs();
    this.anchorWorldMs = instantMs;
    this.mode = 'simulated';
  }

  setRate(rate) {
    if (!Number.isFinite(rate) || rate < 0) throw new RangeError('Simulation rate must be nonnegative and finite.');
    const current = this.nowMs();
    this.anchorRealMs = this.realClock.nowMs();
    this.anchorWorldMs = current;
    this.rate = rate;
    this.mode = 'simulated';
    if (rate > 0) this.previousRate = rate;
  }

  pause() {
    this.setRate(0);
  }

  resume() {
    this.setRate(this.previousRate || 1);
  }

  useRealTime() {
    this.mode = 'real';
    this.rate = 1;
    this.previousRate = 1;
    this.anchorRealMs = this.realClock.nowMs();
    this.anchorWorldMs = this.anchorRealMs;
  }
}
