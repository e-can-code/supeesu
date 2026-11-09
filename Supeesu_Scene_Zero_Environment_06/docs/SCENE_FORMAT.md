# Scene specification — Living Pool v1 (Environment 05)

The permanent inputs remain `calendar/calendar.json`, `scenes/living-pool/environment.json`, and `scenes/living-pool/scene.json`. The version-1 schemas validate the calendar, environment and scene structures. All actual media files are separately replaceable.

## Scene manifest and artwork

`scene.json` declares `sceneId`, SVG `stage` (`1200×720`), the `waterPath` used for clipping, ordered `layers`, three independently animated `fish`, and the `audio` paths. A layer has a stable ID, `z` order, optional asset path and `[x,y,width,height]`, and optional `clip` or `sway`. `sky`, `fish`, `ripples`, and `glints` are reserved renderer types. The existing `assets/*.svg` drawings are original provisional graphics. Replace them with compatible image-backed assets without altering clocks, seasonal formulas, or audio.

## Clock and environmental interpretation

An `EnvironmentResolver` receives the current world instant and calendar snapshot. Its output is consumed by the sky and pond renderers and by temporary `CalendarMarkers` visuals. `environment.json` defines cyclic daily lighting and sky colors, all eight seasonal palettes, independent 200/400/7-day amplitudes, a seeded splash schedule, and bounded annual event treatments.

- The World Orrery `FLOW` defaults to 3,600× world time, with 1×, 60×, and 86,400× alternatives. The visual renderer draws environmental world time but **animal movement uses real animation time** to avoid runaway swimming speed.
- `MicroseasonCatalog` reads the preserved authored 29-profile source at `calendar/source/microseasons_first_200_days.original.json`. The profile name, daily weight and signature are exposed only where the first-200-day source coverage is approved. Days beyond that coverage retain a valid seven-day phase but have no invented named profile.
- Temporary Earth lunar phase is computed using a synodic-month estimate from a published-style reference new moon, not a verified ephemeris. The Jade moon is a separate 36-day cycle with an unapproved phase anchor. The phase diagrams are now shown through laboratory readouts rather than printed directly onto the sky. Replacing those readouts does not alter the phase contracts.
- Synthetic rain windows are deterministic from local date and season moisture; after-rain dampness and rainbow use the same fictional daily record. This does **not** imply real historical weather reconstruction.
- Temporary tree foliage reacts to the time-of-day growth interval 05:30–18:30 and a February blossom indicator. The permanent tree-art and transformation calendar remain to be authored. Seven-day dots and 200/400-day bars intentionally reveal the machinery instead of suggesting finished art.
- The annual January 29 Great Convergence is independently composited with the current ecological season. A July 29 recolor is visible only because the staging scene opts into development events; this is not a canonical annual holiday.

The newer dusk and warm red-amber/sepia color knots are diagnostic palette adjustments. Artistic approval is still pending.

## Replaceable media and level checks

The `audio` section resolves to three local short WAVs. They are original synthesized placeholders, now normalized to audible working ranges. `PondWebAudioSoundscape` decodes samples into one AudioContext and exposes two independent looping channels. The test chime is synthesized only when its UI control is clicked. This sample decoder is **not** a suitable engine for several hours of long-form audio; an independent streamed music/voice channel remains future work.

## Validation and sources of truth

`python tools/validate_scene.py` checks JSON Schema, referenced asset existence, SVG syntax, sample file frames, and season IDs. `python tools/validate_calendar.py` checks the preserved calendar sources. `npm test` and the browser probes exercise logic and rendering. The calendar sources remain universal; environment semantics remain scene-specific. `dev/coverageScenarios.json` is only the developer field guide, not an authority for actual event dates.

## Lighting and temporal overlays in Environment 05

Ground and water have separate nighttime SVG lighting nodes. A sky color or sun/moon position is read from the environment snapshot and never calculated from an image filename. The oversized phase discs were removed from in-scene rendering until a verified world map defines orbital positions. Short-term sky and pond assets remain separately replaceable.
