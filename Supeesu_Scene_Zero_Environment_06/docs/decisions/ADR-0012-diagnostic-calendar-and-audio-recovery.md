# ADR-0012 — Broad Diagnostic Calendar Coverage and Audible Audio Recovery

**Status:** Accepted for Environment 04 · 2026-11-09.

## Context

The calendar already contained eight ecological seasons, 7/200/400-day cycles, daily markers and annual events, but several planned signals were not visually represented. Earth/Jade lunar phases, daily growth and rain response were unimplemented. The user reported no audible scene audio despite previous success with the simpler laboratory tone.

## Decision

Add `resolveDiagnosticCycles()` as a pure, scene-independent placeholder signal provider, and `CalendarMarkers` as a removable scene-specific SVG adapter. Use an explicitly approximate Earth lunar phase, a provisional 36-day jade phase, deterministic fictional daily rain history, a diagnostic February bloom, time-of-day growth markers, and visible short-cycle indicators. Read the *original* microseason catalog without silently extending its approved range. Maintain one development-only field guide that travels through representative scenarios without touching real playback or preferences. True astronomy, historical meteorology, and official lunar-new-year sources remain unresolved; the diagnostic data must identify itself as nonauthoritative.

For audio, normalize the synthesized WAVs and increase gain, call `AudioContext.resume()` in the original click stack before any awaited lock acquisition, and expose lock/context/error/signal diagnostics plus a separate audible test chime. The test chime never marks daily production playback success.

## Consequences

The page now supports observable testing of intended calendar *interfaces* before art direction or external astronomical sources are finalized. Temporary visuals are replaceable. A Web Audio state of `running` and a healthy internal PCM signal are observable, but neither proves that Windows speakers are audible or Firefox keeps sound playing in a background tab. Those remain explicit acceptance tests.
