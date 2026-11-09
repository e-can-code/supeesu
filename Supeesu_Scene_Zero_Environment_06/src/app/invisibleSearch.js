// Invisible search is a real input: IME, selection and paste remain native.
// A new tab always starts on Google; switching engines never persists a preference.
export function mountInvisibleSearch({ form, input, dots, google, duck, sceneColors = {} }) {
  let engine = 'google';
  form.style.setProperty('--search-google', sceneColors.google || '#d3c49c');
  form.style.setProperty('--search-duck', sceneColors.duck || '#dba47c');
  function refresh() {
    dots.hidden = input.value.length === 0; form.dataset.engine = engine;
    google.dataset.selected = String(engine === 'google');
    duck.dataset.selected = String(engine === 'duck');
  }
  function select(next) { engine = next; refresh(); input.focus({ preventScroll: true }); }
  function submit(other = false) {
    const query = input.value.trim(); if (!query) return;
    const target = other ? (engine === 'google' ? 'duck' : 'google') : engine;
    const url = target === 'google' ? 'https://www.google.com/search?q=' : 'https://duckduckgo.com/?q=';
    window.location.assign(url + encodeURIComponent(query));
  }
  form.addEventListener('submit', event => { event.preventDefault(); submit(); });
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { input.value = ''; refresh(); event.preventDefault(); }
    if (event.key === 'Enter' && event.ctrlKey && !event.isComposing) { event.preventDefault(); submit(true); }
  });
  google.addEventListener('click', () => select('google'));
  duck.addEventListener('click', () => select('duck'));
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) return;
    if (event.key === '/' && !event.shiftKey) { event.preventDefault(); input.focus({preventScroll:true}); return; }
    if (event.key.length === 1 && !event.repeat) {
      event.preventDefault(); input.focus({preventScroll:true});
      input.setRangeText(event.key,input.selectionStart,input.selectionEnd,'end');
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  // Initial focus is requested synchronously, then again after page setup. Firefox
  // extensions can override this; their actual new-tab behavior must be tested.
  input.focus({preventScroll:true}); refresh();
  return { refresh, focus: () => input.focus({preventScroll:true}), getEngine: () => engine };
}
