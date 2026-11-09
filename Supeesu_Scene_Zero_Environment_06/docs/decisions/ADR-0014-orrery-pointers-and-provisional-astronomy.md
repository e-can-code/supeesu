# ADR-0014: Reliable time instrument and deferred orbital positioning

**Status:** Accepted for Environment 05 · 2026-11-09

## Problem

Pointer release could be lost while dragging the mechanical World Orrery, leaving controls apparently unusable. Approximate moon phase discs were drawn directly in the sky even though the universe map, positions and orbits had not been designed. A whole-scene tint muddied night colors.

## Decision

Capture drag motion and release at window scope for the duration of each drag, with cancellation on blur. Preserve always-mounted, visible FLOW and speed controls. Remove provisional lunar discs from scene rendering while preserving independent phase values in the environment and lab. Keep the temporary authored sun path, separately color the sky, ground and water, and prohibit a single full-frame night-color wash.

## Tradeoffs

The current sun arc is not an ephemeris, and the resulting warmth/daylight curves are diagnostic rather than approved world lighting. Correct moonrise, geometry and camera movement require future map inputs. The code does not fabricate these inputs.

## Evidence

`tests/browser_full_scene_probe.py`, `tests/orreryAndSky.test.js`, environment schema and pixel-difference renderer checks; target Firefox pointer behavior remains to be verified.
