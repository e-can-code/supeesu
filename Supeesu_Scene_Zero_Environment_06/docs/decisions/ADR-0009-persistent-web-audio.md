# ADR-0009 — Continuous background audio uses Web Audio

**Status:** Accepted for Environment 03, pending target Firefox acceptance.  
**Date:** 2026-11-09  
**Problem:** Scene Zero's previous HTMLAudio loop was reported to stop on switching to another tab, even though the separate Foundation laboratory oscillator had persisted. In Environment 02, persistence also defaulted to off.

## Decision

The production staging scene uses `PondWebAudioSoundscape` when `AudioContext` is available. A single context decodes short ambient, music and splash WAV files, launches two separately controlled looping buffer sources, and plays short overlapping splash one-shots. The same exclusive Web Lock mechanism as the Foundation test tone continues to coordinate multiple tabs. The original HTMLAudio implementation remains as a feature-detection fallback.

The persistent-sound preference now defaults to `true` **when no earlier value is saved**. An explicit stored `false` remains authoritative. Simulated laboratory state cannot save a preference. The renderer's visibility policy never suspends audio when persistence is enabled. With persistence disabled, hidden-tab playback suspends and resumes on visibility change; source position is retained. The mixer reports the Web Audio context state to a small diagnostic indicator. Auto-resume attempts have a bounded timeout, preventing indefinite initialization when Firefox blocks autoplay.

The real 05:30 session controller and verified-playback ledger remain separate from World Clock seek/speed. The ledger is only written when audio starts in a running context, not when an attempt is blocked. A successful stream can still be inaudible because the user muted the tab or hardware; software does not measure actual speaker output.

## Consequences and constraints

- Small short samples are decoded into memory; the approach does not yet support streaming two-hour recordings. Extended media will require a streaming source pipeline feeding the same mixer, not a two-hour decoded buffer.
- Web Audio is expected to behave like the tone in hidden tabs, but browser/OS suspension cannot be overruled and target Firefox still requires a real acceptance test.
- Background timed splash cues can be skipped when the visual loop suspends; the persistent continuous beds are the behavior explicitly addressed here.
- Web Locks availability is a requirement for exclusive playback; without it, startup fails closed rather than allowing duplicate music across tabs.
