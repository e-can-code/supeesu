import { previewDailyBoundary } from '../src/audio/dailySessionPreview.js';
import { RealClock } from '../src/time/realClock.js';
import { WorldClock } from '../src/time/worldClock.js';
import { SessionClock, sessionForInstant } from '../src/time/sessionClock.js';
import { CalendarEngine } from '../src/calendar/calendarEngine.js';
import { MicroseasonCatalog } from '../src/calendar/microseasonCatalog.js';
import { createAudioOwnership } from '../src/audio/audioOwnership.js';
import { EnvironmentResolver, splashRateMultiplier } from '../src/environment/environmentResolver.js';
import { PondRenderer } from '../src/visual/pondRenderer.js';
import { SplashTimeline } from '../src/behavior/pondBehavior.js';
import { checkEnvironmentExpectations } from './environmentChecks.js';
import {
  checkScenarioAssertions,
  describeScenarioApplication,
  describeWorldMode
} from './labPresentation.js';

const $ = id => document.getElementById(id);
const setText = (id, value) => {
  if ($(id).textContent !== value) $(id).textContent = value;
};
const real = new RealClock();
const world = new WorldClock(real);
const realSession = new SessionClock(real);
const previewSession = new SessionClock(world);
const audioOwner = createAudioOwnership();
let calendar;
let resolver;
let pond;
let splashTimeline;
let latestEnvironment;
const manualRipples = [];
let previewAnimation = null;
let ctx;
let oscillator;
let scenarios = [];
let appliedScenarioId = null;

const asDateTime = ms => {
  const date = new Date(ms);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function stateFrom(worldMs) { return calendar.describe(worldMs, { includeDevelopmentEvents: true }); }

function selectedScenario() {
  return scenarios[Number($('scenario').value)] ?? null;
}

function render() {
  const realMs = real.nowMs();
  const worldState = world.getState();
  const worldMs = worldState.nowMs;
  const mode = describeWorldMode(worldState);
  const selected = selectedScenario();
  const application = describeScenarioApplication(selected, appliedScenarioId, worldState);

  $('realClock').textContent = new Date(realMs).toLocaleString();
  $('worldClock').textContent = new Date(worldMs).toLocaleString();
  $('sessionClock').textContent = sessionForInstant(realMs).id;
  $('mode').textContent = mode.label;
  $('mode').dataset.mode = mode.id;
  $('worldStateMode').textContent = mode.label;
  $('worldStateMode').dataset.mode = mode.id;
  $('worldModeExplanation').textContent = mode.explanation;
  $('activeWorldDate').textContent = asDateTime(worldMs).replace('T', ' · ');
  setText('scenarioStatus', application.label);
  $('scenarioStatus').dataset.status = application.id;
  $('scenarioDate').textContent = selected
    ? selected.worldLocalDateTime.replace('T', ' · ')
    : '—';

  if (!calendar) return;
  const state = calendar.describe(worldMs, { includeDevelopmentEvents: true });
  latestEnvironment = resolver?.resolve(worldMs, stateFrom(worldMs));
  if (latestEnvironment && pond) {
    pond.applyEnvironment(latestEnvironment);
    const percent = value => `${Math.round(value * 100)}%`;
    setText('envLight', percent(latestEnvironment.illumination));
    setText('envWarmth', percent(latestEnvironment.warmth));
    setText('envMist', percent(latestEnvironment.mist));
    setText('envFish', percent(latestEnvironment.fishActivity));
    setText('envSplash', `${latestEnvironment.splashMultiplier.toFixed(2)}×`);
    setText('envEarthMoon', percent(latestEnvironment.diagnostics.earthMoon.illumination) + ' · approximate');
    setText('envJadeMoon', percent(latestEnvironment.diagnostics.jadeMoon.illumination) + ' · provisional');
    const next = splashTimeline.eventsForDay(latestEnvironment.worldLocalDate).find(event => event.atMs > worldMs);
    setText('nextSplash', next ? new Date(next.atMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tomorrow');
    setText('environmentState', JSON.stringify(latestEnvironment, null, 2));
  }
  const result = {
    worldLocalTime: asDateTime(worldMs),
    actualSessionDay: sessionForInstant(realMs).id,
    simulatedSessionDay: sessionForInstant(worldMs).id,
    ...state
  };
  $('calendarState').textContent = JSON.stringify(result, null, 2);
  $('seasonSignal').textContent = `${state.ecology.seasonId} · season day ${state.ecology.seasonDay} · ecological day ${state.ecology.day}/800 · cycle ${state.ecology.cycleIndex}`;
  $('rhythmSignal').textContent = `200: ${state.rhythms.day200} · 400: ${state.rhythms.day400}`;
  $('microSignal').textContent = `7-day: ${state.rhythms.microseasonDay} · ${state.rhythms.authoredMicroseasonId ?? 'no authored profile'}`;
  $('seasonSignal').style.background = ['#6f7254','#5e755f','#5c7c7b','#967858','#766b82','#736246','#7a6971','#576e64'][state.ecology.seasonIndex - 1];

  if (!application.applied) {
    setText('scenarioChecks', 'Scenario not applied. The current world state above is independent of this selection. Choose “Jump world time to scenario” to run its checks.');
    setText('environmentScenarioChecks', 'Environment scenario not applied.');
    return;
  }

  const observed = { ...result, annualEventIds: result.annualEvents.map(event => event.id) };
  const outcomes = checkScenarioAssertions(selected.assertions, observed);
  const passed = outcomes.filter(outcome => outcome.passes).length;
  setText('scenarioChecks', `${passed}/${outcomes.length} state checks pass\n` +
    outcomes.map(outcome => `${outcome.passes ? 'PASS' : 'FAIL'} ${outcome.path}\n  expected: ${JSON.stringify(outcome.expected)}\n  observed: ${JSON.stringify(outcome.actual)}`).join('\n'));
  const environmentChecks = checkEnvironmentExpectations(selected.environmentExpectations, latestEnvironment);
  const environmentPasses = environmentChecks.filter(item => item.passes).length;
  setText('environmentScenarioChecks', environmentChecks.length
    ? `${environmentPasses}/${environmentChecks.length} environment parameter checks pass\n` + environmentChecks.map(item =>
      `${item.passes ? 'PASS' : 'FAIL'} ${item.key}\n  expected: ${JSON.stringify(item.expected)}\n  observed: ${JSON.stringify(item.actual)}`).join('\n')
    : 'No environment assertions are authored for this scenario. Inspect the pond and environment state manually.');
}

$('seek').addEventListener('click', () => {
  const instant = new Date($('dateTime').value).getTime();
  if (!Number.isFinite(instant)) {
    $('worldModeExplanation').textContent = 'Enter a valid world date and time before seeking.';
    return;
  }
  appliedScenarioId = null;
  world.seek(instant);
  world.setRate(Number($('rate').value));
  render();
});
$('rate').addEventListener('change', () => {
  appliedScenarioId = null;
  world.setRate(Number($('rate').value));
  render();
});
$('real').addEventListener('click', () => {
  appliedScenarioId = null;
  world.useRealTime();
  $('rate').value = '1';
  $('dateTime').value = asDateTime(real.nowMs());
  render();
});
$('loadScenario').addEventListener('click', () => {
  const scenario = selectedScenario();
  if (!scenario) return;
  const instant = new Date(scenario.worldLocalDateTime).getTime();
  if (!Number.isFinite(instant)) return;
  $('dateTime').value = asDateTime(instant);
  $('rate').value = '0';
  world.seek(instant);
  world.pause();
  appliedScenarioId = scenario.id;
  render();
});
$('scenario').addEventListener('change', () => {
  const scenario = selectedScenario();
  $('expected').textContent = scenario?.expected ?? 'Choose a diagnostic scenario.';
  appliedScenarioId = null;
  render();
});

$('startTone').addEventListener('click', async () => {
  if (oscillator) return;
  const acquired = await audioOwner.acquire();
  if (!acquired) {
    $('audioStatus').textContent = 'Unavailable: another tab owns audio (or Web Locks unsupported).';
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable.');
    ctx = new AudioContextClass();
    oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 196;
    gain.gain.value = 0.025;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    await ctx.resume();
    $('audioStatus').textContent = ctx.state === 'running'
      ? 'Tone active · lock acquired'
      : `Tone context ${ctx.state} · check browser permission`;
  } catch (error) {
    $('audioStatus').textContent = `Audio failed: ${error.message}`;
    oscillator = null;
    await ctx?.close();
    ctx = null;
    audioOwner.release();
  }
});
$('testDailyBoundary').addEventListener('click', () => {
  const result = previewDailyBoundary(world.nowMs());
  $('dailyBoundaryReport').textContent = [
    `BEFORE ${result.before.localTime}: ${result.before.sessionId}`,
    `AFTER  ${result.after.localTime}: ${result.after.sessionId}`,
    `Session rollover: ${result.sessionChanged ? 'PASS' : 'FAIL'}`,
    `New session eligible: ${result.firstStartEligible ? 'PASS' : 'FAIL'}`,
    `Second start suppressed: ${result.duplicateStartSuppressed ? 'PASS' : 'FAIL'}`,
    'Real audio requests: 0 · Storage writes: 0'
  ].join('\n');
});
$('stopTone').addEventListener('click', async () => {
  oscillator?.stop();
  oscillator = null;
  await ctx?.close();
  ctx = null;
  audioOwner.release();
  $('audioStatus').textContent = 'Stopped · lock released';
});
document.addEventListener('visibilitychange', () => {
  if (oscillator) $('audioStatus').textContent = `Tone active · tab ${document.visibilityState} · audio ${ctx?.state ?? 'unknown'}`;
});
window.addEventListener('pagehide', () => audioOwner.release());

async function initialize() {
  const [calendarResponse, scenariosResponse, environmentResponse, manifestResponse, microseasonResponse] = await Promise.all([
    fetch('../calendar/calendar.json'), fetch('scenarios.json'),
    fetch('../scenes/living-pool/environment.json'), fetch('../scenes/living-pool/scene.json'),
    fetch('../calendar/source/microseasons_first_200_days.original.json')
  ]);
  if (!calendarResponse.ok || !scenariosResponse.ok || !microseasonResponse.ok) throw new Error('Unable to load foundation data.');
  const calendarConfig = await calendarResponse.json();
  calendar = new CalendarEngine(calendarConfig);
  const environmentConfig = await environmentResponse.json();
  resolver = new EnvironmentResolver(environmentConfig, calendarConfig, {microseasonCatalog:new MicroseasonCatalog(await microseasonResponse.json())});
  const manifest = await manifestResponse.json();
  pond = new PondRenderer(manifest, { assetRoot: '../scenes/living-pool/' }).mount($('pondPreview'));
  splashTimeline = new SplashTimeline(environmentConfig.splashBehavior,
    minute => splashRateMultiplier(minute, environmentConfig.splashBehavior), manifest.sceneId);
  pond.onRipple = point => manualRipples.push({ ...point, id: `manual:${real.nowMs()}:${manualRipples.length}`, source: 'manual', atMs: real.nowMs() });
  function visualFrame() {
    if (!document.hidden && pond && calendar) {
      const worldMs = world.nowMs();
      const state = stateFrom(worldMs);
      const sample = splashTimeline.sample(worldMs, state.worldLocalDate, { allowLiveEvents: false });
      const realMs = real.nowMs();
      for (let i = manualRipples.length - 1; i >= 0; i--) {
        if (realMs - manualRipples[i].atMs > 2200) manualRipples.splice(i, 1);
      }
      pond.renderFrame(worldMs, [...sample.ripples, ...manualRipples], realMs);
    }
    previewAnimation = requestAnimationFrame(visualFrame);
  }
  previewAnimation = requestAnimationFrame(visualFrame);
  scenarios = (await scenariosResponse.json()).scenarios;
  scenarios.forEach((scenario, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = scenario.label;
    $('scenario').append(option);
  });
  $('dateTime').value = asDateTime(real.nowMs());
  $('expected').textContent = selectedScenario()?.expected ?? '';
  render();
  setInterval(render, 250);
  window.__supeesuLab = { real, world, realSession, previewSession, calendar, resolver, pond, splashTimeline, audioOwner };
}
initialize().catch(error => {
  $('calendarState').textContent = `Initialization error: ${error.message}`;
  console.error(error);
});
