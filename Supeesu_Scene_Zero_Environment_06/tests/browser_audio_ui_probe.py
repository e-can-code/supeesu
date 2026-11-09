"""Native Web Audio and actual scene control wiring, in an isolated Chromium page.

This checks that clicking the user-facing control reaches the real packaged mixer.
It does not establish physical speaker output or Firefox background guarantees.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'scenes/living-pool'

def module_url(path):
    source = path.read_text(encoding='utf-8')
    if path == ROOT / 'scene/scene.js':
        source = source.replace("const sceneRoot = '../scenes/living-pool/';", "const sceneRoot = ''; ")
        source = source.replace("const labMode = new URLSearchParams(location.search).has('lab');", 'const labMode = false; // offline native audio integration')
    pattern = re.compile(r"(from\s+)(['\"])([^'\"]+)(['\"])\s*;?")
    def replace(match):
        dependency = (path.parent / match.group(3)).resolve()
        if not dependency.is_relative_to(ROOT):
            raise ValueError('Module outside project')
        return match.group(1) + "'" + module_url(dependency) + "'"
    return 'data:text/javascript;base64,' + base64.b64encode(pattern.sub(replace, source).encode()).decode('ascii')

manifest = json.loads((MEDIA / 'scene.json').read_text())
for item in [*manifest['layers'], *manifest['fish']]:
    if 'asset' in item:
        item['asset'] = 'data:image/svg+xml;base64,' + base64.b64encode((MEDIA / item['asset']).read_bytes()).decode()
records = {
    'calendar.json':json.loads((ROOT/'calendar/calendar.json').read_text()),
    'environment.json':json.loads((MEDIA/'environment.json').read_text()),
    'scene.json':manifest,
    'coverageScenarios.json':json.loads((ROOT/'dev/coverageScenarios.json').read_text()),
    'microseasons_first_200_days.original.json':json.loads((ROOT/'calendar/source/microseasons_first_200_days.original.json').read_text()),
}
wavs={name:base64.b64encode((MEDIA/'audio'/name).read_bytes()).decode() for name in ['pond-water.wav','pond-motif.wav','splash.wav']}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=[
        '--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page(viewport={'width':1366,'height':768})
    failures=[]
    page.on('pageerror',lambda error:failures.append(str(error)))
    html=(ROOT/'scene/index.html').read_text()
    html=html.replace('<link rel="stylesheet" href="scene.css">','<style>'+(ROOT/'scene/scene.css').read_text()+'</style>')
    html=html.replace('<script type="module" src="scene.js"></script>','')
    page.set_content(html)
    page.evaluate('''({records,wavs}) => {
      const storage={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>storage[k]??null, setItem:(k,v)=>{storage[k]=v;}
      }});
      Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_name,_options,callback)=>callback({name:'probe'})}});
      window.fetch=async path=> {
        const end=String(path).split('/').at(-1);
        if(records[end]) return {ok:true,json:async()=>records[end]};
        if(wavs[end]) return {ok:true,arrayBuffer:async()=>Uint8Array.from(atob(wavs[end]),c=>c.charCodeAt(0)).buffer};
        return {ok:false,status:404};
      };
    }''',{'records':records,'wavs':wavs})
    page.evaluate('''async src => {await import(src);}''',module_url(ROOT/'scene/scene.js'))
    page.wait_for_function('Boolean(window.__supeesuScene)',timeout=15000)
    if not page.evaluate('window.__supeesuScene.soundscape.active'):
        page.locator('#soundToggle').click()
        page.wait_for_function('window.__supeesuScene.soundscape.active',timeout=10000)
    status=page.evaluate('window.__supeesuScene.soundscape.diagnostics')
    assert status['contextState']=='running' and status['channels']==['ambience'],status
    assert status['signalRms'] >= .13,status
    page.locator('#audioTest').click()
    page.wait_for_timeout(100)
    assert 'chime dispatched' in page.locator('#sceneStatus').inner_text().lower()
    page.locator('#musicToggle').click()
    page.wait_for_timeout(100)
    music=page.evaluate('window.__supeesuScene.soundscape.diagnostics.channels')
    assert music == ['ambience','music'],music
    page.evaluate('''() => {Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange'));}''')
    page.wait_for_timeout(70)
    hidden=page.evaluate('window.__supeesuScene.soundscape.diagnostics')
    assert hidden['contextState']=='running' and hidden['active'],hidden
    assert 'NO LOCK' not in page.locator('#audioDiagnostic').inner_text()
    page.evaluate('''async () => {await window.__supeesuScene.soundscape.stop();}''')
    assert not failures,failures
    print('PASS: real coordinator and audio controls played packaged high-level WAV, with measured RMS:',status['signalRms'])
    print('PASS: audible test-chime UI, independent music channel, persistence-on visibility policy, release')
    print('LIMIT: isolated Chromium. Neither Firefox hidden-tab playback nor hardware speaker output is verified.')
    browser.close()
