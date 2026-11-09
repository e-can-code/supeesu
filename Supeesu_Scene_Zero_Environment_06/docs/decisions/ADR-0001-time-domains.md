# ADR-0001 — Separate real, world, and session time

**Status:** Accepted for Foundation 01  
**Date:** 2026-11-09

## Context

Clock simulation must preview lighting and ecology without expiring countdowns, advancing music, or changing production daily-play eligibility. The local session day begins at 05:30 and may have a daylight-saving length other than 24 hours.

## Decision

- RealClock provides actual wall-clock instants. Real timers, media transport, and production session decisions use it.
- WorldClock provides seekable/rate-adjustable world instants derived from RealClock, without modifying the source.
- SessionClock is a derived calendar-day identifier. Production uses RealClock; laboratory preview uses WorldClock in a separate instance.
- Simulation state is ephemeral; the laboratory must never commit production audio ledger or preferences.
- Ecological dates currently advance at civil midnight. The production session day advances at 05:30 local time.

## Alternatives rejected

- Global replacement of `Date.now()`: creates cross-system side effects and untestable dependency paths.
- One accelerated universal clock: incorrectly accelerates timers and media.
- A day defined as an unchanging 86,400,000 ms interval: fails around daylight-saving transitions.

## Consequences

Clients receive explicit clock dependencies. Future monotonic elapsed-time support remains necessary to isolate simulation rate from system clock jumps. Browser timezone changes require an explicit product policy, not ad hoc patches.
