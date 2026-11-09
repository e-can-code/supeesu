# ADR-0007 — Scene data and deterministic environmental composition

**Date:** 2026-11-09  
**Status:** Accepted for Environment 02; artistic treatment provisional.

## Context

The Living Pool must respond to independent ecological rhythms and author-visible clock changes without becoming coupled to particular temporary images. Annual convergence is deliberately independent of the eight ecological seasons, so the number of possible interactions grows over time.

## Decision

Store general calendar arithmetic in `calendar/calendar.json`, Living Pool response values in `scenes/living-pool/environment.json`, and image/behavior assets in `scenes/living-pool/scene.json`. Pure environment resolution uses a continuous daily curve, existing ecological season targets, separately declared periodic influences, and sorted, named event treatments. The result reports the resulting values and their sources; renderers and fish behaviors never query the calendar directly.

For verification, the first January 29 convergence has an explicitly bounded gold overlay; July's existing provisional test date receives an obvious noncanonical recolor. These are diagnostic compositions, not final Great Convergence artwork. Every important intersection will require deliberate artistic review before public release.

## Alternatives rejected

- Hardcode color/day logic inside renderer: tightly couples artwork and chronology.
- Bake one composite video for each season: prevents independent layering and deterministic simulation.
- Allow unrestricted additive event effects: enables unpleasant lighting and clashes at special dates.

## Consequences

The same resolver works for real-world and simulated time. Each subsequent scene defines its own response profile without copying the ecological calendar. The initial scene remains visually rudimentary until asset replacement and composition approvals occur.
