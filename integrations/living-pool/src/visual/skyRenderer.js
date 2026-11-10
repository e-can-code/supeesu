const NS = 'http://www.w3.org/2000/svg';
const node = (tag, attributes = {}) => {
  const element = document.createElementNS(NS, tag);
  Object.entries(attributes).forEach(([key, val]) => element.setAttribute(key, String(val)));
  return element;
};

export class SkyRenderer {
  constructor(group, { width, height, sceneId }) {
    this.group = group;
    const defs = node('defs');
    const gradientId = `${sceneId}-sky-gradient`;
    const gradient = node('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
    this.topStop = node('stop', { offset: '0%', 'stop-color': '#25384f' });
    this.horizonStop = node('stop', { offset: '100%', 'stop-color': '#c6b08a' });
    gradient.append(this.topStop, this.horizonStop);
    defs.append(gradient);
    group.append(defs);
    group.append(node('rect', { x: 0, y: 0, width, height: 405, fill: `url(#${gradientId})` }));
    this.path = node('path', {
      d: 'M110 324 Q600 -214 1090 324', fill: 'none', stroke: '#fff0c8',
      'stroke-width': 2, 'stroke-dasharray': '3 12', 'stroke-opacity': '.23'
    });
    group.append(this.path);
    this.starGroup = node('g', { opacity: 0, fill: '#f8edd1' });
    for (let i = 0; i < 64; i++) {
      const x = (i * 193 + 53) % width;
      const y = (i * 71 + (i % 5) * 19 + 11) % 275;
      this.starGroup.append(node('circle', { cx: x, cy: y, r: i % 9 === 0 ? 1.8 : 0.7 + (i % 3) * .25, opacity: .36 + (i % 4) * .17 }));
    }
    group.append(this.starGroup);
    this.sunHalo = node('circle', { r: 65, fill: '#f1d397', opacity: '.13' });
    this.sun = node('circle', { r: 32, fill: '#ffe3ab' });
    this.moon = node('g');
    this.moon.append(node('circle', { r: 21, fill: '#f1dfbb' }));
    this.moon.append(node('circle', { cx: 8, cy: -5, r: 20, fill: '#4b2b37', opacity: '.86' }));
    group.append(this.sunHalo, this.sun, this.moon);
    this.clouds = node('g', { fill: '#f2e6d5', opacity: '.35' });
    this.clouds.append(node('path', { d: 'M82 141q49-34 100 0t123 0q55-16 91 8-130 25-314 4Z' }));
    this.clouds.append(node('path', { d: 'M714 107q43-24 87 0t91 1q43-17 80 9-125 23-258 5Z' }));
    group.append(this.clouds);
  }

  apply(environment) {
    const sky = environment.sky;
    if (!sky) return;
    this.baseTop = sky.top;
    this.topStop.setAttribute('stop-color', sky.top);
    this.baseHorizon = sky.horizon;
    this.horizonStop.setAttribute('stop-color', sky.horizon);
    this.sun.setAttribute('transform', `translate(${sky.sun.x} ${sky.sun.y})`);
    this.sunHalo.setAttribute('transform', `translate(${sky.sun.x} ${sky.sun.y})`);
    this.sun.setAttribute('opacity', sky.sun.visible ? '.95' : '0');
    this.sunHalo.setAttribute('opacity', sky.sun.visible ? '.20' : '0');
    this.moon.setAttribute('transform', `translate(${sky.moon.x} ${sky.moon.y})`);
    this.moon.setAttribute('opacity', sky.moon.visible ? '.85' : '0');
    this.starGroup.setAttribute('opacity', String(sky.stars));
    this.clouds.setAttribute('opacity', String(.17 + environment.mist * .4));
    this.group.setAttribute('data-sky-phase', sky.phase);
    if (this.comfort) this.applyComfort(this.comfort);
  }

  applyComfort(comfort) {
    this.comfort = comfort;
    // Ecological sky stays intact for simulation; real-time comfort changes
    // its presentation only. The morning release is never before 05:30.
    if (!this.baseTop) this.baseTop = this.topStop.getAttribute('stop-color');
    if (!this.baseHorizon) this.baseHorizon = this.horizonStop.getAttribute('stop-color');
    const level = comfort.brightness;
    const red = comfort.deep ? '#32141f' : '#5d3046';
    const horizon = comfort.deep ? '#54212b' : '#79536a';
    const mix = (a,b,t) => {
      const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
      const x=rgb(a),y=rgb(b);
      return '#'+x.map((v,i)=>Math.round(v*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('');
    };
    const factor = Math.max(0,Math.min(.94,(1-level)*.91));
    this.topStop.setAttribute('stop-color',mix(this.baseTop,red,factor));
    this.horizonStop.setAttribute('stop-color',mix(this.baseHorizon,horizon,factor));
    this.sunHalo.setAttribute('opacity', String(Math.max(0,.20*(1-factor))));
  }

  render(worldMs) {
    // A very slow movement is sufficient for the temporary diagnostic cloud shapes.
    this.clouds.setAttribute('transform', `translate(${Math.sin(worldMs / 1_800_000) * 14} 0)`);
  }
}
