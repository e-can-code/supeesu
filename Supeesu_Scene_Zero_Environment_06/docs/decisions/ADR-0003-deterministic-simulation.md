# ADR-0003 — Reconstruct state; do not replay history on clock seeks

**Status:** Accepted design contract; event system not yet implemented  
**Date:** 2026-11-09

## Context

The Time Laboratory must jump among dates to verify calendar and environmental changes. A forward seek must not play months of missed audio events, and rewinding must not reroll fish splashes at the same date.

## Decision

- Calendar and future environment resolutions are pure queries of time plus explicit configuration.
- Seeded event schedules derive from scene ID, local date/time bucket, and configuration version.
- Events may play only during ordinary forward progression through their times, not as catch-up on seeks.
- A sunset-to-night period receives a 50% increase to splash likelihood. Window and transition shape belong to the scene response profile, not the universal calendar.
- Simulation event previews cannot alter actual playback history or production preferences.

## Consequences

Future implementations need an explicit distinction between `seek` and natural time progression, stable event IDs, bounded event-generation windows, and property-level provenance for environment modifiers.
