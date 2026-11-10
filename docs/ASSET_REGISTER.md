# Asset register

- CSS sky, architecture, water, tree: original code-generated placeholders, no third-party image assets; intended to be replaced.
- Synthetic ambience: original Web Audio buffer generated in browser; technical demonstration, not finished soundscape.
- `helm-legacy/helm.js`, `helm.css`, `schedule.json`: user-provided historical Quiet Hours source; retained for design provenance. Historical schedule is optional, not silently imported into personal records.
- No licensed commercial artwork or personal audio is bundled.

## WF02 replaceable viewpoint artwork
Seven original generated SVG technical placeholders in `assets/views/` (Atelier left/center/right; Window, Pool, Garden, Helm center). These are temporary diagrammatic compositions with no third-party art or license dependencies. Viewpoint asset paths are declared in `data/world.json`; final art may replace each independently.

## WF03
- `assets/views/helm-center.svg`: replaces the former Helm art with sky-only celestial placeholder. No Hermitage walls, ground, garden, or pond. Original authored SVG in project; fully replaceable.

## WF05 bundled sources
- `integrations/living-pool/`: original Environment 06 project including source assets, audio, calendar, tests and documentation. Source: user-provided archive.
- `recovered/quiet-hours/`: historical Quiet Hours Helm and operations planner. Source: user-provided archive. Not the current canonical data store.


## WF06 recovered Helm
`integrations/quiet-hours-helm/` contains the original user-provided Quiet Hours Helm HTML, CSS, JS, schedule defaults, and operations editor/planner. Only local storage keys and a storage-update listener were adapted. The original visual assets are CSS-generated and local.

## WF07 — Long Voyage
`integrations/quiet-hours-helm/long-voyage/index.html`: user-supplied original single-file Observatory artwork, SVG room and canvas-generated celestial bodies; no third-party media. CSS and JS adapters are separate files. `integrations/quiet-hours-helm/` retains the recovered Quiet Hours scheduler and its visualizations.
