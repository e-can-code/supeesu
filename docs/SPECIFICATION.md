# SUPEESU2 / WORLD FOUNDATION 01 — IMPLEMENTATION SPECIFICATION

**Status:** working foundation candidate; artwork is deliberately provisional. **Purpose:** demonstrate the complete world topology and interaction architecture before committing to finished spatial art. **Deployment:** static web application, separate from the active Environment 06 homepage. **Priority:** ASACP (as soon as comfortably possible), not rushed.

## 1. Fixed design decisions

1. New tabs always arrive in **Atelier**. A single unobtrusive Return control goes directly to the last non-Atelier location and viewpoint. The Atelier itself must never erase the last-place record. No automatic restoration.
2. **Discrete viewpoints**: the Atelier has left, center, right; the other initial locations have center. Looking changes viewpoint, not location.
3. **Navigation**: environmental hotspots plus a reliable, discreet Places control. Destinations and edges are declared in `data/world.json`. Final physical directions remain open.
4. **Notes**: one-step capture and a small persistent note collection. Notes are not categorized on creation. Editing and deletion are available.
5. **Helm**: recover Quiet Hours' Today, Present, time-aligned Star Map, and recurring Constellations views, with real shared events and a minimal one-time/weekly editor. Preserve existing schedule constraint fields when importing historical examples. Missing `operations/` is not fabricated.
6. **Personal records**: browser-local, versioned, JSON export/import, with validation and explicit confirmation before overwrite. No private records committed to GitHub.
7. **Existing daily-use homepage**: leave Environment 06 untouched. World Foundation 01 is a separate project/staging release.
8. **World authoring Workshop**: separate future application. The old Quiet Hours “workshop” means its schedule editor and is not the Supeesu Workshop.

## 2. Initial world topology

`Atelier` is the arrival and personal work center in the `Hermitage` (the larger building, garden and connected spaces). `Window/View` is provisionally modeled as a location, pending final choice of a viewpoint versus room. `Living Pool` is a contemplative destination, `Garden's Edge` a threshold/exploration destination, and `Helm` the temporal orientation/coordination space. `Workshop` is outside the world. The observation window and Helm's observatory language remain distinct; the actual physical connection is unresolved.

Connections: Atelier ↔ Window, Pool, Garden, Helm; Pool ↔ Garden; Window ↔ Helm. All are *functional navigation edges*, not finalized geographic paths. Any change is data-driven.

## 3. Interaction model

**State:** `locationId`, `viewpointId`, `activePanel`, `focusedInput`, `lastNonAtelierPlace`, plus independent audio and personal records. Input priority: (1) native text/IME, (2) summoned panel, (3) object activation, (4) spatial navigation, (5) default search. Avoid a second global key handler stealing text from editors.

- Open → Atelier, center view, search focused.
- Type → transparent search, Google default, DuckDuckGo upper dot; Enter selected engine, Ctrl+Enter other, Escape clears.
- Click an environmental hotspot → travel along an allowed edge.
- Open Places → reliable route access, including indirect travel via Atelier in this staging graph.
- Alt+Left / Alt+Right → Atelier left/right view, unless a panel is open. On-screen controls also available. These are staging controls, not a final gesture vocabulary.
- Return → last non-Atelier location and its viewpoint; does not reopen notes, alter audio, or replace the default arrival.
- Escape → dismiss active panel; note editors autosave. Modal focus and keyboard accessibility require browser checks.
- View transitions are currently immediate cuts. Camera, parallax, pan, fade, gestures and final objects remain artistic decisions.

## 4. Eight Atelier situations

| Situation | Foundation behavior |
|---|---|
| Look something up | Invisible search, immediate focus |
| Get somewhere | Quick destination library and world Places |
| Settle into work | Minimal independently controlled synthetic ambience and stillness |
| Remember something | Quick capture, saved to persistent note collection |
| What was I doing? | Most recent note available in Notes; richer activity restoration deferred |
| What's coming up? | Next events from shared repository |
| Manage something | Notes, links and events panels |
| Be here for a while | Ambient Atelier, no mandatory interaction |

## 5. Shared data and persistence

A single `PersonalStore` owns notes, event records and destinations. Data is validated on import and commit; writes are atomic at the `localStorage.setItem` level, but not transactionally synchronized across concurrent tabs. The namespace is `supeesu2:wf01:*`, isolated from Quiet Hours and the live homepage. `storage` events refresh other tabs; **concurrent edit conflict resolution is not implemented**. Export/import is explicit. All personal records remain on the browser/origin unless the user exports them.

`event`: `id`, `title`, `repeat: once|weekly`, `date` or `days`, `start`, `end`, optional category, details, featured, priority, minimumMinutes, canMove, canSplit, canSkip. Foundation supports creation/edit/deletion and viewing; constraints are preserved but **no optimization/recast planner** is implemented. Historical `schedule.json` is included only as a reference; the user must explicitly choose to import its examples.

## 6. Helm integration

The source `helm.js`, `helm.css`, and `schedule.json` are retained unmodified in `helm-legacy/`. The working Helm uses a **modular reimplementation of its four functional views**, not a claim that the missing `operations/` editor works. A shared event repository powers Atelier upcoming activity and Helm Today/Present/Star Map/Constellations. This is the foundation for later sophisticated planning and disruption handling.

## 7. Rendering and ecology

The Atelier and adjacent rooms use lightweight CSS/SVG-like layered placeholders, not approved final artwork. Scene geometry, materials, spatial orientation and viewpoint composition remain OPEN. The live Living Pool Environment 06 renderer is **not included** because its source archive was not mounted in this session; the Pool in this build is a functional navigation placeholder. Do not describe it as a full integration of the pond's calendar, audio or visual systems.

The canonical ecological epoch (2027-01-29), 800-day seasons, 200/400-day rhythms, seven-day microseasons, annual January 29 Great Convergence and real-time comfort curve are **not changed**. They are not reimplemented in this skeleton. The next integration stage must import their verified source modules without introducing competing clocks. The separate 05:30 Session Clock rule remains a requirement for the later shared time service; the current code exposes only a pure session-day calculation for testing.

## 8. Audio

A quiet original synthetic ambience is provided for basic user-gesture and pause testing; it is **not** the full persistent audio engine from Environment 06. No cross-tab ownership, daily 05:30 autoplay or long-form soundscape is claimed. The new world must eventually reuse the validated Environment 06 mixer, not create a rival production audio subsystem.

## 9. Engineering rules

- Separate pure navigation, time and schedule calculations from DOM rendering and storage side effects.
- Avoid a hardcoded room-to-room navigation switch; use `data/world.json`.
- Preserve source originals and design provenance; make placeholders replaceable.
- Do not write fake events or notes to the user's browser without an explicit action.
- Keep diagnostic UI summonable; avoid polluting the ambient arrival view.
- Update docs and tests for each iteration; run a calendar pass even when calendar data is unchanged.
- All GitHub Pages paths are relative to the project root; run from a server, not `file://`.

## 10. Acceptance tests

**Automated:** graph integrity, connected travel, invalid routes, viewpoint isolation, return-record semantics, 05:30 session boundary, event recurrence, historical schedule conversion, storage persistence, import validation, export round-trip. **Browser:** actual first-character capture, focus in note/event forms, click hotspots, panel Escape, reload persistence, Helm views, event creation and editing, navigation, mobile/responsive layout, and console errors. **Target Firefox:** first new-tab focus, personal-data storage under GitHub origin, multiple tabs and audio behavior must be verified separately.

## 11. Deferred decisions

Final Atelier composition and art style; courtyard/tree/window visibility; actual spatial geometry; pan vs dissolve; Helm/Hermitage connecting artifact; Garden's Edge functional role; final note organization; disruption planner; calendar integration; moon map; completed Living Pool integration; advanced soundscape engine; Workshop authoring. These are intentional open points, not missing placeholders to silently fill.

## 12. Next release gate

After review with design collaborator: refine Atelier viewpoint concepts, verify real first-five-seconds use cases, import and validate the Environment 06 source modules, add real shared audio/calendar ownership, improve note editor persistence and accessibility, then begin replacing one scene's artwork without altering data or navigation contracts.


## WF06 corrective specification
The full recovered Quiet Hours Helm, not a generic star-map approximation, is the Helm experience. The original one-time disruption planner remains usable. A data adapter shares weekly and one-time activities with Supeesu2 without importing sample schedule entries by default. Return controls must work in View, Garden, Helm, and Pool. Hover-opened panels dismiss on exit but pin when deliberately used. Embedded Pool starts silent, without changing standalone 05:30 audio behavior. All functionality must be tested in Firefox before promotion.
