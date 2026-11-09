import { fishPose } from '../behavior/pondBehavior.js';
import { SkyRenderer } from './skyRenderer.js';
import { CalendarMarkers } from './calendarMarkers.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

export function validateSceneManifest(scene) {
  if (scene?.schemaVersion !== 1 || !scene.sceneId || !scene.stage || !scene.waterPath ||
      !Array.isArray(scene.layers) || !Array.isArray(scene.fish)) throw new Error('Invalid living scene manifest.');
  const seen = new Set();
  for (const item of [...scene.layers, ...scene.fish]) {
    if (!item.id || seen.has(item.id)) throw new Error('Duplicate or missing visual element ID.');
    seen.add(item.id);
  }
  for (const layer of scene.layers) {
    if (!Number.isFinite(layer.z) || (layer.asset && (!layer.bounds || layer.bounds.length !== 4))) {
      throw new Error(`Invalid layer ${layer.id}.`);
    }
  }
  for (const fish of scene.fish) {
    if (!fish.asset || !fish.center || !fish.orbit || !fish.size || fish.periodSeconds <= 0) {
      throw new Error(`Invalid fish ${fish.id}.`);
    }
  }
  return true;
}

export class PondRenderer {
  constructor(scene, { assetRoot = '../scenes/living-pool/' } = {}) {
    validateSceneManifest(scene);
    this.scene = scene;
    this.assetRoot = assetRoot;
    this.fishNodes = new Map();
    this.swayNodes = [];
    this.currentEnvironment = null;
    this.active = false;
    this.raf = null;
    this.lastWorldMs = 0;
    this.rippleNodes = new Map();
    this.onRipple = () => {};
  }

  mount(container) {
    if (this.root) throw new Error('Scene already mounted.');
    this.root = svg('svg', {
      viewBox: `0 0 ${this.scene.stage.width} ${this.scene.stage.height}`,
      preserveAspectRatio: this.scene.stage.fit,
      class: 'pond-stage', role: 'img',
      'aria-label': 'Layered Living Pool with fish, water, plants, and time-dependent light'
    });
    const defs = svg('defs');
    const clip = svg('clipPath', { id: `pond-water-${this.scene.sceneId}` });
    this.waterHitPath = svg('path', { d: this.scene.waterPath });
    clip.append(this.waterHitPath);
    defs.append(clip);
    this.root.append(defs);
    const layers = [...this.scene.layers].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
    for (const layer of layers) {
      const group = svg('g', { 'data-layer': layer.id });
      if (layer.clip === 'water' || ['fish', 'ripples', 'glints'].includes(layer.kind)) {
        group.setAttribute('clip-path', `url(#pond-water-${this.scene.sceneId})`);
      }
      if (layer.kind === 'sky') {
        this.sky = new SkyRenderer(group, {
          width: this.scene.stage.width,
          height: this.scene.stage.height,
          sceneId: this.scene.sceneId
        });
      }
      if (layer.asset) {
        const [x, y, width, height] = layer.bounds;
        const visual = svg('image', { x, y, width, height, href: this.assetRoot + layer.asset });
        visual.setAttribute('preserveAspectRatio', 'none');
        group.append(visual);
        if (layer.sway) this.swayNodes.push({ group, x: x + width / 2, y: y + height });
        if (layer.id === 'ground') {
          this.ground = group;
          this.groundPalette = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, opacity: .17 });
          group.append(this.groundPalette);
          this.groundNight = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, fill: '#4c2333', opacity: 0, 'pointer-events': 'none' });
          group.append(this.groundNight);
        }
        if (layer.id === 'water') {
          this.water = group;
          this.waterPalette = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, opacity: .26 });
          group.append(this.waterPalette);
          this.waterNight = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, fill: '#68393a', opacity: 0, 'pointer-events': 'none' });
          group.append(this.waterNight);
        }
        if (layer.id === 'foreground') this.foreground = group;
      }
      if (layer.kind === 'fish') {
        for (const fish of this.scene.fish) {
          const fishGroup = svg('g', { 'data-fish': fish.id });
          const fishImage = svg('image', {
            href: this.assetRoot + fish.asset,
            x: -fish.size[0] / 2, y: -fish.size[1] / 2,
            width: fish.size[0], height: fish.size[1]
          });
          fishGroup.append(fishImage);
          group.append(fishGroup);
          this.fishNodes.set(fish.id, fishGroup);
        }
      }
      if (layer.kind === 'ripples') this.ripples = group;
      if (layer.kind === 'glints') {
        this.glints = group;
        const glint = svg('path', {
          d: 'M 300 480 Q 550 445 856 482 M 370 596 Q 660 556 980 591 M 510 523 Q 726 491 932 528',
          stroke: '#fff3cf', 'stroke-width': 3, 'stroke-linecap': 'round',
          fill: 'none', opacity: '.35'
        });
        group.append(glint);
      }
      this.root.append(group);
    }
    this.tintOverlay = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, 'pointer-events': 'none' });
    this.tintOverlay.setAttribute('class', 'pond-lighting-overlay');
    this.root.append(this.tintOverlay);
    this.mistOverlay = svg('rect', { x: 0, y: 0, width: this.scene.stage.width, height: this.scene.stage.height, fill: '#f4ebd4', opacity: 0, 'pointer-events': 'none' });
    this.root.append(this.mistOverlay);
    this.calendarMarkers = new CalendarMarkers(this.root);
    this.root.addEventListener('click', event => {
      if (!this.currentEnvironment) return;
      const point = this.root.createSVGPoint();
      point.x = event.clientX; point.y = event.clientY;
      const matrix = this.root.getScreenCTM();
      if (!matrix) return;
      const local = point.matrixTransform(matrix.inverse());
      const inside = typeof this.waterHitPath.isPointInFill === 'function'
        ? this.waterHitPath.isPointInFill(local) : true;
      if (inside) this.onRipple({ x: local.x, y: local.y, id: 'manual', atMs: this.lastWorldMs });
    });
    container.append(this.root);
    return this;
  }

  applyEnvironment(environment) {
    this.currentEnvironment = environment;
    this.sky?.apply(environment);
    this.calendarMarkers?.apply(environment);
    this.root.style.setProperty('--ground-color', environment.palettes.ground);
    this.ground.setAttribute('opacity', String(0.83 + environment.illumination * 0.17));
    this.groundPalette.setAttribute('fill', environment.palettes.ground);
    this.waterPalette.setAttribute('fill', environment.palettes.water);
    this.groundPalette.setAttribute('opacity', String(.24 + environment.eventTreatments.reduce((sum, e) => sum + e.strength, 0) * .36));
    this.waterPalette.setAttribute('opacity', String(.24 + environment.eventTreatments.reduce((sum, e) => sum + e.strength, 0) * .34));
    this.water.style.filter = 'none';
    // Separate material illumination avoids tinting sky, stars, and interface as a single sheet.
    const darkness = Math.max(0, Math.min(1, (0.53 - environment.illumination) / 0.53));
    const sunset = Math.max(0, Math.min(1, (environment.warmth - 0.52) / 0.48));
    this.tintOverlay.setAttribute('opacity', '0');
    this.groundNight.setAttribute('fill', sunset > 0.35 ? '#80413b' : '#502b3b');
    this.groundNight.setAttribute('opacity', String(Math.min(0.48, darkness * 0.39 + sunset * 0.09)));
    this.waterNight.setAttribute('fill', sunset > 0.35 ? '#8f5442' : '#4f324b');
    this.waterNight.setAttribute('opacity', String(Math.min(0.50, darkness * 0.42 + sunset * 0.08)));
    this.glints.setAttribute('opacity', String(environment.waterHighlights * 0.77));
    this.mistOverlay.setAttribute('opacity', String(environment.mist * .15));
    // SVG color filters expose palette changes even when the artwork is replaced.
    this.ground.style.filter = 'none';
    this.ground.style.opacity = String(0.72 + environment.illumination * .28);
    this.water.style.opacity = String(0.70 + environment.illumination * .30);
    this.tintOverlay.setAttribute('data-calendar-season', environment.ecologicalSeason);
    if (this.comfort) this.applyComfort(this.comfort);
  }

  applyComfort(comfort) {
    this.comfort = comfort;
    if (!this.currentEnvironment) return;
    // Material-specific color translation. Relative illumination is a design
    // signal, not a claim about actual display brightness or eye health.
    const reduction = Math.max(0, 1 - comfort.brightness);
    this.groundNight.setAttribute('fill', comfort.deep ? '#6a1c28' : '#6a3043');
    this.waterNight.setAttribute('fill', comfort.deep ? '#581924' : '#693447');
    this.groundNight.setAttribute('opacity', String(Math.min(.88, reduction * .79)));
    this.waterNight.setAttribute('opacity', String(Math.min(.87, reduction * .76)));
    this.glints?.setAttribute('opacity', String(Math.max(.09, this.currentEnvironment.waterHighlights * (1 - reduction*.55))));
    this.root.style.setProperty('--comfort-level', String(comfort.brightness));
    this.root.style.setProperty('--comfort-warmth', String(comfort.warmth));
    this.sky?.applyComfort?.(comfort);
  }

  renderFrame(worldMs, rippleEvents = [], realMs = Date.now()) {
    if (!this.root || !this.currentEnvironment) return;
    this.lastWorldMs = worldMs;
    this.sky?.render(realMs);
    const activity = this.currentEnvironment.fishActivity;
    for (const fish of this.scene.fish) {
      const pose = fishPose(fish, realMs, activity);
      this.fishNodes.get(fish.id).setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.headingDegrees + pose.wiggleDegrees})`);
      this.fishNodes.get(fish.id).setAttribute('opacity', String(0.60 + activity * .35));
    }
    for (const item of this.swayNodes) {
      const rotation = Math.sin(realMs / 2400 + item.x / 200) * 1.2;
      item.group.setAttribute('transform', `rotate(${rotation} ${item.x} ${item.y})`);
    }
    const relevant = new Set();
    for (const event of rippleEvents) {
      if (!event || !Number.isFinite(event.x)) continue;
      relevant.add(event.id);
      let ripple = this.rippleNodes.get(event.id);
      if (!ripple) {
        ripple = svg('ellipse', { cx: event.x, cy: event.y, rx: 3, ry: 1.6, fill: 'none', stroke: '#e7efde', 'stroke-width': 3 });
        this.ripples.append(ripple);
        this.rippleNodes.set(event.id, ripple);
      }
      const age = Math.max(0, (event.source === 'manual' ? realMs : worldMs) - event.atMs);
      const progress = Math.min(age / 2200, 1);
      ripple.setAttribute('rx', String(3 + progress * 81));
      ripple.setAttribute('ry', String(1.5 + progress * 26));
      ripple.setAttribute('opacity', String((1 - progress) * .78));
    }
    for (const [id, node] of this.rippleNodes) {
      if (!relevant.has(id)) { node.remove(); this.rippleNodes.delete(id); }
    }
  }

  suspendVisuals() { this.active = false; }
  resumeVisuals() { this.active = true; }
  dispose() {
    this.active = false;
    this.root?.remove();
    this.root = null;
    this.fishNodes.clear();
    this.rippleNodes.clear();
  }
}
