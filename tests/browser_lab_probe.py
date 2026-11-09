"""Offline Chromium smoke test of the original Time Laboratory with new diagnostics."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, json, re
ROOT=Path(__file__).resolve().parents[1]
SCENE=ROOT/'scenes/living-pool'

def module_url(path):
    source=path.read_text(encoding='utf-8')
    pattern=re.compile(r"(from\s+)(['\"])([^'\"]+)(['\"])\s*;?")
    def rewrite(match):
        dependency=(path.parent/match.group(3)).resolve()
        if not dependency.is_relative_to(ROOT):raise ValueError('Outside project')
        return match.group(1)+"'"+module_url(dependency)+"'"
    return 'data:text/javascript;base64,'+base64.b64encode(pattern.sub(rewrite,source).encode()).decode()

manifest=json.loads((SCENE/'scene.json').read_text())
for item in [*manifest['layers'],*manifest['fish']]:
    if 'asset' in item:
        item['asset']='data:image/svg+xml;base64,'+base64.b64encode((SCENE/item['asset']).read_bytes()).decode()
records={
    'calendar.json':json.loads((ROOT/'calendar/calendar.json').read_text()),
    'scenarios.json':json.loads((ROOT/'dev/scenarios.json').read_text()),
    'environment.json':json.loads((SCENE/'environment.json').read_text()),
    'scene.json':manifest,
    'microseasons_first_200_days.original.json':json.loads((ROOT/'calendar/source/microseasons_first_200_days.original.json').read_text())
}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1300,'height':900})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    html=(ROOT/'dev/index.html').read_text()
    html=html.replace('<link rel="stylesheet" href="lab.css">','<style>'+(ROOT/'dev/lab.css').read_text()+'</style>')
    html=html.replace('<script type="module" src="lab.js"></script>','')
    page.set_content(html)
    page.evaluate('''record=>{window.fetch=async path=>{const end=String(path).split('/').at(-1);return{ok:!!record[end],json:async()=>record[end]};};}''',records)
    page.evaluate('''async path=>{await import(path);}''',module_url(ROOT/'dev/lab.js'))
    page.wait_for_function('Boolean(window.__supeesuLab)',timeout=15000)
    assert page.locator('[data-calendar-markers]').count()==1
    assert page.locator('#scenario option').count()>=15
    page.locator('#scenario').select_option('0')
    page.locator('#loadScenario').click()
    page.wait_for_timeout(250)
    assert 'Scenario not applied' not in page.locator('#scenarioChecks').inner_text()
    assert 'diagnostics' in page.locator('#environmentState').text_content()
    assert 'authored' in page.locator('#environmentState').text_content()
    page.locator('#testDailyBoundary').click()
    report=page.locator('#dailyBoundaryReport').inner_text()
    assert 'Session rollover: PASS' in report,report
    assert 'New session eligible: PASS' in report,report
    assert 'Second start suppressed: PASS' in report,report
    assert 'Storage writes: 0' in report,report
    assert page.locator('#envEarthMoon').inner_text().endswith('approximate')
    assert page.locator('#envJadeMoon').inner_text().endswith('provisional')
    assert not errors,errors
    print('PASS: Time Laboratory loaded scene, authored microseason catalog, temporary calendar markers and scenarios')
    print('PASS: laboratory dry-run 05:30 eligibility, lunar phase readouts, and scenario diagnostics; no page JS errors')
    browser.close()
