# ADR-0008 — Daily sound success and independent visibility

**Date:** 2026-11-09  
**Status:** Implemented as a staging baseline; target-browser QA pending.

## Context

A daily soundscape must begin on the first eligible open after the 05:30 local session boundary without duplicating audio across tabs. Browser autoplay can fail, and a hidden tab should not require continued graphics rendering. The laboratory's simulated World Clock must not modify actual production listening history.

## Decision

Production `DailyPlaybackPolicy` accepts only an injected real clock and storage adapter. It reads the current session's ID and records a successful playback only after the ambient media element's `play()` resolves and it is not paused. Failed autoplay leaves the session eligible; a user can retry by clicking a discreet sound control. An exclusive Web Lock is required; unsupported lock managers fail closed instead of risking duplicate sound.

Rendering and audio state respond to independent `visibilityPolicy` outputs. Hidden tabs suspend scene rendering. Ambient/music continue only with the explicit persistent-sound preference. Closing a tab releases media and the lock. Laboratory time seeking uses the production resolver but cannot touch production playback ledger or persistent-sound setting.

## Consequences and limits

The first visit can remain silent until an actual user gesture in browsers with audible-autoplay restrictions. Visible-but-unfocused second-monitor scenes continue animating. Audible splash events may be missed when background timers throttle; there is no catch-up burst after a long suspension. Multi-browser/multi-device sync, tab takeover on owner shutdown, and guaranteed background scheduling are not implemented.
