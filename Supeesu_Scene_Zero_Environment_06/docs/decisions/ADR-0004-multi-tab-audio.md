# ADR-0004 — Exclusive soundscape ownership and honest autoplay states

**Status:** Design accepted; production implementation pending  
**Date:** 2026-11-09

## Context

A first-open daily sound rule must not start multiple overlapping tabs. Browsers may block audible autoplay, and tab visibility does not imply playback permission.

## Decision

- Only the tab holding exclusive audio ownership may operate the soundscape.
- Record daily startup as successful only after playback actually begins.
- Keep blocked attempts in a pending state until an eligible user gesture; avoid falsely recording success.
- Suspend hidden visual animation independently of audio. A persistent-sound preference may allow sound to continue in hidden tabs.
- Do not store user preferences or playback history from Time Laboratory simulations.

## Implementation status

An experimental Web Locks ownership probe with isolated fake-lock tests exists. No production autoplay, daily ledger, cross-browser fallback, or verified real-browser two-tab behavior exists yet.
