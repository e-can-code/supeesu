# ADR-0002 — Preserve original calendar designs and expose incomplete coverage

**Status:** Partially superseded by ADR-0005 (pre-epoch prologue rule only); other decisions remain active  
**Date:** 2026-11-09

## Context

Supeesu previously defined eight named 100-day seasons with ecological targets, a seven-day microseason plan for the first 200 days, 200/400/800-day rhythms, a 36-day candidate jade moon, and a pre-epoch prologue. Replacing this with placeholder season names would silently discard earlier design work.

The source lists 29 full weeks (203 days) while declaring 200 days of coverage. Also, 800 is not divisible by seven.

## Decision

- Preserve source files unchanged in `calendar/source/`.
- Use `calendar/calendar.json` as the sole active calendar configuration, with machine-readable schema.
- Carry season names and targets forward exactly from the source, marked as design values.
- Advance the seven-day phase continuously from the epoch without resetting at 800 days in the foundation model.
- Assign authored profile IDs only through ecological day 200. Days 201 onward receive no authored profile. Preserve the three extra authored source days for reconciliation.
- Treat dates before January 29, 2027 as prologue, not a negative-index ecological season.
- Keep July 29 solely as a development-only diagnostic date. No canonical July convergence date is asserted.
- Require an independently verified lunar ephemeris before promising a real-moon phase.

## Alternatives rejected

- Resetting microseason phase every 800 days: introduces a discontinuity and changes the seven-day rhythm.
- Cycling the first 29 profiles indefinitely: invents unapproved ecology for the remainder of the 800-day cycle.
- Dropping extra source days: destroys authored history.

## Follow-up decisions

- Authoritative treatment of profile 29's three excess days.
- Full 800-day ecological profile coverage.
- Any additional convergence dates and lunar phase anchors.

## Amendment record — 2026-11-09

The earlier prologue decision was superseded by ADR-0005. The prior text is retained to preserve the decision history. All original calendar source files remain unchanged.
