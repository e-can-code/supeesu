# Supeesu — Scene Zero / Environment 06: Daily Home

Staging build based on Environment 05. Production homepage is untouched.

## Launch

Run `RUN_PREVIEW.bat` on Windows (or `python -m http.server 8166` from this folder).
Open `http://localhost:8166/scene/` for Home; `http://localhost:8166/scene/?lab` for the instrumented view; `http://localhost:8166/dev/` for the full Time Laboratory.

## Daily use

Type immediately to search Google. The upper dot changes the current query to DuckDuckGo; the lower dot restores Google. Enter searches; Ctrl+Enter uses the other engine; Escape clears. Ctrl+Shift+L toggles the scene laboratory. The small upper-right ornament does the same. The bottom-right controls manage audio, persistent playback, and the still-scene toggle.

## Important limitations

The page requests initial focus, but Firefox and new-tab extensions can override it. Validate with your chosen extension before production. Autoplay is subject to browser permissions. The water-droplet sound is an original synthesized placeholder, not a field recording. Nighttime illumination values are art-directed relative values, not measured screen output.

## Development

`npm test`, `npm run check`, `npm run assets`. Documentation is in `docs/`; approved nighttime curve in `shared/lighting/comfort-policy.json`. All existing ecological data is preserved.

## GitHub Pages

The staging scene is static-hostable. Publish the project folder as a Pages site or integrate its modules and asset paths into your existing repository, keeping relative paths intact. Do not overwrite the current root `index.html` until approved.
