# ADR-0006 — Annual convergence and ecological seasons remain independent

**Status:** Recorded from existing calendar contracts (2026-11-09)

## Context

The Great Convergence is defined as an annual Gregorian January 29 event. Ecological seasons occupy eight consecutive 100-day periods in an independently repeating 800-day cycle anchored to January 29, 2027. A January 29 in a different year need not begin First Stirring.

## Decision

Preserve the already-defined independent schedules. Resolve season and annual event separately, and combine them later in the scene environment resolver. The annual event does not reset the ecological cycle. The current calendar yields January 29, 2026 = Copper Renewal; January 29, 2027 = First Stirring; January 29, 2028 = High Radiance.

## Consequences

Each annual convergence may have a different seasonal character. The 2027 convergence is also the cycle-0 reference epoch. Calendar JSON and engine calculations need no changes; a new diagnostic scenario verifies the design. How the Living Pool visually and acoustically interprets each combination remains to be authored.

## Alternatives not adopted

Force Great Convergence to coincide with Copper Renewal or First Stirring every year. This would require changing the annual event, season length, or cycle policy, contrary to the existing continuous 800-day calendar.
