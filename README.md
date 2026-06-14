<!-- markdownlint-disable MD033 -->
<!-- Inline HTML is intentional: it powers the centered hero header and badge row. -->

<h1 align="center">CommSysLab</h1>

<p align="center">
  <strong>Interactive Communication Systems Lab</strong><br>
  <sub>✨ A browser-native lab for communication theory: move a control, watch the math become a signal.</sub>
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

<br>

<p align="center">
  <em>🎚️ Drag a slider, watch the spectrum fold. Raise SNR, watch decisions snap into place. 📡</em>
</p>

---

## ✨ Overview

**CommSysLab** is a browser-only learning lab for communication systems. It turns textbook
figures into live, manipulable instruments spanning the full signal chain: Fourier analysis,
analog AM/FM, random processes and noise, sampling and waveform coding, source coding,
digital modulation and optimum detection, baseband transmission, channel coding, wireless
links, and an end-to-end communication link.

Every module runs entirely in the browser. There is no backend, no account, and no install.
The DSP executes client-side and re-renders as controls move, so students can change a
parameter and immediately see how the signal, spectrum, detector, or error metric responds.

The simulation logic follows **Proakis & Salehi, _Fundamentals of Communication Systems_**.
Formulas, parameter ranges, notation, and terminology are kept aligned with the reference
text; the module-to-chapter map lives in [`docs/book-reference.md`](docs/book-reference.md).

---

## 💎 Why CommSysLab

Communication theory is difficult to internalize from equations and frozen plots. The
intuition lives in the motion: how aliasing appears after Nyquist is crossed, how an eye
diagram closes under ISI, how a fading channel reshapes BER, or how a code gains distance
from parity structure. CommSysLab makes that motion the primary interface.

- ⚡ **Zero friction** — open the URL and start exploring; no signup, install, or backend.
- 🎛️ **Direct manipulation** — every important parameter is a live control.
- 📐 **Textbook-faithful math** — DSP and explanations track the reference book.
- 🧪 **Pure DSP core** — reusable TypeScript functions under `src/lib/dsp`, separated from UI.
- 🔊 **Audio where it helps** — Web Audio playback exposes aliasing and quantization artifacts.
- 🌗 **Instrument-style UI** — glass panels, neon signal colors, and light/dark theme tokens.

---

## 🚀 Live Modules

### 〰️ Fourier & Spectrum

Frequency-domain foundations: Fourier series synthesis, DFT/FFT spectrum analysis, windowing,
LTI filter response, transform pairs, and analytic-signal / Hilbert-transform views.

### 📻 Analog AM/FM Modulation

Analog transmission experiments for DSB-SC, conventional AM, SSB, VSB, FM, and PM, including
power and efficiency readouts, envelope/coherent/PLL-style recovery, and superheterodyne
receiver frequency planning.

### 🎲 Random Processes

Stochastic signal intuition through ensembles, mean behavior, autocorrelation, ergodicity,
power spectral density, and LTI filtering of random processes.

### 🎚️ Sampling & Quantization

Sampling theorem, aliasing, reconstruction, scalar quantization, PCM coding, measured SQNR,
and audio playback for sampled / quantized signals.

### 🪜 Delta Modulation

One-bit waveform coding with a live staircase reconstruction, slope-overload detection,
granular-noise behavior, bitstream view, SNR readouts, and audio comparison.

### 🌫️ Analog Noise & SNR

Noise performance for analog systems: output SNR, demodulation gain, FM threshold behavior,
and pre/de-emphasis comparisons for DSB-SC, SSB, AM, and FM.

### 🔣 Information Theory

Entropy and self-information, prefix codes and Kraft inequality, Huffman coding, Lempel-Ziv
universal coding, and source-coding efficiency.

### 📡 Modulation & Detection

Digital signal-space experiments for BPSK, BASK/OOK, BFSK, M-PSK, M-ASK, M-QAM, and M-FSK.
Includes AWGN injection, ML/MAP decision regions, theoretical SER curves, Monte-Carlo runs,
message transmission, and an optimum-receiver workspace.

### 👁️ Baseband & Eye Diagram

Nyquist pulse shaping, raised-cosine / root-raised-cosine pulses, matched filtering,
correlator equivalence, ISI, eye diagrams, and ZF/MMSE equalization.

### 🧬 Channel Capacity & Coding

Channel models, mutual information, capacity, Shannon-limit visualizations, linear block
codes, convolutional codes with Viterbi decoding, cyclic / CRC codes, GF(2^m), BCH,
Reed-Solomon, concatenated coding, and coding-gain comparisons.

### 🛰️ Wireless Communications

Multipath fading channels, delay spread, frequency selectivity, Doppler, BER over fading,
diversity and shadowing, DS-SS, FH-SS, OFDM, link budget, RAKE reception, MIMO, CPM/MSK,
and CDMA near-far behavior.

### 🔗 End-to-End Link

The full chain wired together: source and quantizer, modulation, channel, detector, sink,
BER/SQNR/rate metrics, recovered-signal comparison, and stage-by-stage inspection.

---

## 🧭 Signal Chain

CommSysLab is organized around one idea: each module is a block in a communication link.

```text
source -> sampling -> source coding -> modulation -> channel -> detection -> receiver
            |              |               |            |           |
       Sampling &      Information     Modulation    AWGN /      ML/MAP
       Quantization      Theory        & Detection   fading      detector
```

The landing page renders this chain interactively, and the module launcher lists every lab in
book-chapter order.

---

## 🏗️ Technical Architecture

| Layer            | Stack                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Frontend         | React 18 · TypeScript strict · Vite · React Router v6 HashRouter |
| Math typesetting | KaTeX                                                            |
| Audio            | Web Audio API for sampled / quantized signal playback            |
| Rendering        | Custom Canvas + SVG plotting primitives                          |
| DSP core         | Pure, framework-free TypeScript in `src/lib/dsp`                 |
| Styling          | CSS design tokens · glassmorphism · neon signal palette          |
| Testing          | Vitest · Testing Library · jsdom                                 |
| Tooling          | ESLint · Prettier · `tsc --noEmit`                               |
| Deployment       | Vercel static SPA                                                |

```text
React SPA (Vite)
├── routed module views
├── shared UI controls and formula/theory panels
├── Canvas/SVG plotting primitives
├── Web Audio playback helpers
└── pure DSP, simulation, and coding libraries
```

The architecture keeps a hard line between **math and UI**. DSP, coding, channel, and
simulation logic live in pure functions under `src/lib/dsp` and `src/lib/sim`, so they can
be unit-tested independently from React views.

---

## 🎨 Design System

CommSysLab uses a single visual language: dark **glassmorphism** with restrained
**neon glow** accents, backed by CSS tokens in [`src/theme/tokens.css`](src/theme/tokens.css).
The light theme resolves from the same token names.

- 🎨 **Tokens first** — colors, spacing, radii, blur, and motion are CSS variables.
- 🔤 **Typography** — `Newsreader` for body/headings and `IBM Plex Mono` for numerics, code, and formulas.
- 🪟 **Glass panels** — translucent surfaces, backdrop blur, hairline borders, and subtle hover glow.
- 🟢 **Signal palette** — green input, orange system, blue-violet output, pink marker.
- 🧩 **Shared primitives** — sliders, selects, panels, formulas, readouts, segmented controls, and toggles.

---

## 📁 Project Structure

```text
src/
├── modules/                     Feature modules, one lab per communication topic
│   ├── fourier/                 Fourier series, FFT, filters, analytic signals
│   ├── analog/                  AM/FM/PM modulation and analog receivers
│   ├── random-process/          Ensembles, autocorrelation, PSD, filtering
│   ├── sampling-quantization/   Sampling theorem, aliasing, PCM, SQNR
│   ├── deltamod/                Delta modulation and waveform coding
│   ├── analog-noise/            Analog noise, SNR, FM threshold
│   ├── infotheory/              Entropy, Kraft, Huffman, LZ78
│   ├── modulation/              Constellations, AWGN, ML/MAP, optimum receiver
│   ├── baseband/                Pulse shaping, matched filter, eye, equalization
│   ├── channel-coding/          Capacity, block/conv/cyclic/BCH/RS/concatenated codes
│   ├── wireless/                Fading, OFDM, link budget, RAKE, MIMO, CDMA, CPM
│   └── end-to-end/              Source-to-sink link inspection
├── lib/
│   ├── dsp/                     Pure DSP, probability, channel, and coding functions
│   ├── plot/                    Canvas/SVG drawing primitives and color helpers
│   ├── sim/                     Simulation loops, sources, and link helpers
│   └── audio/                   Web Audio playback helpers
├── components/                  Shared UI controls and display components
├── pages/                       Landing, start page, and page-level shells
├── theme/                       Design tokens and global styles
├── i18n/                        User-facing string catalogs
├── test/                        Test setup
└── App.tsx                      Router, nav shell, module overlay, theme toggle

tests/                           Vitest unit/component suites
docs/book-reference.md           Module-to-book chapter map
refs/                            Reference PDFs (git-ignored)
```

---

## ⚡ Quick Start

### 📋 Prerequisites

- Node.js 18+

### ▶️ Run

```bash
npm install
npm run dev          # Development server, usually http://localhost:5173
npm run build        # Type-check + production build to dist/
npm run preview      # Preview the production build
npm test             # Unit + component tests
npm run lint         # ESLint with zero warnings
npm run format       # Prettier
```

---

## 🔗 Routes

CommSysLab is a single-page app using React Router v6 with hash routing, so it works at any
deployed path without server rewrites.

```text
/                      -> Landing page
/start                 -> Module launcher
/fourier               -> Fourier & Spectrum
/analog                -> Analog AM/FM Modulation
/analog-noise          -> Analog Noise & SNR
/random-process        -> Random Processes
/sampling              -> Sampling & Quantization
/delta-modulation      -> Delta Modulation
/modulation            -> Modulation & Detection
/information-theory    -> Information Theory
/channel-coding        -> Channel Capacity & Coding
/baseband              -> Baseband & Eye Diagram
/wireless              -> Wireless Communications
/end-to-end            -> End-to-End Link
```

---

## 📚 Reference

Simulation math, parameter ranges, and notation track the reference text. The mapping from
each module to its chapter and section lives in
[`docs/book-reference.md`](docs/book-reference.md).

> **Textbook citation:** Proakis, J. G., & Salehi, M. (2014).
> [_Fundamentals of Communication Systems_](https://www.amazon.com.tr/Fundamentals-Communication-Systems-Proakis-Masoud/dp/1292015683)
> (2nd ed., Global ed.). Pearson. ISBN 978-1292015682.

---

## 🚢 Deployment

CommSysLab ships as a static SPA on **Vercel** through git integration. The project uses the
Vite preset (`npm run build`, output `dist`) and a relative Vite `base`, so static assets
resolve correctly from deployed routes.

---

<p align="center">
  ✨ <strong>CommSysLab</strong> · Interactive Communication Systems Lab ✨<br>
  <sub>📡 Built so communication theory can be moved, heard, and seen. 📡</sub>
</p>
