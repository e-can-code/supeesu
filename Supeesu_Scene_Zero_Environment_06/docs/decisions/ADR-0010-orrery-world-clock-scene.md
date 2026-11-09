# ADR-0010 — The World Orrery controls only simulated World Clock

**Status:** Accepted for Environment 03.  
**Date:** 2026-11-09

## Problem

The Time Laboratory allowed numeric date seeking but was not an evocative, direct way to test the progression of real environmental visuals. The pond's top-down viewpoint also lacked sky, making changes in time of day harder to observe.

## Decision

Provide one composable 280×280 SVG instrument with three rings: 24-hour, seven-day, and 800-day ecology. The ring drag maps cumulative unwrapped pointer rotation to time offsets; key and wheel interactions use fixed scales. All operations call the existing `WorldClock.seek()` followed by `WorldClock.pause()`. LIVE returns to the actual clock; FLOW continues simulated time at 1×. No new source of time is created. The coordinator resets the splash scheduler after a seek to prevent catch-up sounds.

Reorient the Living Pool geometry so a visible 0–405px sky and distant landscape can sit behind the pool. `scene.json` controls layer ordering and assets. `environment.json` owns the authored sky palette knots. `EnvironmentResolver` computes sky state; `SkyRenderer` only draws it. The temporary stylized sun, crescent, stars, cloud shapes, and dashed path are **diagnostic motion cues**, not astronomical claims. Replaceable image-backed foreground layers remain independent.

## Risks and mitigations

- Daylight is an intentionally simplified 06:00–19:00 arc independent of latitude/season. Real solar geometry would be a later dedicated data contract.
- Large 800-day gestures can seek very far. The existing signed calendar cycles resolve directly, without iterative stepping or side effects.
- A sudden world seek must force visual environment recomputation even when time moves backward. The coordinator uses absolute difference and resets its cached environment timestamp.
- Clock changes cannot modify real timers, audio playback, daily ledger, or preference storage.
- The instrument is an optional UI. It must be removable without changing the environment resolver, pond renderer, or calendar.
