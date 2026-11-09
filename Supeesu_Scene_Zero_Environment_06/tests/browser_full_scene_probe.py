"""Offline integration probe: exercise the actual scene coordinator, renderer, orrery, and UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import quote
from PIL import Image, ImageChops, ImageStat
from io import BytesIO
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / 'scenes/living-pool'


def module_url(path):
    source = path.read_text(encoding='utf-8')
    if path == ROOT / 'scene/scene.js':
        source = source.replace("const sceneRoot = '../scenes/living-pool/';", "const sceneRoot = ''; ")
        source = source.replace("const labMode = new URLSearchParams(location.search).has('lab');", "const labMode = true; // isolated offline integration test")
    pattern = re.compile(r"(from\s+)(['\"])([^'\"]+)(['\"])\s*;?")
    def replace(match):
        dependency = (path.parent / match.group(3)).resolve()
        if not dependency.is_relative_to(ROOT):
            raise ValueError('Module outside project')
        return match.group(1) + "'" + module_url(dependency) + "'"
    source = pattern.sub(replace, source)
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode('utf-8')).decode('ascii')

manifest = json.loads((SCENE / 'scene.json').read_text())
for item in [*manifest['layers'], *manifest['fish']]:
    if 'asset' in item:
        raw = (SCENE / item['asset']).read_bytes()
        item['asset'] = 'data:image/svg+xml;base64,' + base64.b64encode(raw).decode('ascii')
calendar = json.loads((ROOT / 'calendar/calendar.json').read_text())
environment = json.loads((SCENE / 'environment.json').read_text())
coverage = json.loads((ROOT / 'dev/coverageScenarios.json').read_text())
microseasons = json.loads((ROOT / 'calendar/source/microseasons_first_200_days.original.json').read_text())

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',
                                 args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
    page = browser.new_page(viewport={'width':1366,'height':768},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    html=(ROOT/'scene/index.html').read_text()
    html=re.sub(r'<link rel="stylesheet" href="scene.css">',
                '<style>'+(ROOT/'scene/scene.css').read_text()+'</style>', html)
    html=re.sub(r'<script type="module" src="scene.js"></script>', '', html)
    page.set_content(html)
    page.evaluate('''({manifest,calendar,environment,coverage,microseasons}) => {
        const record = {'calendar.json':calendar,'environment.json':environment,'scene.json':manifest,'coverageScenarios.json':coverage,'microseasons_first_200_days.original.json':microseasons};
        window.fetch = async path => {
          const end = String(path).split('/').at(-1);
          return {ok:!!record[end],json:async()=>record[end]};
        };
        const state = {};
        Object.defineProperty(window,'localStorage',{configurable:true,value:{
          getItem(k){return state[k]??null;},setItem(k,v){state[k]=v;}
        }});
    }''',{'manifest':manifest,'calendar':calendar,'environment':environment,'coverage':coverage,'microseasons':microseasons})
    page.evaluate('''async moduleURL => { await import(moduleURL); }''', module_url(ROOT / 'scene/scene.js'))
    page.wait_for_function('Boolean(window.__supeesuScene)',timeout=25000)
    page.wait_for_timeout(500)
    counts=page.evaluate('''() => ({fish:document.querySelectorAll('[data-fish]').length,
      layers:document.querySelectorAll('[data-layer]').length,
      rings:document.querySelectorAll('.orrery-ring-hit').length,
      sun:document.querySelectorAll('[data-sky-phase]').length})''')
    assert counts == {'fish':3,'layers':13,'rings':3,'sun':1},counts
    page.evaluate('''() => {const {world, timeline}=window.__supeesuScene;
      world.seek(new Date('2027-01-29T12:00:00').getTime()); world.pause(); timeline.resetOnSeek(); }''')
    page.wait_for_timeout(250)
    midday=page.screenshot(path=str(ROOT/'docs/living-pool-orrery-day.png'))
    start=page.evaluate('window.__supeesuScene.world.nowMs()')
    # The day ring accepts drag movement from twelve to three o'clock.
    svg=page.locator('#orreryStage svg')
    box=svg.bounding_box()
    cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
    radius=box['width']*51/280
    page.mouse.move(cx,cy-radius)
    page.mouse.down()
    page.mouse.move(cx+radius,cy,steps=12)
    page.mouse.up()
    page.wait_for_timeout(280)
    after=page.evaluate('window.__supeesuScene.world.nowMs()')
    delta=(after-start)/3600000
    assert 4.5 < delta < 7.5, f'Orrey day-ring drag expected +6h, received {delta:.3f}h'
    assert page.locator('#orreryStage').get_attribute('data-dragging') is None
    # Lost capture and release outside the dial must never strand FLOW controls.
    page.mouse.move(cx,cy-radius)
    page.mouse.down()
    page.mouse.move(20,20,steps=8)
    page.mouse.up()
    page.wait_for_timeout(70)
    assert page.locator('#orreryStage').get_attribute('data-dragging') is None
    assert page.locator('#orreryFlow').is_visible()
    assert page.locator('#orrerySpeed').is_visible()
    # Lunar phase diagrams belong in the laboratory, not the actual sky.
    assert page.locator('[data-lunar-diagnostics]').count()==0
    # Keyboard access exercises two more ring scales without moving real time.
    micro=page.locator('[data-ring="microseason"] .orrery-ring-hit')
    micro.focus()
    prior=page.evaluate('window.__supeesuScene.world.nowMs()')
    page.keyboard.press('ArrowRight')
    afterMicro=page.evaluate('window.__supeesuScene.world.nowMs()')
    assert abs((afterMicro-prior)/86400000-1)<.01
    outer=page.locator('[data-ring="ecology"] .orrery-ring-hit')
    outer.focus()
    page.keyboard.press('ArrowRight')
    afterEcology=page.evaluate('window.__supeesuScene.world.nowMs()')
    assert abs((afterEcology-afterMicro)/86400000-10)<.01
    night=page.screenshot(path=str(ROOT/'docs/living-pool-orrery-dusk.png'))
    diff=ImageChops.difference(Image.open(BytesIO(midday)),Image.open(BytesIO(night)))
    delta_pixels=sum(ImageStat.Stat(diff).mean[:3])/3
    assert delta_pixels > 4, f'Dial seek did not repaint scene: {delta_pixels}'
    old=after
    page.locator('#orreryLive').click()
    page.wait_for_timeout(200)
    assert page.evaluate('window.__supeesuScene.world.mode')=='real'
    page.locator('#orreryFlow').click()
    assert page.evaluate('window.__supeesuScene.world.getState().rate')==3600
    flowStart=page.evaluate('window.__supeesuScene.world.nowMs()')
    page.wait_for_timeout(520)
    flowEnd=page.evaluate('window.__supeesuScene.world.nowMs()')
    assert 1_400_000 < flowEnd-flowStart < 3_100_000, f'FLOW should advance about 30 world minutes in 0.5 real seconds: {flowEnd-flowStart}'
    page.locator('#orrerySpeed').select_option('60')
    assert page.evaluate('window.__supeesuScene.world.getState().rate')==60
    page.locator('#orrerySpeed').select_option('3600')
    page.locator('#scenarioToggle').click()
    assert page.locator('#scenarioSelect option').count() >= 30
    page.locator('#scenarioSelect').select_option('synthetic-rain')
    page.locator('#scenarioGo').click()
    page.wait_for_timeout(250)
    assert page.evaluate("window.__supeesuScene.world.mode")=='simulated'
    assert page.evaluate("window.__supeesuScene.world.rate")==0
    assert page.locator('[data-calendar-markers]').count()==1
    assert page.locator('[data-calendar-markers]').get_attribute('data-weather')=='rain'
    page.locator('#closeScenarios').click()
    page.locator('#diagnosticToggle').click()
    assert page.locator('body').get_attribute('class')=='hide-diagnostics'
    assert not errors,errors
    print('PASS: full coordinator initialized with manifest and all media layers')
    print('PASS: 3 orrery rings mounted and day ring pointer drag moved world time by',round(delta,2),'hours')
    print('PASS: scrubbing caused visual change, pixel mean difference',round(delta_pixels,2))
    print('PASS: 7-day and 800-day rings respond to keyboard, accelerated FLOW traverses 30 world minutes in 0.5 real seconds')
    print('PASS: dragging outside dial releases cleanly; FLOW remains available, no lunar indicator discs in scene sky')
    print('PASS: changing FLOW rate, scenario/field-guide travel, LIVE and diagnostics; no browser JS errors')
    print('Screenshots: docs/living-pool-orrery-day.png, docs/living-pool-orrery-dusk.png')
    browser.close()
