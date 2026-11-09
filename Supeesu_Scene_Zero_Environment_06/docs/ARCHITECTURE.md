# Supeesu Scene Zero — Architecture

**Current release:** Environment 05 · November 9, 2026. This file documents implemented boundaries and gaps, not speculative completion. The Living Pool is a permanent scene. Graphics and diagnostic controls are replaceable.

## Data and time ownership

```text
                          RealClock (wall-clock milliseconds)
                         /                              \
     SessionClock (05:30 civil boundary)             WorldClock (live / seek / rate)
                 |                                      |
     DailyPlaybackPolicy                         CalendarEngine
                 |                                      |
     DailyAudioSupervisor                        EnvironmentResolver
                 |                                      |
       AudioOwnership                       EnvironmentResolver
                 |                       /            |           \
     Web Audio Soundscape            DiagnosticCycles  SkyRenderer  PondRenderer
      ambience / music / splashes      Moon / weather    Sun/sky      Layer assets
                 |                     Tree / rhythm      |           | 
       Audio state only                  readouts        +------ CalendarMarkers
                                                                  |
                                                      Fish + splash visualization

    Time Laboratory and field guide inject simulated World Clock values.
    Simulation never writes actual playback history or preference state.
```

The **Real Clock** is untouched. The **World Clock** alone supports seeking, freezing, and rate changes. The **Session Clock** is derived from *real* host-local civil time; its daily boundary is 05:30 and is not a fixed 24-hour interval across daylight-saving transitions. A simulation-only session label is permitted for inspection but may not trigger real audio eligibility or write the real ledger.

`calendar/calendar.json` defines universal chronology: January 29, 2027 is an anchor, not a creation boundary. Eight 100-day seasons occur throughout signed 800-day cycles. Independent 7-, 200-, and 400-day phases continue across cycle boundaries. Great Convergence occurs January 29 every *civil* year, independently of the current ecological season. July 29 is a diagnostic event only.

## Pure resolution contracts

- `CalendarEngine.describe(worldMs,options)` returns ecological position, rhythms, source microseason ID, annual events, and local civil date. It performs no browser I/O.
- `MicroseasonCatalog.describe(calendarSnapshot)` resolves original named seven-day design profiles during the first 200 documented days only. Profile 29's overlap past day 200 is **not** silently adopted; no missing weeks are invented.
- `EnvironmentResolver.resolve(worldMs, calendarSnapshot)` returns continuous lighting/warmth/mist/water highlights/fish activity, palettes, event treatments, and diagnostic cycle signals. Sources are supplied at construction and remain independent of renderers.
- `resolveDiagnosticCycles()` supplies approximate Earth lunar phase, provisional independent 36-day jade phase, seeded fictional daily weather, post-rain cues, tree progress, February bloom flag, seven-day indicators and day markers. These are deterministic **diagnostic placeholders**, not verified external meteorology/ephemerides.
- `WorldClock` gives the only world time; `RealClock` is used for countdowns, audio playback, and real-time animation duration.

The environment resolver composes, in order, authored continuous daily curves, the current season targets, independent 7/200/400-day influences, then explicitly declared event treatments. Calendar effects must have bounded strengths; named events are sorted to prevent object insertion order from altering composition. The two moon cycles are intentionally independent; no latitude-specific sunlight or authoritative astronomy is yet implemented.

## Scene geometry, visual lifecycle, replaceable assets

`scenes/living-pool/scene.json` declares stage geometry, an SVG water clipping outline, z-ordered image layers, independent fish assets and audio references. The standard scene stage is 1200×720, scaled with SVG `preserveAspectRatio`; `src/visual/pondRenderer.js` cannot know ecological day arithmetic. `SkyRenderer` consumes environment sky state. `CalendarMarkers` injects deliberately removable diagnostic SVG shapes for tree, moon phases, precipitation, a rainbow and short-cycle gauges. Removing these markers does not alter either the clock or environment resolver.

**Fast FLOW intentionally separates two concepts:** world environmental time advances at the chosen World Clock multiplier; ordinary *continuous animal motion* uses RealClock milliseconds, preventing a blur of fish while scrubbing 24-hour or 800-day conditions. This changes the earlier deterministic animal-position convention. Fish activity intensity remains deterministic for the simulated date; fish *pose at a different real instant* need not be identical. Seeded discrete splash event schedules remain deterministic per world date.

`src/behavior/acceleratedEvents.js` detects a bounded number of crossed splash events in accelerated FLOW to draw short real-time ripples; deliberate seeks invalidate the cursor so skipped events cannot replay. At most one such ripple is visualized about every 1.7 real seconds. Optional sound is capped to one splash about every 6.5 real seconds and requires an already active soundscape. Normal-speed events follow the original deterministic scheduler.

Hidden tabs suspend visual frames. The policy leaves Web Audio running only if the persistent-sound preference is on. An unfocused but still-visible window keeps the scene rendered. These policies are distinct from closing a tab, which ends browser playback.

## Audio failure investigation and contracts

`PondWebAudioSoundscape` owns one AudioContext and independent looping `ambience` / `music` sources plus one-shot `splash` and diagnostic test tone. It must hold the Web Locks exclusive audio-owner token before launching sounds. An optional HTMLAudio implementation remains a fallback when Web Audio is unavailable.

**Retained Environment 04 correction:** `start()` calls `primeUserGesture()` synchronously before the first `await` for the Web Lock. The browser AudioContext.resume request is issued inside the original click call stack, which avoids losing the user activation during asynchronous lock acquisition. A 1.8-second bounded resume attempt reports a blocked state instead of hanging indefinitely. A first-open autoplay attempt may still fail; a subsequent explicit click retries.

The original pond WAV RMS was ~0.041 full-scale, further reduced by mixer volume. The Environment 04 staging samples are normalized and the ambience gain is 0.78. Diagnostics expose context state, lock ownership, decoded sample RMS, and errors. A test-tone control uses the same context; its audible result is **not** equivalent to a browser output-device guarantee.

The real session-day ledger (`supeesu.sceneZero.dailyAudio.v1`) is written only after an eligible *pond ambience* loop is accepted by a running audio context (or fallback successfully starts). The dedicated test-chime button cannot write the ledger. The World Clock, field-guide scenarios, and Time Laboratory never write real session history. The persistent preference is changed only by the explicit persistent-audio toggle.

**Known limitation:** Browser automation observes the Web Audio state and signal, not sound coming out of Windows speakers. User testing in Firefox is required. Audio cannot continue after its tab is actually closed.

## Development instruments and documentation discipline

The World Orrery has three independently draggable rings (800, 7, and 1 day). `FLOW_RATES = [1,60,3600,86400]`; the default accelerated FLOW is 3600× (one world hour per real second). LIVE switches back to actual host time. `CalendarFieldGuide` reads `dev/coverageScenarios.json`, offers 37 coverage cases, and reports current state independently from selected test. The original full `dev/` Time Laboratory is retained.

The source of truth for chronological rules is `calendar/calendar.json` and `CalendarEngine`; for scene effects it is `environment.json` and `EnvironmentResolver`; for art composition it is `scene.json`; for playback it is the audio engine and its explicit policies. No generated screenshots or temporary guide labels are authoritative chronology.

Docs with distinct responsibilities: `ARCHITECTURE.md` (current contracts), decision ADRs (why), `CHANGELOG.md` (what changed), `TEST_LOG.md` (observed proof), `KNOWN_ISSUES.md` (open work), `ASSET_REGISTER.md` (media and rights), `SCENE_FORMAT.md` (asset and data format), and `in_next.txt` (next work). Updating these and executing a calendar pass is mandatory per iteration. Earlier releases are preserved separately and their archived test claims are not rewritten.

`src/core/seededRandom.js` owns the shared deterministic text hash. Behavior and fictional weather both import this neutral helper; the environment module does not depend on fish-specific behavior modules.


## Environment 05: real-session supervision and ownership

`src/audio/dailyAudioSupervisor.js` uses **only** the injected RealClock, DailyPlaybackPolicy and audio-engine state. It schedules bounded real-time checks (up to 30 seconds between checks), plus explicit focus, pageshow, storage and visibility resynchronization. The first check occurs on page opening. At a new 05:30 local session boundary, an existing tab becomes eligible even if its world-time simulation is centuries away. A hidden tab with persistence disabled defers its attempt until visible. A running ambient bed is credited for the new session **without stopping or restarting**. Web Locks continue to prevent duplicate simultaneously playing tabs on the same origin.

An autoplay-blocked automatic attempt remains pending and is not retried continuously. A subsequent user-initiated speaker click may start audio and record success. Recording a successful audio-engine start confirms an active source within a running context; neither a muted operating system nor a muted browser tab can be measured as physically audible by this code. The session ledger is never written by the Time Laboratory. Browser timer throttling can delay an automatic boundary callback; focus/pageshow resynchronization catches up. No normal webpage can guarantee unmuted autoplay or playback after tab closure.

`src/audio/dailySessionPreview.js` provides an isolated 05:29:59 → 05:30:00 policy dry run. The Time Laboratory renders its output without audio or storage. This is verification of the decision rule, not a simulation of browser audio permissions or cross-tab contention.

## Environment 05: stable orrery and divided lighting responsibilities

`WorldOrrery` attaches pointer move/up/cancel handling to `window` for the duration of a drag, with release on window blur. This avoids a trapped interaction if the pointer leaves an SVG ring. FLOW and the speed selector remain mounted, visible and clickable after a seek. The ring changes only WorldClock, never the real session ledger.

`resolveSky()` continues to calculate a stylized temporary sun path, authored cyclical sky palette, stars and clouds. Until universe-space maps and moon orbits are authored, actual moon rendering in the scene is suppressed. Both approximate lunar *phase models* remain active and observable in the Time Laboratory/field guide. `CalendarMarkers` no longer attaches its oversized phase discs to the sky.

`PondRenderer` uses independent material lighting for ground and water, and no longer lays the former whole-scene night tint over stars and sky. Evening gold/rose and burgundy/amber night palettes are still **diagnostic art direction**, not approved final lighting. The reference calendar JSON remains byte-for-byte unchanged and the seasonal/rhythm/convergence calculations continue to be resolved by the same production modules.

## Environment 06 — Daily Home
Home is the default UI mode; Laboratory reveals the unchanged orrery and diagnostic tools. `src/app/invisibleSearch.js` owns the ephemeral search query and engine. `src/environment/comfortLighting.js` reads the real local time and approved JSON, and the renderer applies the final presentation independently of the World Clock. The splash WAV is independently replaceable through the scene manifest. No ecological chronology was changed.
