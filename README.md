<!-- markdownlint-disable MD033 -->
<!-- Inline HTML is intentional: centered hero header and badge row. -->

<p align="center">
  <img src="public/icon.svg" alt="CommSysLab logo" width="120" height="120">
</p>

<h1 align="center">CommSysLab</h1>

<p align="center">
  <strong>Interactive Communication Systems Lab</strong><br>
  <sub>A browser-native simulation environment for communication theory — move a control, watch the math resolve into a signal.</sub>
</p>

<p align="center">
  <a href="https://commsyslab.vercel.app"><img src="https://img.shields.io/badge/commsyslab.vercel.app-0f172a?style=for-the-badge&logo=vercel&logoColor=white" alt="commsyslab.vercel.app"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/React%2018-0b1220?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-0b1220?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite%205-0b1220?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite 5">
  <img src="https://img.shields.io/badge/KaTeX-0b1220?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX">
  <img src="https://img.shields.io/badge/Vitest-0b1220?style=for-the-badge&logo=vitest&logoColor=6E9F18" alt="Vitest">
</p>

---

## Overview

**CommSysLab** is a browser-only simulation lab that turns textbook figures into live instruments. It covers the full communication signal chain — Fourier analysis, analog AM/FM modulation, random processes, sampling and waveform coding, source coding, digital modulation and optimum detection, baseband pulse shaping, channel coding, wireless links, and an end-to-end system — all runnable without install or sign-in.

Every module executes its DSP client-side and re-renders as controls change. Aliasing appears the moment Nyquist is crossed. An eye diagram closes as ISI builds. A fading channel reshapes the BER curve in real time.

Simulation math, notation, and parameter ranges follow **Proakis & Salehi, _Fundamentals of Communication Systems_**. The module-to-chapter mapping is in [`docs/book-reference.md`](docs/book-reference.md).

---

## Why CommSysLab

Communication theory is hard to internalize from static equations. The intuition is in the motion — how a constellation scatters under noise, how a Viterbi decoder unwinds an error burst, how OFDM handles multipath. CommSysLab makes that motion the primary interface.

- **Zero friction.** Open the URL and explore. No account, no install, no server.
- **Direct manipulation.** Every parameter is a live control; every output updates immediately.
- **Textbook-faithful math.** DSP and theory panels track the reference book exactly.
- **Separated core.** Pure TypeScript DSP functions in `src/lib/dsp`, decoupled from UI and independently tested.
- **Audio where it matters.** Web Audio playback exposes aliasing and quantization artifacts as sound.
- **Instrument-grade UI.** Dark glassmorphism, neon signal palette, light/dark theme tokens.

---

## Modules

All twelve modules are live and follow book-chapter order.

| # | Module | What it covers |
|---|--------|----------------|
| 01 | **Signals & Spectra** | Basic signals, convolution, Fourier series synthesis, FFT & spectra, transform pairs, filter design (LTI · realizable · studio with audio), Hilbert transform, bandpass & I/Q representation |
| 02 | **Amplitude Modulation (AM)** | DSB-SC, conventional AM, SSB & VSB, power/efficiency; power-law, switching, balanced & ring modulators with circuit block diagrams; envelope & coherent demodulators; FDM channel stacking; superheterodyne receiver frequency plan |
| 03 | **Angle Modulation (FM/PM)** | FM & PM waveforms, instantaneous frequency, Bessel sidebands, Carson bandwidth, discriminator detection |
| 04 | **Random Processes** | Ensembles, autocorrelation, ergodicity, PSD, LTI filtering of random processes |
| 05 | **Noise in Analog Systems** | Output SNR, demodulation gain, FM threshold, pre/de-emphasis for DSB-SC / AM / FM |
| 06 | **Analog-to-Digital Conversion** | Nyquist theorem, aliasing, PCM coding, scalar quantization, SQNR, delta modulation, audio playback |
| 07 | **Digital Modulation & Detection** | M-ary constellations (PSK/QAM/ASK/FSK), AWGN, ML/MAP decision regions, SER curves, optimum receiver |
| 08 | **Baseband Transmission & ISI** | Raised-cosine pulse shaping, matched filtering, ISI, eye diagrams, ZF/MMSE equalization |
| 09 | **Information Theory** | Entropy, Kraft inequality, Huffman coding, Lempel-Ziv compression, source-coding efficiency |
| 10 | **Channel Capacity & Coding** | Mutual information, capacity, block/conv/cyclic/BCH/Reed-Solomon/concatenated codes, Viterbi |
| 11 | **Wireless Communications** | Rayleigh/Rician fading, Doppler, BER, DS-SS, FHSS, CDMA, OFDM, RAKE, MIMO, CPM, link budget |
| 12 | **End-to-End Link** | Full chain: source → quantizer → modulation → channel → detection → sink with stage inspection |

---

## Signal Chain

Each module is a block in a communication link. The landing page renders this chain interactively; the module launcher lists every lab in book-chapter order.

```text
source → sampling → source coding → modulation → channel → detection → receiver
           │              │               │            │          │
      Sampling &     Information     Modulation      AWGN /    ML/MAP
      Quantization     Theory        & Detection    fading    detector
```

---

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18 · TypeScript strict · Vite 5 · React Router v6 |
| Math typesetting | KaTeX |
| Audio | Web Audio API |
| Rendering | Custom Canvas + SVG plotting primitives |
| DSP core | Pure TypeScript in `src/lib/dsp` (54 modules, no framework deps) |
| Styling | CSS design tokens · glassmorphism · neon signal palette |
| Testing | Vitest · Testing Library · jsdom (80+ test suites) |
| Tooling | ESLint · Prettier · `tsc --noEmit` |
| Deployment | Vercel static SPA |

The architecture enforces a hard boundary between math and UI. All DSP, coding, channel, and simulation logic lives in pure functions under `src/lib/dsp` and `src/lib/sim`, independently testable without React.

---

## Design System

A single visual language throughout: dark glassmorphism with restrained neon glow, driven by CSS custom properties in [`src/theme/tokens.css`](src/theme/tokens.css).

- **Tokens only.** Colors, spacing, radii, blur, and motion are CSS variables — never hardcoded values.
- **Typography.** `Newsreader` (editorial serif) for headings and body; `IBM Plex Mono` for numerics, formulas, and code.
- **Glass panels.** Translucent surfaces, backdrop blur, hairline borders, subtle hover glow.
- **Signal palette.** Green input · orange system · blue-violet output · pink marker.
- **Shared primitives.** Sliders, selects, panels, KaTeX formulas, readouts, segmented controls, toggles.

---

## Project Structure

```text
src/
├── modules/              One directory per communication-theory lab
│   ├── fourier/          Signals, convolution, Fourier series/transform, filters, Hilbert, bandpass & I/Q
│   ├── analog/           AM/FM/PM modulation and analog receivers
│   ├── random-process/   Ensembles, autocorrelation, PSD, LTI filtering
│   ├── sampling-quantization/  Nyquist, aliasing, PCM, SQNR
│   ├── deltamod/         Delta modulation and adaptive waveform coding
│   ├── analog-noise/     Analog noise performance and SNR comparisons
│   ├── infotheory/       Entropy, prefix codes, Huffman, LZ78
│   ├── modulation/       Constellations, AWGN, ML/MAP, optimum receiver
│   ├── baseband/         Pulse shaping, matched filter, eye, equalization
│   ├── channel-coding/   Capacity, block/conv/cyclic/BCH/RS/concatenated
│   ├── wireless/         Fading, OFDM, link budget, RAKE, MIMO, CDMA, CPM
│   └── end-to-end/       Source-to-sink full-chain inspection
├── lib/
│   ├── dsp/              Pure DSP, probability, channel, and coding functions
│   ├── plot/             Canvas/SVG drawing primitives and color helpers
│   ├── sim/              Simulation loop, sources, and link helpers
│   └── audio/            Web Audio playback helpers
├── components/           Shared UI controls and display components
├── pages/                Landing page, module launcher, and page shells
├── theme/                Design tokens and global styles
├── i18n/                 User-facing string catalogs
└── App.tsx               Router, nav shell, theme toggle

tests/                    Vitest unit and component suites
docs/book-reference.md    Module-to-chapter map
refs/                     Reference PDFs (git-ignored)
```

---

## Quick Start

Requires Node.js 18+.

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Type-check + production build → dist/
npm run preview   # Preview the production build
npm test          # Run all unit and component tests
npm run lint      # ESLint with zero warnings
npm run format    # Prettier
```

---

## Routes

React Router v6 with hash routing — no server rewrites needed.

```text
/                      Landing page
/start                 Module launcher
/fourier               Signals & Spectra
/analog                Amplitude Modulation (AM)
/analog-fm             Angle Modulation (FM/PM)
/random-process        Random Processes
/analog-noise          Noise in Analog Systems
/sampling              Analog-to-Digital Conversion (Sampling, Quantization & Delta Mod.)
/delta-modulation      → redirects to /sampling
/modulation            Digital Modulation & Detection
/information-theory    Information Theory
/baseband              Baseband Transmission & ISI
/channel-coding        Channel Capacity & Coding
/wireless              Wireless Communications
/end-to-end            End-to-End Link
```

---

## Reference

Simulation math and notation track the textbook. Chapter-by-chapter coverage and DSP-file cross-references are in [`docs/book-reference.md`](docs/book-reference.md).

> Proakis, J. G., & Salehi, M. (2014). _Fundamentals of Communication Systems_ (2nd ed., Global ed.). Pearson. ISBN 978-1292015682.

---

## Deployment

CommSysLab ships as a static SPA on **Vercel** via git integration. Vite preset (`npm run build`, output `dist/`) with a relative `base` so assets resolve from any deployed path.

---

<p align="center">
  <strong>CommSysLab</strong> · Interactive Communication Systems Lab<br>
  <sub>📡 Communication theory — live, manipulable, and in the browser.</sub>
</p>
