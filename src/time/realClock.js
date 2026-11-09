export class RealClock {
  constructor(now = () => Date.now()) {
    if (typeof now !== 'function') throw new TypeError('A clock source function is required.');
    this.source = now;
  }

  nowMs() {
    return this.source();
  }
}
