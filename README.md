# Supeesu2 — World Foundation 08: Daily Life Readiness

This iteration preserves **The Long Voyage** Helm and the integrated Environment 06 Living Pool. Its main purpose is to make scheduling usable for a week without losing earlier routines, notes, or artistic direction.

## Launch

Extract the whole folder, run `RUN_PREVIEW.bat`, then visit `http://localhost:8178/`. This is a staging application; it does not replace your existing GitHub Pages homepage.

## First-run schedule

Enter **Helm**. If the shared schedule is empty, the observatory offers **Recover historical week**. The small Helm navigation bridge offers the same action. Review the counts in the preview and explicitly choose whether to add the archived Quiet Hours activities. **These are historical examples and may no longer match your current obligations.** They are never auto-imported. If an event ID already exists, the existing record is kept.

You can also use Atelier → Schedule → Import Quiet Hours examples.

## Scheduling

- **Today**: daily agenda and selectable details.
- **Star Map**: original time-aligned week/day visualization.
- **Month**: actual civil calendar with weekly repetitions, one-off events, month stepping, and date detail.
- **Constellations**: recurring patterns.
- **Rituals & modes**: groups authored ritual entries and future user-created modes; does not invent modes from historical data.
- **Make Room**: opens the recovered Quiet Hours editor for schedule entries; the parent shared editor also supports one-time events and a `kind` (event/routine/ritual/mode) field.

The Atelier and Helm use the same browser-local event repository. Existing personal notes and destinations are preserved. Use **Export data** regularly; the file now includes recovered Quiet Hours per-date planning overrides if present. Data is local to the browser and origin, not synced to other computers.

## Audio

No new automatic playback behavior is introduced. Entering the embedded Living Pool still does not itself authorize starting audio. Its actual 05:30 behavior remains subject to browser autoplay permissions and target-Firefox verification.

## Testing

Run `npm test` and `npm run check`. Browser testing still required for your specific Firefox extension, scheduling editor, nested instruments, and overnight audio.


## Repair 08.1: instruments opening the same room

The user-observed failure was that Today, Star Map, Month, and the planning crystal all displayed the entire old Quiet Hours room inside the Long Voyage dialog. The inner room also displayed an uninitialized `--:--` clock. The inner Quiet Hours UI previously depended on a JavaScript ES module importing a `.mjs` file. Some Windows local Python server MIME mappings do not serve `.mjs` as JavaScript, preventing the renderer from initializing.

This repair bundles the month/calendar helpers and Quiet Hours renderer into `integrations/quiet-hours-helm/helm-runtime.js`, loaded as a standard deferred script. Instrument mode is applied immediately by the HTML before loading the script, so the old Quiet Hours room cannot appear inside an instrument panel. A loading/failure message is shown instead of a misleading duplicate scene. The existing Long Voyage outer scene and all event data keys are unchanged.

For review: click Today, Star Map, Month, Rituals, and Make Room in turn. Each should show different content. Test historical recovery separately. Browser-based verification was blocked in the execution environment; these changes are based on code inspection and automated checks, not a claimed Firefox pass.
