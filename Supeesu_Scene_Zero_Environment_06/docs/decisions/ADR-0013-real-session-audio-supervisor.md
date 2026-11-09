# ADR-0013: Real-time daily sound supervision

**Status:** Accepted for Environment 05 · 2026-11-09

## Problem

Scene audio was only considered for automatic startup during initialization. An already-open tab would miss the 05:30 change. World time was intentionally separate from real session time, and must remain separate.

## Decision

Introduce `DailyAudioSupervisor` above the already-existing DailyPlaybackPolicy and audio engine. The supervisor consults the injected RealClock, evaluates at regular bounded intervals and on tab lifecycle resynchronization, performs one automatic attempt per session day, and records success only when the audio engine reports active playback. On failed autoplay, the session remains pending for explicit user interaction. If an active bed crosses the boundary, keep it playing and record the new session without a restart. Browser Web Locks continue to own the exclusive audio channel.

## Tradeoffs

Hidden-tab timer throttling can delay a boundary check. The check happens on the next timer wake, focus or page activation; autoplay permission is still controlled by the browser. A browser page cannot guarantee physical speaker audibility or sound after tab closure. Test-mode dry runs never modify persistent data.

## Evidence

`tests/dailyAudioSupervisor.test.js`, `tests/dailySessionPreview.test.js`, existing audio lock and policy tests; actual Windows Firefox overnight boundary remains a user acceptance test.
