# ADR-0005 — Continuous bidirectional ecological cycles

**Status:** Accepted · 2026-11-09  
**Supersedes:** Pre-epoch Prologue policy in ADR-0002 only

## Context

Foundation 01 treated dates before the January 29, 2027 reference epoch as a Prologue with no active ecological season or rhythms. This contradicted the intended model: the epoch anchors the counting system but does not create the world. On November 9, 2026, the intended state is Deep Renewal in the preceding 800-day cycle.

## Decision

1. The ecological calendar applies to all supported civil dates, including those before the anchor.
2. `dayOffsetFromEpoch` is a signed count of local civil dates from January 29, 2027. The anchor date has offset 0.
3. `cycleIndex = floor(offset / 800)` identifies cycles relative to the anchor: -1 is the preceding cycle, 0 contains the anchor, +1 the following cycle. There is no absolute first cycle.
4. `ecology.day = floorMod(offset, 800) + 1` yields days 1–800 for all signed offsets. Season order and 100-day durations remain unchanged.
5. The 200-day, 400-day, and seven-day rhythms also use floor modulo for signed offsets. The seven-day phase stays continuous across 800-day boundaries; its alignment does not reset with the ecological cycle.
6. Annual Gregorian events (including January 29 Great Convergence) are evaluated independently from the 800-day ecological cycle and may occur before or after the reference anchor.
7. Authored microseason profile IDs remain restricted to the original 200-day source coverage after the anchor; **no authored profile is claimed** for pre-epoch dates or later unapproved periods. Mathematical seven-day phases remain available everywhere.
8. The actual 05:30 session-day boundary and real-time playback policy are unaffected. Time Laboratory seeking must never write production preferences or playback ledgers.

## Examples and acceptance cases

| Local civil date | Signed offset | Relative cycle | Ecology day | Season | Season day |
|---|---:|---:|---:|---|---:|
| 2026-11-09 | -81 | -1 | 720 | Deep Renewal | 20 |
| 2027-01-28 | -1 | -1 | 800 | Deep Renewal | 100 |
| 2027-01-29 | 0 | 0 | 1 | First Stirring | 1 |
| 2029-04-08 | 800 | 1 | 1 | First Stirring | 1 |

## Consequences

- Removes the Prologue conditional from runtime and Time Laboratory.
- Changes the calendar data contract from `preEpoch: prologue` to `preEpoch: continuous-cycle` in both JSON and schema; configuration still reports schemaVersion 1 because this is the first pre-production foundation, but consumers using the old policy must update together.
- Past and future dates are reconstructable without replaying history or mutating state.
- Historical narrative, the degree of true recurrence of the entire combined seven-day/800-day environment, and microseason authored-profile policy remain open design questions.
