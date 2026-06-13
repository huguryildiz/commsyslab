# DigiCommLab

**EE413 Interactive Digital Communications Lab** — a browser-only, interactive learning tool
covering sampling & quantization, digital modulation & detection (with MAP/ML), baseband
transmission & eye diagrams, and Huffman coding & entropy, plus an end-to-end link simulation.

## Develop

    npm install
    npm run dev      # start dev server
    npm test         # run unit tests (Vitest)
    npm run build    # type-check + production build to dist/
    npm run lint     # eslint

## Deploy

Pushing to the default branch builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable Pages -> "GitHub Actions" in the repo settings.
The Vite `base` is `./` (relative), so the app works under any Pages subpath.

## Architecture

- `src/lib/dsp` — pure, unit-tested DSP/math (no React).
- `src/lib/plot` — Canvas/SVG drawing primitives.
- `src/lib/sim` — simulation loop + bit sources for live demos.
- `src/components` — shared UI controls.
- `src/modules` — feature views (added per phase).

See `docs/superpowers/specs/2026-06-13-digicommlab-design.md` for the full design.
