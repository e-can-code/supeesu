"""Chromium integration smoke test; does not certify target Firefox behavior."""
from pathlib import Path
import subprocess,time,urllib.request,mimetypes
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8171','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen('http://127.0.0.1:8171/',timeout=1).close();break
        except Exception:time.sleep(.1)
    else:raise RuntimeError('Local server did not start')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1280,'height':800})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def route_file(route):
            rel=route.request.url.split('supeesu.test/',1)[-1].split('?',1)[0] or 'index.html'
            target=(root/rel).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                route.fulfill(status=404,body='Not found');return
            route.fulfill(status=200,body=target.read_bytes(),content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
        page.route('https://supeesu.test/**',route_file)
        page.goto('https://supeesu.test/')
        page.wait_for_selector('#hotspots button')
        assert page.locator('#locationLabel').inner_text()=='Atelier'
        page.keyboard.type('orchid')
        assert page.locator('#searchInput').input_value()=='orchid'
        page.locator('#searchInput').fill('')
        page.locator('[data-panel=capture]').click()
        page.locator('#captureText').fill('Remember the amber light')
        page.locator('#saveCapture').click()
        assert 'Remember the amber light' in page.locator('#panelBody').inner_text()
        page.locator('#closePanel').click()
        page.locator('#hotspots button').filter(has_text='The Helm').click()
        assert page.locator('#locationLabel').inner_text()=='The Helm'
        page.locator('#returnButton').count()
        page.locator('[data-panel=events]').click()
        page.locator('#newEvent').click()
        page.locator('[name=title]').fill('Design review')
        page.locator('[name=date]').fill('2026-11-11')
        page.locator('#eventForm button[type=submit]').click()
        assert not errors,errors
        page.reload();page.wait_for_selector('#hotspots button')
        assert page.locator('#locationLabel').inner_text()=='Atelier'
        page.locator('[data-panel=notes]').click()
        assert 'Remember the amber light' in page.locator('#panelBody').inner_text()
        page.locator('#closePanel').click()
        page.locator('#returnButton').click()
        assert page.locator('#locationLabel').inner_text()=='The Helm'
        page.locator('[data-panel=events]').click()
        assert page.locator('#panelBody').locator('#newEvent').count()==1
        assert not errors,errors
        page.screenshot(path=str(root/'docs/browser-smoke.png'),full_page=True)
        browser.close()
    print('PASS: Chromium new-tab typing, note capture/persistence, navigation/return, event creation, reload, no JS errors')
finally:
    server.terminate();server.wait(timeout=4)
