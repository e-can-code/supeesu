import { mountInvisibleSearch } from './src/app/invisibleSearch.js';
import { comfortState } from './src/environment/comfortLighting.js';
import { RealClock } from './src/time/realClock.js';
import { WorldClock } from './src/time/worldClock.js';
import { CalendarEngine } from './src/calendar/calendarEngine.js';
import { MicroseasonCatalog } from './src/calendar/microseasonCatalog.js';
import { EnvironmentResolver, splashRateMultiplier } from './src/environment/environmentResolver.js';
import { SplashTimeline } from './src/behavior/pondBehavior.js';
import { crossedAcceleratedSplash } from './src/behavior/acceleratedEvents.js';
import { PondRenderer } from './src/visual/pondRenderer.js';
import { PondWebAudioSoundscape } from './src/audio/pondWebAudio.js';
import { PondSoundscape } from './src/audio/soundscape.js';
import { initialPersistentSound, setPersistentSound } from './src/audio/persistencePreference.js';
import { WorldOrrery } from './src/visual/worldOrrery.js';
import { DailyPlaybackPolicy, DAILY_PLAYBACK_LEDGER_KEY } from './src/audio/dailyPlaybackPolicy.js';
import { DailyAudioSupervisor } from './src/audio/dailyAudioSupervisor.js';
import { visibilityPolicy } from './src/app/visibilityPolicy.js';
import { CalendarFieldGuide } from './src/app/calendarFieldGuide.js';

const $ = id => document.getElementById(id);
const sceneRoot = './scenes/living-pool/';
const real = new RealClock();
const world = new WorldClock(real);
const labMode = new URLSearchParams(location.search).has('lab');
const savedPersistent = initialPersistentSound(localStorage, { laboratory: labMode });
let persistentSound = savedPersistent;
let soundscape;
let playbackPolicy;
let dailySupervisor;
let renderer;
let timeline;
let calendar;
let resolver;
let orrery;
let fieldGuide;
let comfortConfig;
let stillScene = false;
let lastComfortMinute = -1;
let searchController;
let raf;
let lastEnvironmentRefresh = -Infinity;
const manualRipples = [];
let previousFastWorldMs = null;
let lastFastRippleRealMs = -Infinity;
let lastFastSplashSoundMs = -Infinity;

function status(message) { $('sceneStatus').textContent = message; }

function updateButtons() {
  $('soundToggle').dataset.active = String(Boolean(soundscape?.active));
  $('musicToggle').dataset.active = String(Boolean(soundscape?.musicEnabled));
  $('persistToggle').dataset.active = String(persistentSound);
  $('persistToggle').setAttribute('aria-pressed', String(persistentSound));
  $('persistToggle').setAttribute('aria-label', `Persistent audio ${persistentSound ? 'on' : 'off'}`);
  $('persistToggle').title = persistentSound ? 'Background sound ON (click to pause on hidden tabs)' : 'Background sound OFF (click to keep it playing)';
  const audio = soundscape?.diagnostics;
  const audioState = !audio ? 'OFFLINE' : audio.contextState === 'running' && audio.active
    ? (audio.pausedForVisibility ? 'PAUSED' : 'PLAYING') : audio.contextState === 'running' ? 'READY'
      : audio.contextState === 'suspended' ? 'BLOCKED OR PAUSED' : 'STOPPED';
  $('audioDiagnostic').textContent = `${audioState}${audio?.ownsLock === false && audio?.active ? ' / NO LOCK' : ''}`;
  if ($('audioLevel')) {
    const linear = (audio?.signalRms ?? 0) * .78;
    $('audioLevel').textContent = audio?.contextState === 'running' && linear > 0
      ? `SIGNAL ${Math.round(20 * Math.log10(linear))} dB` : 'SIGNAL —';
  }
  $('persistState').textContent = persistentSound ? 'PERSIST ON' : 'PERSIST OFF';
  const daily = dailySupervisor?.diagnostics;
  $('dailyAudioState').textContent = daily ? `SESSION ${daily.sessionId} · ${daily.pending ? 'AUDIO READY TO UNLOCK' : !daily.eligible ? 'STARTED' : 'ELIGIBLE'}` : 'SESSION CHECKING';
}

async function startSound({ automatic = false, recordDailySuccess = true } = {}) {
  if (labMode) { status('Laboratory mode: production playback is disabled.'); return; }
  const successful = await soundscape.start();
  if (successful) {
    if (recordDailySuccess) {
      if (dailySupervisor) dailySupervisor.noteManualPlaybackSuccess();
      else playbackPolicy.markActualPlaybackSuccess(true);
    }
    status(automatic ? 'Daily pond ambience started' : 'Pond ambience playing');
  } else {
    const problem = soundscape.diagnostics?.lastError;
    status(problem ? `Audio did not start: ${problem}. Click the speaker or test chime.`
      : 'Audio unavailable: another sounding tab may hold the exclusive lock.');
  }
  updateButtons();
  return successful;
}

function tickVisual() {
  if (document.hidden) { raf = null; previousFastWorldMs = null; return; }
  const worldMs = world.nowMs();
  if (Math.abs(worldMs - lastEnvironmentRefresh) >= 160) {
    const state = calendar.describe(worldMs, { includeDevelopmentEvents: true });
    const environment = resolver.resolve(worldMs, state);
    renderer.applyEnvironment(environment);
    applyComfort();
    $('seasonName').textContent = `${state.ecology.seasonId.replaceAll('-', ' ')} · ${state.worldLocalDate}`;
    $('lightReadout').textContent = `SKY: ${environment.sky.phase.toUpperCase()}   LIGHT: ${Math.round(environment.illumination * 100)}%`;
    $('rhythmReadout').textContent = `ECOLOGY ${state.ecology.day}/800 · 7-DAY ${state.rhythms.microseasonDay} · 200D ${state.rhythms.day200} · 400D ${state.rhythms.day400}`;
    const d = environment.diagnostics;
    $('calendarReadout').textContent = `MOONS ${Math.round(d.earthMoon.illumination*100)}% / ${Math.round(d.jadeMoon.illumination*100)}% · TREE ${Math.round(d.tree.dailyGrowth*100)}% · ${d.weather.raining?'RAIN':d.weather.rainbow?'RAINBOW':d.weather.afterRain?'DAMP':'CLEAR'}`;
    fieldGuide?.update(state, environment);
    orrery?.update();
    lastEnvironmentRefresh = worldMs;
  }
  const dateId = calendar.describe(worldMs, {includeDevelopmentEvents:true}).worldLocalDate;
  const sample = timeline.sample(worldMs, dateId, { allowLiveEvents: true });
  for (const event of sample.triggered) if (soundscape.active) soundscape.playSplash();
  const now = real.nowMs();
  if (world.mode === 'simulated' && world.rate > 1 && previousFastWorldMs !== null && now - lastFastRippleRealMs > 1700) {
    const event = crossedAcceleratedSplash(previousFastWorldMs, worldMs, timeline);
    if (event) {
      manualRipples.push({ ...event, id: `accelerated:${event.id}:${now}`, atMs: now, source: 'manual' });
      lastFastRippleRealMs = now;
      if (soundscape.active && now - lastFastSplashSoundMs > 6500) {
        void soundscape.playSplash(); lastFastSplashSoundMs = now;
      }
    }
  }
  previousFastWorldMs = world.mode === 'simulated' && world.rate > 1 ? worldMs : null;
  for (let i = manualRipples.length - 1; i >= 0; i--) {
    if (now - manualRipples[i].atMs > 2400) manualRipples.splice(i, 1);
  }
  if (!stillScene) renderer.renderFrame(worldMs, [...sample.ripples, ...manualRipples], now);
  if (Math.floor(real.nowMs()/60000) !== lastComfortMinute) applyComfort();
  raf = requestAnimationFrame(tickVisual);
}

function handleVisibility() {
  const policy = visibilityPolicy({ hidden: document.hidden, persistentSound, audioActive: soundscape.active });
  if (!policy.animateVisuals) {
    renderer.suspendVisuals();
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  } else {
    renderer.resumeVisuals();
    timeline.resetOnSeek();
    lastEnvironmentRefresh = -Infinity;
    applyComfort();
    if (!raf) raf = requestAnimationFrame(tickVisual);
  }
  if (policy.audioAction === 'pause') void soundscape.pause();
  if (policy.audioAction === 'resume') void soundscape.resume();
  // The background loop is deliberately not suspended when persistence is on.
  $('visibilityReadout').textContent = document.hidden ? 'VISUALS SUSPENDED' : 'VISUALS ACTIVE';
  updateButtons();
}

function applyComfort() {
  if (!comfortConfig || !renderer?.root) return;
  const date = new Date(real.nowMs());
  lastComfortMinute = Math.floor(real.nowMs()/60000);
  const state = comfortState(comfortConfig,date);
  // Separate sky, ground, water and foreground response; no global dark rectangle.
  renderer.applyComfort?.(state);
}

async function init() {
  const [calendarData, environmentData, manifestData, microseasonData] = await Promise.all([
    fetch('./calendar/calendar.json'),
    fetch(sceneRoot + 'environment.json'),
    fetch(sceneRoot + 'scene.json'),
    fetch('./calendar/source/microseasons_first_200_days.original.json')
  ]);
  if (![calendarData, environmentData, manifestData, microseasonData].every(response => response.ok)) {
    throw new Error('Unable to load a calendar, environment profile, or scene manifest.');
  }
  const calendarConfig = await calendarData.json();
  const environmentConfig = await environmentData.json();
  const sceneConfig = await manifestData.json();
  const microseasonSource = await microseasonData.json();
  comfortConfig = await (await fetch('./shared/lighting/comfort-policy.json')).json();
  calendar = new CalendarEngine(calendarConfig);
  searchController = mountInvisibleSearch({form:$('searchForm'),input:$('searchInput'),dots:$('searchDots'),google:$('googleDot'),duck:$('duckDot'),sceneColors:sceneConfig.searchAppearance});
  const setMode = laboratory => { document.body.classList.toggle('laboratory',laboratory); $('homeLabToggle').setAttribute('aria-label', laboratory ? 'Return to Home' : 'Show laboratory instruments'); searchController.focus(); };
  setMode(new URLSearchParams(location.search).has('lab'));
  $('homeLabToggle').addEventListener('click',()=>setMode(!document.body.classList.contains('laboratory')));
  document.addEventListener('keydown',e=>{if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='l'){e.preventDefault();setMode(!document.body.classList.contains('laboratory'));}});
  $('stillToggle').addEventListener('click',()=>{stillScene=!stillScene;document.body.classList.toggle('still-scene',stillScene);$('stillToggle').setAttribute('aria-pressed',String(stillScene));});
  resolver = new EnvironmentResolver(environmentConfig, calendarConfig, {microseasonCatalog:new MicroseasonCatalog(microseasonSource)});
  timeline = new SplashTimeline(environmentConfig.splashBehavior,
    minute => splashRateMultiplier(minute, environmentConfig.splashBehavior), sceneConfig.sceneId);
  renderer = new PondRenderer(sceneConfig, { assetRoot: sceneRoot }).mount($('pond'));
  renderer.onRipple = point => {
    manualRipples.push({ ...point, id: `manual:${real.nowMs()}:${manualRipples.length}`, atMs: real.nowMs(), source: 'manual' });
    if (soundscape.active) soundscape.playSplash();
  };
  const AudioEngine = (window.AudioContext || window.webkitAudioContext) ? PondWebAudioSoundscape : PondSoundscape;
  soundscape = new AudioEngine({ sources: Object.fromEntries(
    Object.entries(sceneConfig.audio).map(([key, file]) => [key, sceneRoot + file])
  ) });
  soundscape.onState = state => {
    if (state.startsWith('playback-blocked')) status('Audio blocked or interrupted. Click the speaker to restart.');
    if (state === 'ownership-unavailable') status('Another Supeesu tab owns the audio. Stop its sound first.');
    updateButtons();
  };
  playbackPolicy = new DailyPlaybackPolicy({ clock: real, storage: localStorage, enabled: !labMode });
  if (!labMode) {
    dailySupervisor = new DailyAudioSupervisor({
      clock: real, policy: playbackPolicy, isPlaying: () => soundscape.active && !soundscape.pausedForVisibility,
      canAttempt: () => !document.hidden || persistentSound,
      tryStart: options => startSound(options),
      onState: state => {
        if (state === 'awaiting-interaction') status('Daily sound is ready; Firefox needs a click on the speaker to start it.');
        updateButtons();
      }
    });
  }
  $('soundToggle').addEventListener('click', async () => {
    if (soundscape.active) { await soundscape.stop(); status('Pond ambience stopped'); updateButtons(); }
    else await startSound();
  });
  $('musicToggle').addEventListener('click', async () => {
    await soundscape.toggleMusic();
    status(soundscape.musicEnabled ? (soundscape.active ? 'Music playing with pond ambience' : 'Music queued; start pond ambience to hear it') : 'Music muted');
    updateButtons();
  });
  $('audioTest').addEventListener('click', async () => {
    // A test chime never writes the real session-playback ledger.
    if (!soundscape.active) await startSound({ recordDailySuccess: false });
    if (!soundscape.active) return;
    const heard = await soundscape.testTone?.();
    status(heard ? 'Diagnostic chime dispatched through the pond mixer (check speaker volume).' : 'Test chime unavailable. Check browser audio permission.');
    updateButtons();
  });
  $('persistToggle').addEventListener('click', () => {
    persistentSound = !persistentSound;
    setPersistentSound(localStorage, persistentSound, { laboratory: labMode });
    updateButtons();
    status(persistentSound ? 'Background sound stays on when switching tabs' : 'Background sound pauses when hidden');
    if (!document.hidden && soundscape.active) void soundscape.resume();
  });
  orrery = new WorldOrrery({ host: $('orreryStage'), worldClock: world, calendar, onSeek: () => {
    timeline.resetOnSeek();
    lastEnvironmentRefresh = -Infinity;
    previousFastWorldMs = null;
    manualRipples.length = 0;
    // No skipped sounds play when the World Clock is moved.
  } });
  fieldGuide = new CalendarFieldGuide({world, calendar, onSeek: () => {
    timeline.resetOnSeek(); lastEnvironmentRefresh = -Infinity; previousFastWorldMs = null; manualRipples.length = 0; orrery.update();
  }});
  await fieldGuide.load('./dev/coverageScenarios.json');
  $('diagnosticToggle').addEventListener('click', () => {
    document.body.classList.toggle('hide-diagnostics');
    $('diagnosticToggle').setAttribute('aria-pressed', String(!document.body.classList.contains('hide-diagnostics')));
  });
  document.addEventListener('visibilitychange', () => { handleVisibility(); void dailySupervisor?.check('visibility'); });
  window.addEventListener('focus', () => { void dailySupervisor?.check('focus'); });
  window.addEventListener('pageshow', () => { void dailySupervisor?.check('pageshow'); });
  window.addEventListener('storage', event => {
    if (event.key === DAILY_PLAYBACK_LEDGER_KEY) { void dailySupervisor?.check('other-tab-ledger'); updateButtons(); }
  });
  window.addEventListener('pagehide', () => { dailySupervisor?.end(); void soundscape.stop(); });
  updateButtons();
  renderer.resumeVisuals();
  raf = requestAnimationFrame(tickVisual);
  status('Living Pool ready · Ctrl+Shift+L opens the laboratory');
  searchController.focus();
  handleVisibility();
  dailySupervisor?.begin();
  window.__supeesuScene = { real, world, calendar, resolver, renderer, timeline, soundscape, playbackPolicy, dailySupervisor, orrery, fieldGuide };
}
init().catch(error => { status(`Scene failed: ${error.message}`); console.error(error); });
