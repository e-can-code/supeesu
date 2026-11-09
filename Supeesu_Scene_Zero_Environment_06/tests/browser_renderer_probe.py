"""Offline Chromium probe of real renderer modules; avoids blocked localhost navigation."""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / 'scenes/living-pool'


def module_url(path):
    source = path.read_text(encoding='utf-8')
    pattern = re.compile(r"(from\s+)(['\"])([^'\"]+)(['\"])\s*;?")
    def replace(match):
        relative = match.group(3)
        dependency = (path.parent / relative).resolve()
        if not dependency.is_relative_to(ROOT):
            raise ValueError('Module outside project')
        return match.group(1) + "'" + module_url(dependency) + "'"
    source = pattern.sub(replace, source)
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode('utf-8')).decode('ascii')


manifest = json.loads((SCENE / 'scene.json').read_text())
for obj in [*manifest['layers'], *manifest['fish']]:
    if 'asset' in obj:
        source = (SCENE / obj['asset']).read_bytes()
        obj['asset'] = 'data:image/svg+xml;base64,' + base64.b64encode(source).decode('ascii')
profile = json.loads((SCENE / 'environment.json').read_text())
calendar = json.loads((ROOT / 'calendar/calendar.json').read_text())
modules = {
    'renderer': module_url(ROOT / 'src/visual/pondRenderer.js'),
    'calendar': module_url(ROOT / 'src/calendar/calendarEngine.js'),
    'environment': module_url(ROOT / 'src/environment/environmentResolver.js')
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True, executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    )
    page = browser.new_page(viewport={'width': 1200, 'height': 720}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content('<!doctype html><style>*{margin:0;padding:0}body,#pond{width:1200px;height:720px;background:#234b46}svg{display:block;width:100%;height:100%}</style><main id="pond"></main>')
    result = page.evaluate('''async ({modules, manifest, profile, calendar}) => {
      const [{PondRenderer}, {CalendarEngine}, {EnvironmentResolver}] = await Promise.all([
        import(modules.renderer), import(modules.calendar), import(modules.environment)
      ]);
      const engine = new CalendarEngine(calendar);
      const resolver = new EnvironmentResolver(profile, calendar);
      const stage = new PondRenderer(manifest, {assetRoot:''}).mount(document.getElementById('pond'));
      const instant = new Date('2027-02-07T15:30:00').getTime();
      stage.applyEnvironment(resolver.resolve(instant, engine.describe(instant)));
      stage.renderFrame(instant);
      let clicked = 0;
      stage.onRipple = point => { clicked++; stage.renderFrame(instant, [{...point,id:'probe',source:'manual',atMs:Date.now()}],Date.now()); };
      window.__pondProbe = stage;
      window.__pondFixture = { stage, engine, resolver };
      return {fish: document.querySelectorAll('[data-fish]').length, layers: document.querySelectorAll('[data-layer]').length, images: document.querySelectorAll('svg image').length};
    }''', {'modules':modules,'manifest':manifest,'profile':profile,'calendar':calendar})
    page.wait_for_timeout(800)
    image_state=page.evaluate('''() => [...document.querySelectorAll('svg image')].map(i=>({complete:i.complete, href:i.href.baseVal.slice(0,35)}))''')
    assert all(img['href'].startswith('data:image/svg+xml;base64,') for img in image_state), image_state
    assert result == {'fish': 3, 'layers': 13, 'images': 12}, result
    page.mouse.click(600,400)
    count=page.locator('ellipse').count()
    assert count >= 1, f'Water click did not produce ripple, found {count} ellipses'
    screenshot=ROOT/'docs/living-pool-browser-render-probe.png'
    page.screenshot(path=str(screenshot))
    daytime=page.screenshot()
    page.evaluate('''() => {
      const {stage, engine, resolver} = window.__pondFixture;
      const instant = new Date('2027-02-07T23:10:00').getTime();
      stage.applyEnvironment(resolver.resolve(instant, engine.describe(instant)));
      stage.renderFrame(instant);
    }''')
    nighttime=page.screenshot()
    (ROOT/'docs/living-pool-night-probe.png').write_bytes(nighttime)
    from PIL import Image, ImageChops, ImageStat
    from io import BytesIO
    difference = ImageChops.difference(Image.open(BytesIO(daytime)), Image.open(BytesIO(nighttime)))
    mean_delta=sum(ImageStat.Stat(difference).mean[:3])/3
    assert mean_delta > 4, f'Day/night pixels did not visibly change: mean delta {mean_delta:.2f}'
    print(f'PASS: actual time-of-day environment changes rendered pixels (mean RGB difference {mean_delta:.2f})')
    assert not errors, errors
    print('PASS: actual PondRenderer modules imported and mounted offline')
    print(f'PASS: {result["layers"]} layers, {result["fish"]} fish, {result["images"]} SVG image elements')
    print('PASS: water click and ripple SVG geometry in headless Chromium')
    print('PASS: all SVG image elements use packaged asset data references')
    print('PASS: no JavaScript page errors')
    print('Screenshot:', screenshot)
    browser.close()
