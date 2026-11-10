# ADR-0011 — Accelerated World Clock with Independent Animation Time

**Status:** Accepted for Environment 04 · 2026-11-09.

## Context

The original FLOW action resumed at 1×, making visual time-of-day and season evolution difficult to inspect. Scaling all animation timestamps by World Clock rate made fish visibly strobe, especially at 3,600× or 86,400×. Skipping historical intervals must not play a backlog of splashes.

## Decision

Use 3,600× as the default FLOW rate, with explicit 1×, 60× and 86,400× alternatives. FLOW only alters the simulated World Clock. Continuous fish swimming and foliage swaying sample actual elapsed real time, while fish *activity intensity*, lighting, palette, sky placement and environment use the simulated world instant. Retain seeded world-date splash schedules. At accelerated rates, detect bounded crossed splash events to show temporary real-time ripples; throttle optional splash audio and never replay backlogs after direct seeks.

## Consequences

A full world day can pass in 24 real seconds at the default rate. Fish motion remains comfortable to watch. Fish physical positions are no longer invariant for repeated historical world instants because real animation time drives orbit phase; the earlier deterministic-position convention is superseded **for continuous visual fish movement only**. Calendar outputs and seeded discrete events remain reproducible. Physics-like animal histories, if later required, need a distinct persisted or seeded behavioral model.
