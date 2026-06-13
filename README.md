# DigiCommLab

**EE413 Interactive Digital Communications Lab** — a browser-only, interactive learning tool
covering sampling & quantization, digital modulation & detection (with MAP/ML), baseband
transmission & eye diagrams, and Huffman coding & entropy, plus an end-to-end link simulation.

**Live:** [digicommlab.vercel.app](https://digicommlab.vercel.app)

## Status

- ✅ **Sampling & Quantization** (CH7) — live, interactive (sampling theorem, aliasing, sinc
  reconstruction, PCM, SQNR, Web Audio playback).
- 🚧 **Modulation & Detection** (CH9) — DSP layer complete (constellations, AWGN, ML/MAP,
  theoretical + Monte-Carlo SER); interactive UI in progress.
- ⏳ Baseband & Eye Diagram (CH8), Huffman & Entropy (CH10), End-to-End Link — planned.

## Develop

    npm install
    npm run dev      # start dev server
    npm test         # run unit tests (Vitest)
    npm run build    # type-check + production build to dist/
    npm run lint     # eslint

## Deploy

Deployed via **Vercel** (git integration). Pushing to `master` publishes production at
[digicommlab.vercel.app](https://digicommlab.vercel.app); every branch / pull request gets an
automatic preview deployment. Vercel auto-detects the Vite preset (build `npm run build`, output
`dist`). The Vite `base` is `./` (relative), so assets resolve at any path.

## Architecture

- `src/lib/dsp` — pure, unit-tested DSP/math (no React).
- `src/lib/plot` — Canvas/SVG drawing primitives.
- `src/lib/sim` — simulation loop + bit sources for live demos.
- `src/components` — shared UI controls.
- `src/modules` — feature views (added per phase).

See `docs/superpowers/specs/2026-06-13-digicommlab-design.md` for the full design.
