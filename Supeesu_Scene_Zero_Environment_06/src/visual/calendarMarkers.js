const NS = 'http://www.w3.org/2000/svg';
function node(tag, attrs = {}) {
  const item = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  return item;
}

// Deliberately conspicuous diagnostic geometry. It consumes the same
// resolved values that final, replaceable artwork will receive.
export class CalendarMarkers {
  constructor(parent) {
    this.root = node('g', { 'data-calendar-markers': 'true', 'pointer-events': 'none' });
    parent.append(this.root);
    this.rain = node('g', { stroke: '#b4dcd9', 'stroke-width': 2, opacity: 0 });
    for (let index = 0; index < 30; index++) {
      const x = 125 + (index * 59) % 1040;
      const y = 225 + (index * 47) % 310;
      this.rain.append(node('line', { x1: x, y1: y, x2: x - 12, y2: y + 23 }));
    }
    this.rainbow = node('path', { d: 'M 260 318 Q 595 -48 943 320', fill: 'none', stroke: '#ffdc94', 'stroke-width': 12, opacity: 0 });
    this.rainbowInner = node('path', { d: 'M 275 318 Q 595 -26 928 320', fill: 'none', stroke: '#bb93c6', 'stroke-width': 5, opacity: 0 });
    this.tree = node('g', { 'data-calendar-tree': 'true', transform: 'translate(-245 0)' });
    this.tree.append(node('path', { d: 'M 1044 346 Q 1034 300 1047 260 Q 1020 281 999 269 M 1045 263 Q 1064 244 1079 251', stroke: '#564a3e', 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }));
    this.treeLeaves = node('g', { fill: '#a4be87' });
    this.blossoms = node('g', { fill: '#f0d2c9' });
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.39996;
      const r = Math.sqrt((i + 1) / 14);
      const x = 1041 + Math.cos(angle) * r * 70;
      const y = 260 + Math.sin(angle) * r * 37;
      this.treeLeaves.append(node('ellipse', { cx: x, cy: y, rx: 15, ry: 8, transform: `rotate(${i*31} ${x} ${y})` }));
      if (i % 2 === 0) this.blossoms.append(node('circle', { cx: x + 4, cy: y - 4, r: 6 }));
    }
    this.tree.append(this.treeLeaves, this.blossoms);
    this.moonSet = node('g', { 'data-lunar-diagnostics': 'true' });
    this.earthMoon = this.makeMoon(348, 82, '#e1e3cb');
    this.jadeMoon = this.makeMoon(404, 94, '#91d7b5');
    this.week = node('g', { 'data-seven-day-pulses': 'true' });
    this.weekDots = [];
    for (let i = 0; i < 7; i++) {
      const dot = node('circle', { cx: 62 + i * 15, cy: 354, r: 4.7, fill: '#f0ddb4', opacity: .18 });
      this.week.append(dot);
      this.weekDots.push(dot);
    }
    this.rhythm200 = node('rect', { x: 50, y: 368, width: 135, height: 6, fill: '#aadcd7', rx: 3, opacity: .65 });
    this.rhythm400 = node('rect', { x: 50, y: 380, width: 135, height: 6, fill: '#e6b893', rx: 3, opacity: .65 });
    this.root.append(this.rainbow, this.rainbowInner, this.rain, this.tree, this.week, this.rhythm200, this.rhythm400);
  }

  makeMoon(x, y, color) {
    const g = node('g', { 'data-moon': color });
    g.append(node('circle', { cx:x, cy:y, r:18, fill:color, opacity: .82 }));
    const shadow = node('path', { fill: '#283d46', opacity: .9 });
    g.append(shadow);
    this.moonSet.append(g);
    return { shadow, x, y };
  }

  updateMoon(item, phase) {
    // A dark overlapping disk is a schematic phase indicator, not a lunar rendering.
    const shift = Math.cos(phase * 2 * Math.PI) * 17;
    const waxing = phase < 0.5;
    const x = item.x;
    const y = item.y;
    const dx = (waxing ? -1 : 1) * Math.abs(shift);
    item.shadow.setAttribute('d', `M ${x + dx} ${y - 17} A 17 17 0 1 ${waxing ? 0 : 1} ${x + dx} ${y + 17} Q ${x + 17 * (waxing ? -1 : 1)} ${y} ${x + dx} ${y - 17} Z`);
  }

  apply(environment) {
    const d = environment.diagnostics;
    if (!d) return;
    this.rain.setAttribute('opacity', d.weather.raining ? d.weather.rainStrength.toFixed(2) : '0');
    this.rainbow.setAttribute('opacity', d.weather.rainbow ? '.43' : '0');
    this.rainbowInner.setAttribute('opacity', d.weather.rainbow ? '.34' : '0');
    this.treeLeaves.setAttribute('opacity', String(.42 + .56 * d.tree.dailyGrowth));
    this.blossoms.setAttribute('opacity', d.tree.februaryBloom ? '.9' : '0');
    this.treeLeaves.setAttribute('fill', environment.palettes.accent);
    this.tree.setAttribute('data-growth', d.tree.dailyGrowth.toFixed(2));
    this.updateMoon(this.earthMoon, d.earthMoon.phase);
    this.updateMoon(this.jadeMoon, d.jadeMoon.phase);
    this.week.setAttribute('opacity', String(.52 + .48 * (d.microseason.authored?.dailyWeight ?? 0.75)));
    this.weekDots.forEach((dot, i) => dot.setAttribute('opacity', i < d.microseason.day ? '.85' : '.14'));
    this.rhythm200.setAttribute('width', String(12 + 123 * d.rhythms.wave200));
    this.rhythm400.setAttribute('width', String(12 + 123 * d.rhythms.wave400));
    this.root.setAttribute('data-weather', d.weather.raining ? 'rain' : d.weather.rainbow ? 'rainbow' : d.weather.afterRain ? 'damp' : 'clear');
  }
}
