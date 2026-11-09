const $ = id => document.getElementById(id);
const timeString = ms => new Date(ms).toLocaleString();

// This guide is a temporary UI over the permanent production calendar and
// environment resolver. Scenario travel changes only the World Clock.
export class CalendarFieldGuide {
  constructor({ world, calendar, onSeek }) {
    this.world = world;
    this.calendar = calendar;
    this.onSeek = onSeek;
    this.scenarios = [];
    this.activeScenario = null;
    $('scenarioToggle').addEventListener('click', () => { $('scenarioPanel').hidden = !$('scenarioPanel').hidden; });
    $('closeScenarios').addEventListener('click', () => { $('scenarioPanel').hidden = true; });
    $('scenarioSelect').addEventListener('change', () => this.describeSelected());
    $('scenarioGo').addEventListener('click', () => this.visitSelected());
  }

  async load(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Calendar scenario guide could not load (${response.status}).`);
    const config = await response.json();
    if (!Array.isArray(config.scenarios) || config.scenarios.some(s => !s.id || !s.worldLocalDateTime)) {
      throw new Error('Invalid calendar scenario guide.');
    }
    this.scenarios = config.scenarios;
    for (const item of this.scenarios) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.group} · ${item.label}`;
      $('scenarioSelect').append(option);
    }
    this.describeSelected();
  }

  selected() {
    return this.scenarios.find(s => s.id === $('scenarioSelect').value);
  }

  describeSelected() {
    const item = this.selected();
    if (!item) return;
    $('scenarioDescription').textContent = `${item.worldLocalDateTime.replace('T',' ')} · ${item.description}`;
  }

  visitSelected() {
    const item = this.selected();
    if (!item) return;
    const instant = new Date(item.worldLocalDateTime).getTime();
    if (!Number.isFinite(instant)) return;
    this.world.seek(instant);
    this.world.pause();
    this.activeScenario = item.id;
    this.onSeek('scenario');
  }

  update(calendar, environment) {
    if ($('scenarioPanel').hidden) return;
    const d = environment.diagnostics;
    const moon = percent => `${Math.round(percent * 100)}%`;
    const lines = [
      `WORLD ${timeString(environment.instantMs)}`,
      `ECOLOGY ${calendar.ecology.seasonId} · ${calendar.ecology.day}/800 · cycle ${calendar.ecology.cycleIndex}`,
      `RHYTHMS 7d ${calendar.rhythms.microseasonDay}/7 · 200d ${calendar.rhythms.day200}/200 · 400d ${calendar.rhythms.day400}/400`,
      `MICROSEASON ${d.microseason.authored?.title ?? d.microseason.authoredId ?? 'phase active; no approved profile'}`,
      ...(d.microseason.authored ? [`SOURCE ${d.microseason.authored.signature}`] : []),
      `MOONS Earth ${moon(d.earthMoon.illumination)} est. · Jade ${moon(d.jadeMoon.illumination)} diagnostic`,
      `WEATHER ${d.weather.raining ? 'RAIN' : d.weather.rainbow ? 'RAINBOW' : d.weather.afterRain ? 'POST-RAIN' : 'clear'} · synthetic`,
      `TREE growth ${moon(d.tree.dailyGrowth)} · ${d.tree.februaryBloom ? 'February bloom' : 'no February bloom'}`,
      `SESSION ${d.sessionDay} (simulated; no ledger writes)`,
      `EVENTS ${calendar.annualEvents.map(e=>e.id).join(', ') || 'none'}`,
      `FLOW ${this.world.mode === 'real' ? 'LIVE' : this.world.rate === 0 ? 'HELD' : this.world.rate + '×'}`
    ];
    const selected = this.scenarios.find(s => s.id === this.activeScenario);
    if (selected) {
      const current = environment.worldLocalDate;
      lines.push(current === selected.worldLocalDateTime.slice(0, 10)
        ? `SCENARIO ${selected.id} · correct local date` : 'SCENARIO NOT AT SELECTED DATE');
    }
    $('scenarioState').textContent = lines.join('\n');
  }
}
