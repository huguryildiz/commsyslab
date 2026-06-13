<!-- markdownlint-disable MD033 -->
<!-- Inline HTML is intentional: it powers the centered hero header and badge row. -->

<h1 align="center">CommSysLab</h1>

<p align="center">
  <strong>Interactive Communication Systems Lab</strong><br>
  <sub>A browser-native lab for sampling, modulation, detection, and information theory — every concept you can move, hear, and see.</sub>
</p>

<p align="center">
  <a href="https://commsyslab.vercel.app"><img src="https://img.shields.io/badge/commsyslab.vercel.app-0f172a?style=for-the-badge&logo=vercel&logoColor=white" alt="commsyslab.vercel.app"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/React%2018-0b1220?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-0b1220?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-0b1220?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite">
  <img src="https://img.shields.io/badge/KaTeX-0b1220?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX">
  <img src="https://img.shields.io/badge/Vitest-0b1220?style=for-the-badge&logo=vitest&logoColor=6E9F18" alt="Vitest">
</p>

<br>

<p align="center">
  <em>🎚️ Drag a slider, watch the spectrum fold. Push SNR, watch the constellation scatter. 📡</em>
</p>

---

## 🎯 Overview

**CommSysLab** is a browser-only learning lab for communication systems. It turns the static
figures of a textbook into live, manipulable instruments: sampling and aliasing, PCM and SQNR,
digital modulation with ML/MAP detection, baseband pulse shaping and eye diagrams, and the
information-theory backbone — entropy, prefix codes, Huffman, Lempel–Ziv, and channel capacity.

Every module runs entirely in the browser. There is no backend, no account, and no install —
the DSP executes client-side and re-renders as you move a control. Students change a parameter
and watch the consequence propagate through the signal chain in real time.

The simulation logic follows **Proakis & Salehi, _Communication Systems Engineering_** — formulas,
parameter ranges, notation, and terminology are kept consistent with the reference text rather
than improvised.

---

## ✨ Why CommSysLab

Communication theory is hard to internalize from equations and frozen plots. The intuition lives
in the _motion_ — how aliasing appears as you cross Nyquist, how the constellation blooms as noise
rises, how the eye closes under ISI. CommSysLab makes that motion the primary interface.

- ⚡ **Zero-friction** — open a URL and you're inside the lab. No signup, no install, no setup.
- 🎛️ **Direct manipulation** — every parameter is a live control; plots recompute on the fly.
- 🔊 **Multi-sensory** — Web Audio playback lets you _hear_ aliasing and quantization, not just see it.
- 📐 **Textbook-faithful** — DSP and formulas align with Proakis & Salehi; no hand-waved math.
- 🧪 **Tested DSP core** — the math lives in pure, unit-tested functions, fully decoupled from the UI.
- 🌗 **Premium instrument UI** — dark glassmorphism with neon-glow accents, light theme included.

---

## 🚀 Core Modules

### 🎚️ Sampling & Quantization · _live_

The sampling theorem made tangible. Move the sampling rate across Nyquist and watch the spectrum
fold; switch between sinc and zero-order-hold reconstruction; build a PCM bitstream and read SQNR
as you change bit depth. Web Audio playback turns aliasing and quantization noise into sound.

### 📡 Modulation & Detection · _live_

Constellation-level intuition for digital modulation. Inspect signal sets, inject AWGN at a chosen
SNR, and watch optimal **ML / MAP** detection draw decision regions. Theoretical symbol-error-rate
curves run alongside live Monte-Carlo simulation, so analysis and experiment sit side by side.

### 🔣 Information Theory · _live_

The source-coding and capacity backbone in one workspace: entropy and self-information, prefix
codes and the **Kraft inequality**, **Huffman** coding, **Lempel–Ziv (LZ78)** universal coding,
and **channel capacity**. Feed it a source and watch optimal code lengths and rates fall out.

### 〰️ Baseband & Eye Diagram · _planned_

Nyquist pulse shaping, intersymbol interference, and the eye diagram for bandlimited channels —
matched filtering and equalization, with the eye opening and closing as the channel changes.

### 🔗 End-to-End Link · _planned_

The whole chain in one view — source → sampling → source coding → modulation → channel → detection
→ receiver — so each block's effect on the final link can be traced from end to end.

---

## 🧭 The Signal Chain

CommSysLab is organized around one idea: every module is a block in a single communication link.

```text
  source ─▶ sampling ─▶ source coding ─▶ modulation ─▶ channel ─▶ detection ─▶ receiver
              │              │               │            │           │
        ┌─────┴────┐  ┌──────┴──────┐  ┌─────┴────┐  ┌────┴───┐  ┌────┴─────┐
        │ Sampling │  │ Information │  │Modulation│  │  AWGN  │  │  ML/MAP  │
        │  & Quant │  │   Theory   │  │ & Detect │  │ channel│  │ detector │
        └──────────┘  └────────────┘  └──────────┘  └────────┘  └──────────┘
```

The landing page renders this chain interactively; each block links straight into its module.

---

## 🏗️ Technical Architecture

| Layer | Stack |
| --- | --- |
| **Frontend** | React 18 · TypeScript (strict) · Vite · React Router v6 (HashRouter) |
| **Math typesetting** | KaTeX |
| **Audio** | Web Audio API — playback of sampled / quantized signals |
| **Rendering** | Custom Canvas + SVG plotting primitives (no chart library) |
| **DSP core** | Pure, framework-free TypeScript in `src/lib/dsp` |
| **Styling** | CSS design tokens — dark glassmorphism + neon glow, light theme |
| **Testing** | Vitest · Testing Library · jsdom |
| **Tooling** | ESLint · Prettier · `tsc --noEmit` |
| **Deployment** | Vercel (static SPA, relative `base`) |

### System shape

```text
┌────────────────────────────────────────────┐
│              React SPA (Vite)              │
│                                            │
│   ┌──────────┐  ┌───────────┐  ┌────────┐  │
│   │ Landing  │  │  Module    │ │  Theme │  │
│   │  + chain │  │  views     │ │ toggle │  │
│   └────┬─────┘  └─────┬──────┘ └────────┘  │
│        └──────────────┤                    │
│                       ▼                    │
│        ┌──────────┬──────────┬─────────┐   │
│        │ lib/dsp  │ lib/plot │ lib/sim │   │
│        │ (pure)   │ (canvas) │ (loop)  │   │
│        └──────────┴──────────┴─────────┘   │
│                       │                    │
│                  lib/audio (Web Audio)     │
└────────────────────────────────────────────┘
            100% client-side · no backend
```

The architecture keeps a hard line between **math and UI**: all DSP lives in pure functions under
`src/lib/dsp`, free of React, so it can be unit-tested in isolation and reused across modules.
Module views compose those functions with shared UI controls and Canvas/SVG plot primitives.

---

## 🎨 Design System

CommSysLab follows a single visual language — dark **glassmorphism** with restrained **neon glow**
accents — driven entirely from design tokens. Nothing hard-codes a hex or pixel value.

- 🎨 **Tokens first** — colors, spacing, radii, and fonts come from `src/theme/tokens.css`.
- 🔤 **Editorial type trio** — `Fraunces` (display serif) · `IBM Plex Sans` (UI) · `IBM Plex Mono` (numerics & formulas).
- 🪟 **Glass panels** — translucent surfaces, backdrop blur, hairline borders, glow on hover.
- 🟢 **Signal palette** — green input · orange system · blue-violet output · pink cursor.
- 🌗 **Dual theme** — dark by default, light via `data-theme`; both resolve from the same tokens.

---

## 📁 Project Structure

```text
src/
├── modules/                 Feature modules (one per signal-chain block)
│   ├── sampling-quantization/   Sampling theorem, aliasing, PCM, SQNR
│   ├── modulation/              Constellations, AWGN, ML/MAP, SER
│   ├── infotheory/              Entropy, Kraft, Huffman, LZ78, capacity
│   └── baseband/                Pulse shaping, eye diagram, equalization
├── lib/
│   ├── dsp/                 Pure, unit-tested DSP (fft, awgn, huffman, ser, …)
│   ├── plot/               Canvas/SVG drawing primitives + color helpers
│   ├── sim/                Simulation loop + bit/symbol sources
│   └── audio/              Web Audio playback for sampled signals
├── components/             Shared UI — Slider, Select, Panel, Formula, TheoryBox…
├── pages/
│   └── landing/            Hero, module bento grid, interactive signal chain + viz
├── theme/                  Design tokens + global styles
├── i18n/                   String catalog
├── test/                   Test setup
└── App.tsx                 Router + nav shell

tests/                      Vitest unit/component suites
docs/book-reference.md      Module ↔ textbook chapter/section map
refs/                       Reference texts (git-ignored)
```

---

## ⚡ Quick Start

### 📋 Prerequisites

- Node.js 18+

### ▶️ Run

```bash
npm install
npm run dev          # Development server — localhost:5173
npm run build        # Type-check (tsc --noEmit) + production build to dist/
npm run preview      # Preview the production build
npm test             # Unit + component tests (Vitest)
npm run lint         # ESLint (zero warnings allowed)
npm run format       # Prettier
```

---

## 🔗 Routes

CommSysLab is a single-page app using React Router v6 with hash routing, so it works at any path
without server rewrites.

```text
/                      →  Landing — interactive signal chain + module bento
/sampling              →  Sampling & Quantization
/modulation            →  Modulation & Detection
/information-theory     →  Information Theory
/baseband              →  Baseband & Eye Diagram  (planned)
/end-to-end            →  End-to-End Link         (planned)
```

---

## 📚 Reference

Simulation math, parameter ranges, and notation track the course reference text. The mapping from
each module to its chapter and section lives in [`docs/book-reference.md`](docs/book-reference.md).

> **Textbook:** Proakis & Salehi, _Communication Systems Engineering_.

---

## 🚢 Deployment

CommSysLab ships as a static SPA on **Vercel** via git integration. Pushing to `master` publishes
production at [commsyslab.vercel.app](https://commsyslab.vercel.app); every branch and pull request
gets an automatic preview deployment. Vercel auto-detects the Vite preset (build `npm run build`,
output `dist`), and the Vite `base` is relative (`./`) so assets resolve at any path.

---

<p align="center">
  ✨ <strong>CommSysLab</strong> · Interactive Communication Systems Lab ✨<br>
  <sub>📡 Built so communication theory can be moved, heard, and seen. 📡</sub>
</p>
