# Asset register — Environment 05

All packaged images and audio are **original technical placeholders**; no earlier user-uploaded music or third-party video is included. The staging ZIP is safe to share as project source subject to the project's eventual licensing decision. Artwork is designed for individual replacement without rewriting calendar rules.

| File or generated layer | Purpose | Status / provenance |
|---|---|---|
| `assets/ground.svg`, `assets/hills.svg` | Soil/landscape and distant three-quarter-view horizon | Original replaceable scene drawings from E03 |
| `assets/water.svg`, `assets/rim.svg` | Clipped pond water and stone banks | Original replaceable scene drawings from E03 |
| `assets/lilies.svg`, `assets/reeds.svg`, `assets/foreground.svg` | Water flowers, swaying plants, foreground | Original replaceable scene drawings from E03 |
| `assets/koi-amber.svg`, `assets/koi-pearl.svg`, `assets/koi-copper.svg` | Three independent fish sprites | Original replaceable scene drawings from E03 |
| `SkyRenderer` SVG nodes | Temporary moving sun, stars, clouds and authored sky palette; actual moon placement deferred | Generated runtime geometry, not ephemeris |
| `CalendarMarkers` SVG nodes | Growing tree, seven-day dots, 200/400-day bars, rain and rainbow; lunar phase discs not rendered | **Retained runtime diagnostic graphics**, intentionally removable |
| `audio/pond-water.wav` | Eight-second continuously looped environmental bed, 22,050Hz mono PCM | Original synthesized sample from E02, normalized in E04 to RMS ~0.170; browser gain 0.78 |
| `audio/pond-motif.wav` | Eight-second independent looping music placeholder | Original synthesized sample from E02, normalized in E04 to RMS ~0.170; browser gain 0.46 |
| `audio/splash.wav` | Short seeded/manual splash cue | Original synthesized noise transient, approximately 0.85s, peak-limited and level-adjusted in E04; browser gain 0.64 |
| Diagnostic chime | One short single-tone audibility probe | Generated inside the existing AudioContext after explicit user click; no new file |
| `dev/coverageScenarios.json` | 37 selected time/date and calendar visual cases | Developer-only data, not the event/date authority |
| `calendar/source/microseasons_first_200_days.original.json` | Original 29 authored microseason names, signatures, weights | Preserved unchanged; source design data, 203-versus-200 discrepancy open |
| `docs/living-pool-orrery-day.png`, `docs/living-pool-orrery-dusk.png` | Actual coordinator/renderer UI screenshots after tests | Offline Chromium embedded-asset render, not Firefox |
| `docs/living-pool-browser-render-probe.png`, `docs/living-pool-night-probe.png` | Standalone renderer captures | Offline Chromium module/render test, not final art |

`tools/generate_placeholder_audio.py` retains the initial synthesis recipe but **does not reproduce the newly normalized files exactly** without applying the documented RMS/peak normalization pass. A regeneration task remains open if byte-for-byte reproducibility is required.

**E05 asset pass:** No bundled audio or replaceable SVG source was added or removed. The independent 3D/orbital map remains an unprovided future asset/authority. The Time Laboratory now displays approximate Earth/Jade phase values as diagnostics; these are calculations, not images.

## Environment 06 addition
`scenes/living-pool/assets/water-drop.wav`: original synthesized, mono PCM 24 kHz, ~0.75 s. Technical placeholder for a soft water-on-water drop; no third-party recording. Listening approval pending.
