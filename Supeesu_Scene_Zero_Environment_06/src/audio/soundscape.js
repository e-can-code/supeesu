import { createAudioOwnership } from './audioOwnership.js';

export class PondSoundscape {
  constructor({ sources, audioFactory = url => new Audio(url), ownership = createAudioOwnership() }) {
    this.sources = sources;
    this.audioFactory = audioFactory;
    this.ownership = ownership;
    this.tracks = new Map();
    this.active = false;
    this.musicEnabled = false;
    this.activeSplashes = new Set();
    this.onState = () => {};
    this.lastError = null;
  }

  track(kind) {
    if (this.tracks.has(kind)) return this.tracks.get(kind);
    const track = this.audioFactory(this.sources[kind]);
    track.loop = kind !== 'splash';
    track.volume = kind === 'ambience' ? .24 : kind === 'music' ? .13 : .18;
    this.tracks.set(kind, track);
    return track;
  }

  async start() {
    if (this.active && !this.track('ambience').paused) return true;
    const owned = await this.ownership.acquire();
    if (!owned) { this.onState('ownership-unavailable'); return false; }
    try {
      const ambient = this.track('ambience');
      await ambient.play();
      if (ambient.paused) throw new Error('Ambient media did not begin playback.');
      this.active = true;
      if (this.musicEnabled) await this.track('music').play().catch(() => { this.musicEnabled = false; });
      this.onState('playing');
      return true;
    } catch (error) {
      this.ownership.release();
      this.active = false;
      this.lastError = error.message;
      this.onState(`playback-blocked: ${error.message}`);
      return false;
    }
  }

  async toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.active) { this.onState(this.musicEnabled ? 'music-queued' : 'music-off'); return; }
    const music = this.track('music');
    if (!this.musicEnabled) music.pause();
    else {
      try { await music.play(); } catch { this.musicEnabled = false; this.onState('music-blocked'); }
    }
    this.onState(this.musicEnabled ? 'music-on' : 'music-off');
  }

  async playSplash() {
    if (!this.active) return false;
    const splash = this.audioFactory(this.sources.splash);
    splash.volume = .16;
    this.activeSplashes.add(splash);
    splash.onended = () => this.activeSplashes.delete(splash);
    try { await splash.play(); return true; }
    catch { this.activeSplashes.delete(splash); return false; }
  }

  pause() {
    for (const track of this.tracks.values()) track.pause();
    for (const splash of this.activeSplashes) splash.pause();
    this.activeSplashes.clear();
    this.onState('paused');
  }

  async resume() {
    if (!this.active) return false;
    try {
      await this.track('ambience').play();
      if (this.musicEnabled) await this.track('music').play();
      this.onState('playing');
      return true;
    } catch { this.onState('playback-blocked'); return false; }
  }

  async testTone() {
    // The fallback cannot synthesize a diagnostic tone without Web Audio.
    return false;
  }

  get diagnostics() {
    return { active: this.active, contextState: this.active ? 'html-audio' : 'closed',
      channels: this.active ? [...this.tracks.entries()].filter(([, item]) => !item.paused).map(([key]) => key) : [],
      pausedForVisibility: false, ownsLock: this.ownership.isOwner?.() ?? null,
      signalRms: 0, lastError: this.lastError };
  }

  stop() {
    this.pause();
    this.active = false;
    this.ownership.release();
    this.onState('stopped');
  }
}
