# Real Environment 06 Living Pool — World Foundation 05

The entire Environment 06 source package is bundled here unchanged, including `scene/index.html`, `src/`, `calendar/`, `shared/`, assets, audio, dev tools and tests. The Supeesu2 parent loads `scene/index.html` in a same-origin iframe. Relative imports remain valid.

## Ownership and isolation
- Parent navigation owns the location graph and return button.
- The pool owns its existing calendar, three clocks, 05:30 session rule, World Orrery, renderer, Web Audio and daily ledger.
- Parent placeholder audio is stopped on entering the pool; pool audio requires its own browser-appropriate activation.
- Leaving the pool unloads the iframe. This stops its audio. Opening a separate pool tab is supported but may trigger the existing multi-tab ownership behavior.
- The parent's note/event store is intentionally independent from the pool's world clock and audio ledger.

## Tests still needed on Firefox
Enter/leave repeatedly, background audio, 05:30 behavior, world flow, search focus after return, multi-tab playback ownership, and long-lived resource use. The iframe bridge is not yet a shared in-process scene renderer.
