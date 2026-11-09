import { createAudioOwnership } from './audioOwnership.js';

// The short looping assets are decoded once and mixed by a single Web Audio context.
// This uses the same continuous-audio mechanism as the successful laboratory tone.
// Web Audio can still be suspended by the OS or browser; that limitation is observable.
export class PondWebAudioSoundscape {
  constructor({ sources, ownership = createAudioOwnership(),
    audioContextFactory = () => new (window.AudioContext || window.webkitAudioContext)(),
    fetcher = url => fetch(url), resumeTimeoutMs = 1800 } = {}) {
    this.sources = sources;
    this.ownership = ownership;
    this.audioContextFactory = audioContextFactory;
    this.fetcher = fetcher;
    this.resumeTimeoutMs = resumeTimeoutMs;
    this.startInFlight = null;
    this.ctx = null;
    this.buffers = new Map();
    this.channels = new Map();
    this.active = false;
    this.musicEnabled = false;
    this.pausedForVisibility = false;
    this.onState = () => {};
    this.lastError = null;
    this.signalRms = 0;
    this.primedResume = null;
    this.lastSplashAt = -Infinity;
  }

  async bufferFor(kind) {
    if (this.buffers.has(kind)) return this.buffers.get(kind);
    const response = await this.fetcher(this.sources[kind]);
    if (!response.ok) throw new Error(`${kind} audio asset could not load (${response.status}).`);
    const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
    this.buffers.set(kind, buffer);
    if (kind === 'ambience' && typeof buffer.getChannelData === 'function') {
      const samples = buffer.getChannelData(0);
      const stride = Math.max(1, Math.floor(samples.length / 5000));
      let sum = 0, count = 0;
      for (let i = 0; i < samples.length; i += stride) { sum += samples[i] * samples[i]; count += 1; }
      this.signalRms = Math.sqrt(sum / Math.max(1, count));
    }
    return buffer;
  }

  launch(kind, { loop = true, volume = 0.15 } = {}) {
    if (this.channels.has(kind)) return this.channels.get(kind);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.buffers.get(kind);
    source.loop = loop;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    const channel = { source, gain };
    this.channels.set(kind, channel);
    return channel;
  }

  stopChannel(kind) {
    const channel = this.channels.get(kind);
    if (!channel) return;
    try { channel.source.stop(); } catch { /* Already stopped. */ }
    try { channel.source.disconnect(); channel.gain.disconnect(); } catch { /* Context closing. */ }
    this.channels.delete(kind);
  }

  primeUserGesture() {
    // Call resume() in the original click stack before awaiting the tab lock or
    // network requests. Otherwise transient user activation may be lost.
    if (!this.ctx || this.ctx.state === 'closed') this.ctx = this.audioContextFactory();
    if (this.ctx.state === 'running') return Promise.resolve();
    // Do not defer the actual browser API call into a Promise continuation.
    const browserResume = this.ctx.resume();
    this.primedResume = Promise.resolve(browserResume).catch(error => { this.lastError = String(error); });
    return this.primedResume;
  }

  async start() {
    this.primeUserGesture();
    if (this.startInFlight) return this.startInFlight;
    this.startInFlight = this.startInternal();
    try { return await this.startInFlight; }
    finally { this.startInFlight = null; }
  }

  async resumeContext() {
    // Firefox may leave resume() pending when autoplay has not been authorized.
    // A bounded attempt prevents a half-initialized scene from hanging indefinitely.
    let timer;
    try {
      return await Promise.race([
        this.ctx.resume(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Audio resume awaits user interaction.')), this.resumeTimeoutMs);
        })
      ]);
    } finally { clearTimeout(timer); }
  }

  async startInternal() {
    if (this.active) return this.resume();
    const owned = await this.ownership.acquire();
    if (!owned) { this.onState('ownership-unavailable'); return false; }
    try {
      await this.resumeContext();
      if (this.ctx.state !== 'running') throw new Error(`Audio context is ${this.ctx.state}.`);
      await this.bufferFor('ambience');
      this.launch('ambience', { volume: 0.78 });
      if (this.musicEnabled) {
        try { await this.bufferFor('music'); this.launch('music', { volume: 0.46 }); }
        catch { this.musicEnabled = false; this.onState('music-blocked'); }
      }
      this.active = true;
      this.pausedForVisibility = false;
      this.lastError = null;
      this.onState('playing');
      return true;
    } catch (error) {
      this.lastError = error.message;
      // A pending browser resume must not be interrupted by closing its context.
      // Retain the suspended context for a later explicit user gesture.
      if (this.ctx?.state === 'suspended') {
        this.ownership.release();
        this.active = false;
      } else {
        await this.closeAndRelease();
      }
      this.onState(`playback-blocked: ${error.message}`);
      return false;
    }
  }

  async toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.active) { this.onState(this.musicEnabled ? 'music-queued' : 'music-off'); return; }
    if (!this.musicEnabled) this.stopChannel('music');
    else {
      try { await this.bufferFor('music'); this.launch('music', { volume: 0.46 }); }
      catch { this.musicEnabled = false; this.onState('music-blocked'); }
    }
    this.onState(this.musicEnabled ? 'music-on' : 'music-off');
  }

  async playSplash() {
    if (!this.active || this.ctx?.state !== 'running') return false;
    if (this.ctx.currentTime - this.lastSplashAt < 0.45) return false;
    this.lastSplashAt = this.ctx.currentTime;
    try {
      await this.bufferFor('splash');
      // Independent one-shots may overlap without interrupting the ambient bed.
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this.buffers.get('splash');
      gain.gain.value = 0.38;
      source.connect(gain); gain.connect(this.ctx.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start();
      return true;
    } catch { this.onState('splash-blocked'); return false; }
  }

  async testTone() {
    // This is an explicit audible test, not evidence of speaker output or
    // entitlement to the once-per-session playback ledger.
    if (!this.active || !this.ctx || this.ctx.state !== 'running') return false;
    if (typeof this.ctx.createOscillator !== 'function') return false;
    const now = this.ctx.currentTime;
    const tone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    tone.type = 'sine';
    tone.frequency.value = 523.25;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.30, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    tone.connect(gain); gain.connect(this.ctx.destination);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    tone.start(now); tone.stop(now + 0.72);
    return true;
  }

  async pause() {
    if (!this.active || !this.ctx || this.ctx.state !== 'running') return false;
    await this.ctx.suspend();
    this.pausedForVisibility = true;
    this.onState('paused');
    return true;
  }

  async resume() {
    if (!this.active || !this.ctx) return false;
    try {
      if (this.ctx.state !== 'running') await this.resumeContext();
      const running = this.ctx.state === 'running';
      this.pausedForVisibility = !running;
      this.onState(running ? 'playing' : 'playback-blocked');
      return running;
    } catch { this.onState('playback-blocked'); return false; }
  }

  async closeAndRelease() {
    for (const kind of [...this.channels.keys()]) this.stopChannel(kind);
    this.active = false;
    this.pausedForVisibility = false;
    if (this.ctx && this.ctx.state !== 'closed') {
      try { await this.ctx.close(); } catch { /* Browser may close during navigation. */ }
    }
    this.ctx = null;
    this.primedResume = null;
    this.lastSplashAt = -Infinity;
    this.buffers.clear();
    this.ownership.release();
  }

  stop() {
    const ending = this.closeAndRelease();
    this.onState('stopped');
    return ending;
  }

  get diagnostics() {
    return { active: this.active, contextState: this.ctx?.state ?? 'closed',
      channels: [...this.channels.keys()], pausedForVisibility: this.pausedForVisibility,
      ownsLock: this.ownership.isOwner?.() ?? null,
      signalRms: Number(this.signalRms.toFixed(4)), lastError: this.lastError };
  }
}
