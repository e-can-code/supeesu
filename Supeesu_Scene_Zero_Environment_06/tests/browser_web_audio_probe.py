"""Native Chromium Web Audio integration smoke, not a target Firefox background test."""
import base64
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

def module_url(path):
    source=path.read_text()
    pattern=re.compile(r"(from\s+)(['\"])([^'\"]+)(['\"])\s*;?")
    def rewrite(match):
        return match.group(1)+"'"+module_url((path.parent/match.group(3)).resolve())+"'"
    source=pattern.sub(rewrite,source)
    return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()

ambience=base64.b64encode((ROOT/'scenes/living-pool/audio/pond-water.wav').read_bytes()).decode()
music=base64.b64encode((ROOT/'scenes/living-pool/audio/pond-motif.wav').read_bytes()).decode()
splash=base64.b64encode((ROOT/'scenes/living-pool/audio/splash.wav').read_bytes()).decode()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=[
        '--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page()
    page.set_content('<button id="start">Start audio</button>')
    result=page.evaluate('''async ({module,ambience,music,splash}) => {
      const {PondWebAudioSoundscape}=await import(module);
      const wavs={ambience,music,splash};
      let owner=false;
      const mixer=new PondWebAudioSoundscape({sources:{ambience:'ambience',music:'music',splash:'splash'},
        ownership:{acquire:async()=>{owner=true;return true;},release:()=>{owner=false;},isOwner:()=>owner},
        fetcher:async path=>({ok:true,arrayBuffer:async()=>Uint8Array.from(atob(wavs[path]),c=>c.charCodeAt(0)).buffer}),
        resumeTimeoutMs:2000});
      const started=await mixer.start();
      const startedState={started,...mixer.diagnostics};
      await mixer.toggleMusic();
      const musicChannels=[...mixer.diagnostics.channels];
      // This models the scene's policy action during tab visibility changes;
      // the browser's real document.hidden state is not changed in this probe.
      const persistentState=mixer.diagnostics.contextState;
      await mixer.pause();
      const pausedState=mixer.diagnostics.contextState;
      await mixer.resume();
      const resumedState=mixer.diagnostics.contextState;
      await mixer.playSplash();
      await mixer.stop();
      return {startedState,musicChannels,persistentState,pausedState,resumedState,stopped:mixer.diagnostics.contextState,owner};
    }''',{'module':module_url(ROOT/'src/audio/pondWebAudio.js'),'ambience':ambience,'music':music,'splash':splash})
    assert result['startedState']['started'] is True,result
    assert result['persistentState']=='running',result
    assert result['pausedState']=='suspended',result
    assert result['resumedState']=='running',result
    assert set(result['musicChannels'])=={'ambience','music'},result
    assert result['stopped']=='closed' and result['owner'] is False,result
    print('PASS: native Chromium AudioContext decoded supplied WAV loops, started ambience/music, paused and resumed, and released ownership')
    print('IMPORTANT: this probe does not assert OS-level sound output or true hidden-tab behavior in Firefox')
    browser.close()
