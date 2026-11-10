# Architecture — WF01

`data/world.json` -> `src/core.js` (pure graph/time/event logic) -> `src/app.js` (UI coordinator). `src/store.js` is the only owner of personal-data writes and export/import. `src/helm.js` contains pure view rendering for Today, Present, Star Map and Constellations; its event actions delegate to `src/app.js`. All scene graphics are temporary CSS layers. The source Quiet Hours files are retained in `helm-legacy/` for provenance and future comparison.

No full Environment 06 audio/calendar/pond modules are available in this build. Do not claim the simplified prototype is a replacement for the deployed homepage. Personal records are local to this browser and origin; changing hostname/port requires JSON export/import. Shared localStorage across tabs has last-write-wins behavior. A production data layer should support conflict detection, atomic edits and migrations.

## WF02 additions
`src/navigation.js` is the authoritative state transition layer for arrival, travel, looking and return. `data/world.json` declares location/viewpoint artwork bindings. Every viewpoint has an independent replaceable SVG placeholder under `assets/views/`. `src/app.js` remains responsible for DOM binding, not route rules. Helm instruments and Atelier glances read the same `PersonalStore` as the event and note editors.

## WF03: Atelier quick actions and Helm separation
The Atelier quick-action strip is centered at the bottom, next to the compact navigation/return controls. `src/hoverIntent.js` implements a 380 ms cancelable pointer dwell, with ordinary click and touch operation preserved. A hover can open a panel only if no other panel is active. Scene locations and navigation history are unchanged.

The Helm's presentation hides the Hermitage architecture, landscape, floor, tree and water; its replaceable SVG contains only sky and celestial elements. Actual-time phase labels are applied to both Atelier and Helm via a common `data-light-phase` classification, with different framing and shared phase timing. This is a provisional sky treatment, not the canonical E06 comfort-curve engine.

The Helm now includes a current/upcoming readout in its scene, Today day stepping, and Star Map week/day selection. These views use the same persistent event store and editor as the Atelier; Quiet Hours' original missing operations editor remains deferred.

## WF04 integration boundary
Pool iframe bridge is a temporary adapter, not a second calendar. The complete Environment 06 source is required for proper renderer/audio/calendar reuse. Existing data store is unchanged.

## World Foundation 05
Real Environment 06 source is vendored intact at `integrations/living-pool/`. The parent navigation graph loads its `scene/index.html` into a same-origin iframe and owns the exit control. This intentionally isolates the proven scene from the provisional Supeesu2 world UI. Future integration may extract shared calendar and audio modules after browser regression tests. The historical Quiet Hours scheduler is retained under `recovered/quiet-hours/` with separate storage; only its field model is integrated into the shared event editor.


## World Foundation 06: recovered Helm integration
The original Quiet Hours Helm is mounted in `integrations/quiet-hours-helm/` as an embedded scene. Its original star-map and planning UI are preserved. `src/quietHoursBridge.js` adapts Supeesu2 shared weekly events to the recovered schedule and one-time events to planning exceptions. Storage is namespaced to avoid collisions with older Quiet Hours applications. Original disruption overrides are retained locally by the Helm but not yet represented in the Supeesu2 JSON export. The Helm iframe is not the owner of the world clock or ecological calendar.

## Pool audio isolation
The Living Pool uses `?embedded=1` when entered from the multi-space application. This disables the standalone automatic daily playback supervisor in the embedded view, without disabling manual sound. Standalone Environment 06 retains its existing session behavior.

## Interaction lifecycle
Hover-opened Atelier panels dismiss when the pointer leaves both opener and panel, unless the user begins interacting. Return in non-Atelier locations means Atelier; Return from Atelier means the stored last non-Atelier location and viewpoint.

## WF07 — Helm composition boundary
The shell enters `integrations/quiet-hours-helm/long-voyage/index.html` as its Helm scene. That page retains the user-supplied *Observatory — The Long Voyage* original drawing and 36-hour experimental celestial chapters. Its date, map, and crystal instruments now open the recovered Quiet Hours `instrument` views through same-origin iframes. Quiet Hours retains the actual Today, Star Map, Constellations, and planning/editor logic, and reads the shared scheduling bridge's browser keys. The 36-hour chapters remain visual experiments, not ecological calendar events. `voyage-instruments.js` validates the instrument routes.


## World Foundation 08: shared civil calendar projection
`integrations/quiet-hours-helm/calendarModel.mjs` is a pure date/projector module for monthly calendar, one-time occurrences, recurring weekly events, and per-day overrides. All date constructors use local noon so calendar stepping does not divide UTC milliseconds through daylight-saving transitions. The original Quiet Hours renderer remains intact except for new Month and Rituals & Modes panels. The Long Voyage instruments open that renderer through explicit view routes.

Historical Quiet Hours schedule recovery is additive and user-initiated. `src/historicalImport.js` prepares a collision-safe preview, the parent personal store is authoritative, and a same-origin frame message requests the import. No historical schedule becomes active silently. The shared record format now optionally carries a `kind` role; the Helm's original weekly scheduling constraints remain intact. Personal export may include `quietHoursPlanning` for exception preservation.
