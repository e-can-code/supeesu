import { TAU, DIAL_RINGS, wrappedAngleDelta, angleAtPointer, seekByRotation, ringProgress } from '../time/dialMath.js';
import { DEFAULT_FLOW_RATE, validatedFlowRate, flowDescription } from '../time/flowRates.js';

const NS = 'http://www.w3.org/2000/svg';
function element(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)));
  return el;
}
function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// The dial is a view/controller of the injected World Clock; it never owns time.
export class WorldOrrery {
  constructor({ host, worldClock, calendar, onSeek = () => {} }) {
    this.host = host;
    this.world = worldClock;
    this.calendar = calendar;
    this.onSeek = onSeek;
    this.drag = null;
    this.rings = new Map();
    this.boundMove = event => this.onMove(event);
    this.boundEnd = event => this.endDrag(event);
    this.boundWindowBlur = () => this.cancelDrag();
    this.svg = element('svg', { viewBox: '0 0 280 280', role: 'group', 'aria-label': 'World-time orrery: turn rings to scrub time' });
    this.svg.append(element('circle', { cx: 140, cy: 140, r: 132, fill: '#182b31', 'fill-opacity': '.7', stroke: '#ab956b', 'stroke-opacity': '.5', 'stroke-width': 1.5 }));
    for (const [ring, radius, color] of [['ecology',110,'#c6a578'],['microseason',80,'#9fb8a3'],['day',51,'#e5cca0']]) {
      const group = element('g', { 'data-ring': ring });
      group.append(element('circle', { cx: 140, cy: 140, r: radius, fill: 'none', stroke: color, 'stroke-opacity': '.22', 'stroke-width': 17 }));
      const ticks = ring === 'ecology' ? 8 : ring === 'microseason' ? 7 : 12;
      for (let i = 0; i < ticks; i++) {
        const theta = i / ticks * TAU - Math.PI / 2;
        group.append(element('line', {
          x1: 140 + (radius - 7) * Math.cos(theta), y1: 140 + (radius - 7) * Math.sin(theta),
          x2: 140 + (radius + 7) * Math.cos(theta), y2: 140 + (radius + 7) * Math.sin(theta),
          stroke: color, 'stroke-width': i === 0 ? 2.7 : 1.6, 'stroke-opacity': .62
        }));
      }
      const indicator = element('g');
      indicator.append(element('circle', { cx: 140, cy: 140 - radius, r: 7.6, fill: color, stroke: '#322c29', 'stroke-width': 2 }));
      group.append(indicator);
      const hit = element('circle', { cx: 140, cy: 140, r: radius, fill: 'none', stroke: '#fff', 'stroke-opacity': '0', 'stroke-width': 29,
        'pointer-events': 'stroke', tabindex: 0, role: 'slider', 'aria-label': DIAL_RINGS[ring].label,
        'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 });
      hit.classList.add('orrery-ring-hit');
      group.append(hit);
      this.rings.set(ring, { radius, indicator, hit });
      hit.addEventListener('pointerdown', e => this.beginDrag(e, ring));
      hit.addEventListener('keydown', e => {
        if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) return;
        e.preventDefault();
        const direction = ['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : -1;
        this.seek(this.world.nowMs() + DIAL_RINGS[ring].keyboardStepMs * direction, ring);
      });
      hit.addEventListener('wheel', e => {
        e.preventDefault();
        const step = DIAL_RINGS[ring].keyboardStepMs;
        this.seek(this.world.nowMs() + (e.deltaY >= 0 ? 1 : -1) * step, ring);
      }, { passive: false });
      this.svg.append(group);
    }
    this.svg.append(element('circle', { cx:140, cy:140, r:27, fill:'#1b3037', stroke:'#bca780', 'stroke-width':1.2 }));
    const label = element('text', { x:140, y:136, fill:'#f1dfb8', 'text-anchor':'middle', 'font-size':12, 'font-family':'Georgia,serif' });
    const subtitle = element('text', { x:140, y:152, fill:'#b9c6b0', 'text-anchor':'middle', 'font-size':7.8, 'font-family':'sans-serif', 'letter-spacing':'1' });
    this.timeText = label;
    this.modeText = subtitle;
    this.svg.append(label, subtitle);
    host.append(this.svg);
    this.modeLabel = document.getElementById('orreryMode');
    this.dateLabel = document.getElementById('orreryDate');
    document.getElementById('orreryLive').addEventListener('click', () => {
      this.world.useRealTime(); this.onSeek('live'); this.update();
    });
    this.speedControl = document.getElementById('orrerySpeed');
    this.speedHelp = document.getElementById('flowHelp');
    this.speedControl?.addEventListener('change', () => {
      const rate = validatedFlowRate(this.speedControl.value);
      if (this.world.mode === 'simulated' && this.world.rate > 0) this.world.setRate(rate);
      this.onSeek('speed'); this.update();
    });
    document.getElementById('orreryFlow').addEventListener('click', () => {
      this.world.setRate(validatedFlowRate(this.speedControl?.value ?? DEFAULT_FLOW_RATE));
      this.onSeek('flow'); this.update();
    });
    this.update();
  }

  angleFromEvent(e) {
    const rect = this.svg.getBoundingClientRect();
    // SVG viewBox remains square; meet scaling keeps the dial centered.
    const side = Math.min(rect.width, rect.height);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return angleAtPointer((e.clientX-cx) / side, (e.clientY-cy) / side, 0, 0);
  }

  beginDrag(e, ring) {
    if (e.button !== 0) return;
    if (this.drag) this.cancelDrag();
    e.preventDefault();
    const hit = this.rings.get(ring).hit;
    this.drag = { ring, initialMs: this.world.nowMs(), angle: this.angleFromEvent(e), total: 0, pointerId: e.pointerId, hit };
    try { hit.setPointerCapture(e.pointerId); } catch { /* Window listeners are the fallback. */ }
    window.addEventListener('pointermove', this.boundMove, true);
    window.addEventListener('pointerup', this.boundEnd, true);
    window.addEventListener('pointercancel', this.boundEnd, true);
    window.addEventListener('blur', this.boundWindowBlur);
    this.host.dataset.dragging = 'true';
  }

  onMove(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    e.preventDefault();
    const next = this.angleFromEvent(e);
    this.drag.total += wrappedAngleDelta(next, this.drag.angle);
    this.drag.angle = next;
    this.seek(seekByRotation(this.drag.initialMs, this.drag.ring, this.drag.total), this.drag.ring);
  }

  endDrag(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.cancelDrag();
  }

  cancelDrag() {
    if (!this.drag) return;
    const { hit, pointerId } = this.drag;
    window.removeEventListener('pointermove', this.boundMove, true);
    window.removeEventListener('pointerup', this.boundEnd, true);
    window.removeEventListener('pointercancel', this.boundEnd, true);
    window.removeEventListener('blur', this.boundWindowBlur);
    this.drag = null;
    delete this.host.dataset.dragging;
    try { if (hit.hasPointerCapture(pointerId)) hit.releasePointerCapture(pointerId); } catch { /* Capture was already released. */ }
  }

  seek(targetMs, ring) {
    this.world.seek(targetMs);
    this.world.pause();
    this.onSeek(ring);
    this.update();
  }

  update() {
    const ms = this.world.nowMs();
    const calendar = this.calendar.describe(ms);
    for (const [ring, { indicator, hit }] of this.rings) {
      const progress = ringProgress(ms, ring, calendar.dayOffsetFromEpoch);
      indicator.setAttribute('transform', `rotate(${progress * 360} 140 140)`);
      hit.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      hit.setAttribute('aria-valuetext', ring === 'ecology' ? `Ecological day ${calendar.ecology.day} of 800`
        : ring === 'microseason' ? `Seven-day rhythm day ${calendar.rhythms.microseasonDay}`
        : `Local time ${formatTime(ms)}`);
    }
    const date = new Date(ms);
    this.timeText.textContent = formatTime(ms);
    this.modeText.textContent = this.world.mode === 'real' ? 'LIVE' : this.world.rate === 0 ? 'HELD' : `FLOW ${this.world.rate.toLocaleString()}×`;
    if (this.speedHelp) this.speedHelp.textContent = flowDescription(Number(this.speedControl?.value ?? DEFAULT_FLOW_RATE));
    if (this.modeLabel) this.modeLabel.textContent = `DAY ${calendar.ecology.day} / 800 · ${calendar.ecology.seasonId.replaceAll('-', ' ')}`;
    if (this.dateLabel) this.dateLabel.textContent = date.toLocaleDateString(undefined, { weekday:'short',month:'short',day:'numeric',year:'numeric' });
  }
}
