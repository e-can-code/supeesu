# Quiet Hours — The Helm

A private, local-first experimental homepage: ancient observatory / living spacecraft.

## Start

From the folder containing `index.html` run:

    python -m http.server 8000

Open http://localhost:8000. The browser must load files from the local server, not `file://`.

## Navigation

- **Helm:** live clock, current activity, and next three activities.
- **Window / Star map:** week and day views, with all days aligned to the same time axis. Click a star for event details.
- **Today:** chronological list; step through weekdays.
- **Constellations:** repeated activities grouped together.
- **Crystal / Make room:** choose one-time or recurring. This opens the existing functional Quiet Hours workshop inside the scene.
- **Workshop:** original schedule editor and disruption planner, including priorities, move/split permissions, and recast proposals.

## Data and limitations

The original scheduling engine is preserved in `operations/`. The Helm and workshop share the same browser localStorage keys (`quiet-hours-schedule-v2` and `quiet-hours-planning-v2`) on the same origin. The helm reads the JSON defaults and browser edits. The workshop retains JSON import/export. If migrating from a different port or hostname, export your JSON from the previous app and import it into the workshop here.

The map is a time-aligned *star chart*, not a literal 3D game engine. No audio or third-party music is included. Fonts optionally load from Google Fonts, with local fallbacks; everything else runs offline. The animated environment respects reduced-motion preferences.
