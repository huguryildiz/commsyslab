# DigiCommLab — Design Specification

> **Project:** DigiCommLab — *EE413 Interactive Digital Communications Lab*
> **Date:** 2026-06-13
> **Status:** Approved (brainstorming complete) — ready for implementation planning
> **Language of artifact:** English (the tool UI, codebase, and this spec are English; technical
> terms such as BPSK, SQNR, H(S) stay English in all locales). Conversation language: Turkish.

---

## 1. Overview & Goals

DigiCommLab is a **browser-only, interactive web-based learning tool** for the topics of EE413
(Communication Systems II). It turns the course's static lecture material (Chapters 7–10) into a
set of **live, interactive simulations** so students can manipulate parameters and *watch and hear*
the underlying digital-communication concepts behave.

Primary goals:

1. **Slide fidelity.** Every formula, symbol, and definition matches the EE413 lecture slides
   (CH7–CH10) exactly, so the tool is a 1:1 companion to the course.
2. **Interactivity over static plots.** Sliders/toggles update visualizations in real time.
3. **Live simulation.** Beyond static "calculators," the tool streams bits/symbols through the
   full chain in real time (transmit → channel → receive → detect/decode) with play/pause/step.
4. **Pedagogical framing.** Each view includes a short "Theory" recap tied to the slides; it is a
   *learning tool*, not just a numeric calculator.
5. **Zero backend.** Runs entirely in the browser; deployable as a static site.

The tool covers the four requested MVP topics plus the MAP/ML decision topic (integrated) and a
set of slide-extending live simulations the instructor requested.

---

## 2. Non-Goals (v1)

These are explicitly **out of scope for v1** but the architecture must not preclude them:

- Student quiz mode / scoring.
- Auto-generated randomized exercises with answer checking.
- Save/export of results beyond simple client-side PNG/URL-param sharing.
- Instructor dashboard and Moodle/LMS (LTI/SCORM) integration — **these require a backend** and
  break the browser-only constraint; revisit as a separate v2 decision.
- User accounts, persistence, analytics.

---

## 3. Key Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| D1 | UI language | **English**, with an i18n-ready structure (Turkish can be added later via a dictionary). |
| D2 | MAP/ML decision topic | **Integrated** into the Modulation & Detection view (prior-probability slider + ML/MAP toggle), not a standalone module. |
| D3 | Rendering | **Custom Canvas + SVG** (no heavy charting library). Canvas for high-frequency/real-time (waveforms, noise clouds); SVG for structured graphics (Huffman tree, decision-region polygons, axes labels). |
| D4 | Deployment | **GitHub Pages + GitHub Actions CI**; Vite `base` path configured; **HashRouter** for deep links. |
| D5 | Live-simulation extras | **All four** included in v1: (a) Web Audio aliasing/quantization playback, (b) text/image transmission through the noisy channel, (c) end-to-end capstone view, (d) live eye diagram. |
| D6 | Module set | **5 views** mapping to CH7–CH10 + capstone (see §6). |
| D7 | Bonus modulation | **M-QAM** included in the Modulation view (low cost, present in slides). |
| D8 | Slides in repo | `slides/` is **git-ignored** by default (instructor's private PDFs; repo may be published). |

---

## 4. Technology Stack

- **React 18 + TypeScript** (strict mode).
- **Vite** — dev server + build; `base: '/<repo>/'` for GitHub Pages.
- **Rendering:** custom Canvas 2D + inline SVG (React). No Plotly/Chart.js/D3-as-renderer
  (D3 numeric helpers like `d3-scale` may be used as small utilities if convenient).
- **KaTeX** — render LaTeX formulas (SQNR, Pe, H(S), …) so on-screen math matches the slides.
- **Web Audio API** — sampling/quantization audio playback (tone generator + optional mic input).
- **Routing:** `react-router-dom` **HashRouter** (GitHub Pages friendly, deep-linkable modules).
- **State:** React hooks + Context per view; no global store library needed.
- **Testing:** **Vitest** for the pure DSP layer (`lib/dsp/**`). Optional: React Testing Library
  for a few component smoke tests.
- **Lint/format:** ESLint + Prettier.
- **CI/CD:** GitHub Actions → build → deploy to GitHub Pages.

---

## 5. Architecture

### 5.1 Layered structure (separation of concerns)

The **DSP/math layer is fully decoupled from React and the DOM.** All formulas are pure
TypeScript functions, unit-tested against the slide values. Rendering and UI are separate layers.

```
DSP (pure TS, tested)  →  Plot primitives (Canvas/SVG)  →  Components (React)  →  Views
                                                          ↑
                                    Simulation engine (animation loop + stream sources)
```

For each unit we can answer: *what does it do, how is it used, what does it depend on?*
- `lib/dsp/*` depends on nothing (pure math). Testable in isolation.
- `lib/plot/*` depends on a canvas/SVG context only. Reusable across views.
- `lib/sim/*` depends on `requestAnimationFrame` and DSP. Drives the live demos.
- `components/*` are presentational/controls; depend on React only.
- `modules/*` compose the above; each view is self-contained.

### 5.2 Folder layout

```
digicommlab/
├─ index.html
├─ vite.config.ts            # base path for GH Pages
├─ package.json
├─ tsconfig.json
├─ .eslintrc.* / .prettierrc
├─ .github/workflows/deploy.yml
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                # shell: HashRouter, nav, theme
│  ├─ i18n/
│  │  ├─ index.ts            # t() + locale context
│  │  └─ en.ts               # English dictionary (TR added later)
│  ├─ theme/
│  │  ├─ tokens.css          # design tokens (colors, spacing, type)
│  │  └─ global.css
│  ├─ lib/
│  │  ├─ dsp/
│  │  │  ├─ signals.ts       # sinusoid sums, presets, bandwidth W
│  │  │  ├─ sampling.ts      # sampling, sinc reconstruction, alias frequency
│  │  │  ├─ quantize.ts      # uniform midrise/midtread, error, SQNR (theo + measured)
│  │  │  ├─ spectrum.ts      # DFT/FFT for spectrum-replica view
│  │  │  ├─ modulation.ts    # constellations for all schemes, energies, d_min
│  │  │  ├─ awgn.ts          # Gaussian RNG (Box–Muller), noise injection
│  │  │  ├─ detector.ts      # ML / MAP decision, decision-region geometry
│  │  │  ├─ ser.ts           # theoretical Pe formulas, qfunc, Monte-Carlo SER
│  │  │  ├─ pulse.ts         # raised cosine, sinc pulse, ISI, eye-diagram traces
│  │  │  ├─ entropy.ts       # self-info, H(S), max entropy
│  │  │  ├─ huffman.ts       # tree build, codewords, Kraft, prefix/unique-decodability
│  │  │  └─ index.ts
│  │  ├─ plot/
│  │  │  ├─ Canvas.tsx       # <canvas> wrapper w/ DPR + resize + draw callback
│  │  │  ├─ draw.ts          # axes, gridlines, line, stem, scatter, shade-region
│  │  │  └─ svg.ts           # tree layout, region polygons, arrows
│  │  └─ sim/
│  │     ├─ useSimulationLoop.ts   # rAF loop: play/pause/step/speed
│  │     └─ sources.ts             # bit source: random | text | image → bit stream
│  ├─ components/
│  │  ├─ Slider.tsx  Toggle.tsx  Select.tsx  NumberInput.tsx
│  │  ├─ Formula.tsx           # KaTeX wrapper (inline + block)
│  │  ├─ Readout.tsx  Panel.tsx  TheoryBox.tsx
│  │  ├─ TransportControls.tsx # play/pause/step/speed (shared)
│  │  └─ layout/ ControlPanel.tsx  VizArea.tsx  AppShell.tsx
│  ├─ modules/
│  │  ├─ sampling/            # CH7 view + subcomponents
│  │  ├─ modulation/          # CH9 view (+ MAP/ML, live TX, text/image)
│  │  ├─ baseband/            # CH8 view (raised cosine, ISI, eye diagram)
│  │  ├─ huffman/             # CH10 view (+ live encode/decode)
│  │  └─ endtoend/            # capstone view (reuses huffman + modulation + awgn)
│  └─ pages/ Home.tsx
└─ tests/                     # vitest specs mirroring lib/dsp/*
```

### 5.3 Simulation engine (`lib/sim`)

A shared engine powers every live demo so behavior and controls are consistent.

- **`useSimulationLoop({ onTick, fps, running })`** — a `requestAnimationFrame` loop with
  play/pause/step and an adjustable speed (symbols or samples per second). Accumulates simulation
  time; calls `onTick(dt, simTime)`.
- **Stream sources (`sources.ts`)** — produce a bit stream from:
  - `random` — Bernoulli(0.5) bits;
  - `text` — UTF-8/ASCII bytes → bits;
  - `image` — small bitmap (e.g. ≤64×64 grayscale) → bits.
- **Shared `TransportControls` component** — play / pause / step / reset / speed slider, bound to
  the loop.
- **Incremental statistics** — running counters (symbols sent, bit/symbol errors) update each tick
  so live SER/BER converges toward the theoretical value on screen.
- **Performance:** Canvas draws use a ring buffer of the most recent N received points (trail
  effect); live point count capped (e.g. ≤ ~5000) for smoothness. Heavy batch Monte-Carlo (for the
  SER-vs-Eb/N0 curve) runs off the live loop and, if needed, in a **Web Worker**.

### 5.4 Rendering approach

- **Canvas** (`lib/plot/Canvas.tsx` + `draw.ts`): time-domain waveforms, sampled stems,
  reconstruction, quantization staircase + error, spectrum replicas, **constellation noise cloud**,
  **eye diagram**, SER scatter. DPR-aware; redraws on state change / each tick.
- **SVG** (`lib/plot/svg.ts`): Huffman tree (node-link), decision-region polygons/boundaries,
  annotation arrows (noise vector), axis labels with KaTeX. SVG is chosen where structure +
  crisp text/interaction matter and update frequency is low.

### 5.5 Internationalization

- `t(key)` reads from `i18n/en.ts`. All user-facing strings go through `t()`.
- A locale Context allows adding `tr.ts` later without touching components.
- Math/technical symbols are **not** translated.

---

## 6. Views (modules)

Navigation order follows the course (CH7 → CH8 → CH9 → CH10 → capstone). Build order front-loads
the centerpiece (Modulation) — see §8.

### 6.1 Sampling & Quantization (CH7)

**Purpose:** demonstrate the sampling theorem, Nyquist rate, aliasing, sinc reconstruction, uniform
quantization, quantization error, and SQNR.

**DSP (`signals.ts`, `sampling.ts`, `quantize.ts`, `spectrum.ts`):**
- Analog signal: sum of 1–3 sinusoids; max frequency defines bandwidth `W`.
- Sampling at `f_s`; sample set `g(nT_s)`, `T_s = 1/f_s`.
- **Sinc reconstruction:** `g_R(t) = Σ_n g(nT_s)·sinc(2W(t − nT_s))`, `sinc(x)=sin(πx)/(πx)`.
- **Sampled spectrum:** `G_δ(f) = f_s · Σ_n G(f − n·f_s)` (replicas; overlap ⇒ aliasing).
- Alias frequency computed and shown; regime classified vs **Nyquist `f_s = 2W`**:
  oversampling / Nyquist / undersampling (aliasing).
- **Uniform quantizer:** step `Δ = 2·m_max / L`, with `L = 2^R`; **midrise** and **midtread**
  variants. Quantization error `e[n] = x[n] − Q(x[n])`.
- Quantization noise power `E[Q²] = Δ²/12`.
- **SQNR** = `P_M / E[Q²] = (3 P_M / m_max²)·2^(2R)`; in dB:
  `10·log10(3 P_M / m_max²) + 6.02·R`. Both **theoretical** and **measured** (from actual error
  power) shown, illustrating the "+6.02 dB per bit" rule.

**Visuals (linked Canvas panels):**
1. Time domain: analog curve + sample stems + reconstructed (dashed) overlaid.
2. Frequency domain: spectrum replicas; **overlap shaded red when `f_s < 2W`**.
3. Quantization: signal + staircase + level lines; separate error plot.
4. Regime indicator with the Nyquist line.

**Controls:** `f_s` slider, signal-frequency slider(s)/preset, `R` (bits 1–8), midrise/midtread
toggle, reconstruction on/off.

**Live features:**
- **Scrolling oscilloscope sampler** — waveform scrolls; a sweep cursor takes samples and the
  quantizer "snaps" in real time.
- **PCM bitstream** — quantized codewords stream out (NBC/Gray option) as `…0110 1100…`.
- **🔊 Audio playback (Web Audio):** generate a tone/sweep (or take mic input), sample + quantize
  at the chosen `f_s`/`R`, and play it back so the student *hears* aliasing and quantization noise.

**Edge cases:** clamp `f_s` range; `m_max` derived from signal amplitude; guard `sinc` at `x=0`.

### 6.2 Modulation & Detection (CH9) — *MAP/ML integrated*

**Purpose:** signal-space constellations, AWGN, decision regions, **ML vs MAP** detection,
minimum-distance detection, and theoretical-vs-simulated symbol error probability. Covers requested
items 4 and 5 in one view.

**DSP (`modulation.ts`, `awgn.ts`, `detector.ts`, `ser.ts`):** constellations in slide notation —
- **BPSK:** `s = ±√Eb·ψ`; `d_min = 2√Eb`.
- **BASK:** `s0 = 0`, `s1 = √(2Eb)·ψ`; `d_min = √(2Eb)`; `E = 2Eb`.
- **BFSK:** orthogonal 2-D, `s0 = √Eb·ψ0`, `s1 = √Eb·ψ1`; `d_min = √(2Eb)`.
- **M-PSK (incl. QPSK):** `s_i = √Es·(cos θ_i, −sin θ_i)`, `θ_i = 2π(i−1)/M`;
  `d_min = 2√Es·sin(π/M)`; `N̄_dmin = 2`.
- **M-ASK:** `A_i = (2i−1−M)·A`; `E_s,av = A²(M²−1)/3`; `d_min = 2A`; `d_min² = 12·E_s,av/(M²−1)`.
- **M-QAM (bonus):** `s_i = (√E0·a_i, √E0·b_i)`; `E_s,av = 2(M−1)E0/3`.
- **M-FSK:** orthogonal, M-dimensional — see edge cases.
- **AWGN:** add `N(0, N0/2)` per signal-space dimension; `σ` derived from the `Eb/N0` slider.
- **Detection:**
  - **ML** = minimum distance: `ŝ = argmin_i ‖r − s_i‖²` (Voronoi regions).
  - **MAP:** `ŝ = argmin_i { ‖r − s_i‖² − N0·ln P(s_i) }`, equivalently
    `argmax_i { r·s_i − E_i/2 + (N0/2)·ln P(s_i) }`. Boundaries shift with priors.
- **Theoretical Pe** (slide formulas, SNR/bit form):
  - BPSK: `Q(√(2Eb/N0))`
  - BFSK / BASK: `Q(√(Eb/N0))`
  - M-PSK: `2·Q(√(2·log2(M)·Eb/N0)·sin(π/M))`
  - M-FSK: `(M−1)·Q(√(log2(M)·Eb/N0))`
  - M-ASK: `(2(M−1)/M)·Q(√(6·log2(M)·Eb,av / ((M²−1)·N0)))`
  - M-QAM: `(4(√M−1)/√M)·Q(√(3·log2(M)·Eb,av / ((M−1)·N0)))`
  - `Q(x) = 0.5·erfc(x/√2)`.
- **Simulated SER:** Monte-Carlo — transmit N random symbols, add noise, detect (ML or MAP), count
  errors; also union-bound / nearest-neighbor approximation shown for comparison.

**Visuals:**
- **Constellation plane** (SVG points + axes/labels, Canvas noise cloud): ideal points,
  **shaded decision regions** (ML Voronoi or MAP-shifted), received noisy cloud, `d_min` annotation.
- For 1-D schemes (BPSK/BASK/M-ASK): show the `ψ` axis with **threshold line(s)**; the MAP shift
  `μ` vs the equal-prior midpoint is visualized.
- **SER vs Eb/N0** Canvas plot (log-y): theoretical curve + simulated markers; multiple schemes
  overlayable; Gray-coding display toggle.

**Controls:** scheme selector, `M`, `Eb/N0` (dB) slider, #symbols, **ML/MAP toggle + prior slider**
(active in MAP), decision-region on/off, Gray-code labels on/off.

**Live features (the centerpiece):**
- **📡 Live transmission:** stream symbols; each received point appears per tick with a fading
  trail; "current symbol" shows ideal → **noise-vector arrow** → received → detected
  (green = correct, red flash = error).
- **Live SER/BER odometer** converging visibly to the theoretical value.
- **✉️ Text/image transmission:** stream typed text or a small image through the channel; show the
  decoded (possibly corrupted) output (e.g. `HELLO → HELLP`, or a visibly degraded image).

**Edge cases:**
- **M-FSK dimensionality:** orthogonal FSK needs M dimensions. Only **M ≤ 2** (BFSK) is drawable as
  a 2-D constellation; **M = 3** may use an optional 3-D-ish projection; for **M > 3** show a clear
  "cannot be drawn in 2-D" note while the **SER curve and live error counting still work**.
- Validate priors sum to 1 (binary/simple multi-symbol).

### 6.3 Baseband & Eye Diagram (CH8)

**Purpose:** pulse shaping, the Nyquist criterion for zero ISI, the raised-cosine spectrum,
intersymbol interference, matched-filter intuition, and the **eye diagram** as a real-time
oscilloscope tool. Gives the eye diagram a proper topical home and covers CH8.

**DSP (`pulse.ts`):**
- Pulses: ideal sinc (Nyquist channel) and **raised cosine** with roll-off `α`:
  transmission bandwidth `B_T = (1+α)W`; `p(t) = sinc(2Wt)·cos(2παWt)/(1 − 16α²W²t²)`.
- ISI model: `y(t_i) = μ·a_i·p(0) + Σ_{k≠i} a_k·p((i−k)T_b) + n(t_i)`; Nyquist zero-ISI condition
  `p(iT_b) = δ_{i0}`.
- Matched-filter peak SNR `= 2E/N0` (intuition / readout).
- Eye-diagram traces: superpose all signaling-interval segments of the (optionally noisy, optionally
  band-limited) waveform.

**Visuals:**
- Pulse `p(t)` and spectrum `P(f)` vs roll-off `α`.
- Transmitted waveform with ISI; received waveform.
- **👁️ Live eye diagram** (Canvas): builds up in real time as symbols stream; markers for best
  sampling instant, eye opening (noise margin), and zero-crossing jitter.

**Controls:** roll-off `α` slider, samples/symbol, `Eb/N0`, bit pattern (random/custom),
band-limiting on/off, persistence depth for the eye.

**Live features:** eye pattern accumulates per tick; transport controls shared.

### 6.4 Huffman & Entropy (CH10)

**Purpose:** entropy, the source-coding bound, Huffman codes, average length, efficiency, the
prefix-code property, and the Kraft inequality.

**DSP (`entropy.ts`, `huffman.ts`):**
- Editable symbol/probability table, or **derive probabilities from input text** (frequency count).
- Self-information `I(s_k) = −log2(p_k)`.
- **Entropy** `H(S) = −Σ p_k·log2(p_k)` bits/symbol; bounds `0 ≤ H(S) ≤ log2(K)`.
- **Huffman algorithm** (combine the two lowest-probability nodes; documented tie-breaking
  convention) → tree + codewords.
- **Average length** `L̄ = Σ p_k·l_k`; **efficiency** `η = H(S)/L̄`; redundancy `1 − η`.
- Source-coding bound `H(S) ≤ L̄ ≤ H(S) + 1`.
- **Kraft inequality** `Σ 2^(−l_k) ≤ 1` (necessary, not sufficient for a prefix code) — show value
  and pass/fail.
- **Custom-code tester** (mirrors slide examples Code-I/II/III): user enters arbitrary codewords;
  tool checks prefix property, Kraft, and unique decodability.

**Visuals:**
- **Huffman tree** (SVG, 0/1 edge labels, leaves = symbols), with optional step-by-step build
  animation.
- Probability bar chart; codeword table (symbol · p · codeword · length).
- Readouts: `H(S)`, max entropy `log2(K)`, `L̄`, `η` (%), Kraft sum, prefix-OK.

**Live features:**
- **⚡ Live encode/decode stream:** stream typed text; for each symbol the **tree path highlights**
  and the Huffman bitstream grows; compression ratio (fixed-length vs Huffman) accumulates live.
  Then **decode** the bitstream by walking the tree bit-by-bit (prefix property made visible).

**Edge cases:** probabilities normalized (with a normalize button); handle single-symbol and
equal-probability sources; ties resolved deterministically.

### 6.5 End-to-End Link (capstone)

**Purpose:** tie everything together as one live system. Reuses the Huffman, modulation, AWGN, and
detector engines — **no duplicated DSP.**

**Chain:** source (text/image) → **Huffman source coding** → **digital modulation** (chosen scheme)
→ **AWGN channel** (chosen `Eb/N0`) → **detection** (ML/MAP) → **Huffman decode** → reconstructed
output.

**Visuals:** an animated **system block diagram**; each stage is clickable to inspect its current
data (bits, symbols, constellation, recovered bits). Side-by-side **original vs received** output
(text diff or image), plus end-to-end metrics (compression ratio, channel SER/BER, net fidelity).

**Controls:** source selector, modulation scheme + `M`, `Eb/N0`, ML/MAP, transport controls.

---

## 7. Testing Strategy

The **DSP layer is the correctness-critical part** (must match the slides) and is covered by Vitest:

- `sampling`: alias-frequency computation; reconstruction reproduces the original when `f_s ≥ 2W`;
  Nyquist boundary behavior.
- `quantize`: `Δ`, `E[Q²]=Δ²/12`, SQNR theoretical vs measured; midrise/midtread mapping;
  "+6.02 dB per bit."
- `modulation`: constellation coordinates, energies, `d_min` per scheme vs slide values.
- `ser`: `qfunc` accuracy; theoretical Pe formulas at known reference points (e.g. BPSK at given
  Eb/N0); simulated SER → theoretical within tolerance for large N.
- `detector`: ML = minimum distance; MAP boundary shift with priors; equal priors ⇒ ML.
- `entropy`/`huffman`: entropy of slide examples (e.g. `{0.7,0.2,0.1} → 1.1568`); Huffman example
  (`{0.4,0.2,0.2,0.1,0.1} → L̄=2.2, H=2.12, η≈0.96`); Kraft sums for Code-I/II/III; prefix and
  unique-decodability checks.
- `pulse`: raised-cosine zero crossings at `iT_b`; `B_T=(1+α)W`.

Approach: **TDD for the DSP layer** — write tests from the slide formulas/examples first, then
implement. Components get light smoke tests only.

---

## 8. Build Phases (each phase ends deployable)

Sequenced so there is always a working, deployable artifact — never a half-built state.

- **Phase 0 — Infrastructure & shell.** Vite + React + TS + KaTeX + Vitest + ESLint/Prettier; theme
  tokens; `AppShell` + HashRouter + nav + Home; **GitHub Pages base path + Actions CI**; shared
  plot primitives, control components, and the simulation engine skeleton.
- **Phase 1 — Sampling & Quantization (CH7).** DSP (TDD) → static interactive visuals → scrolling
  live sampler + PCM bitstream → **Web Audio playback**. *Deploy.*
- **Phase 2 — Modulation & Detection (CH9) [centerpiece].** DSP (TDD) → constellations + AWGN +
  ML/MAP + decision regions + SER curves → **live transmission** + SER convergence → **text/image
  transmission**. *Deploy.*
- **Phase 3 — Huffman & Entropy (CH10).** DSP (TDD) → tree + tables + Kraft → **live encode/decode**
  + tree-build animation + custom-code tester. *Deploy.*
- **Phase 4 — Baseband & Eye Diagram (CH8).** DSP (TDD) → pulse shaping + raised cosine + ISI →
  **live eye diagram**. *Deploy.*
- **Phase 5 — End-to-End Link (capstone).** Compose existing engines into the full live chain with
  per-stage inspection and degraded-output view. *Deploy.*
- **Phase 6 — Polish.** Responsiveness, accessibility, Theory boxes throughout, README/usage docs,
  final deploy verification.

---

## 9. Deployment (GitHub Pages + CI)

- `vite.config.ts` sets `base: '/<repo-name>/'` so asset URLs resolve under the Pages subpath.
- **HashRouter** avoids 404s on deep links under GitHub Pages.
- `.github/workflows/deploy.yml`: on push to the default branch → install → test → build →
  publish `dist/` to GitHub Pages.
- The instructor shares a single Pages URL; individual modules are deep-linkable via hash routes.

---

## 10. Long-Term Roadmap (post-v1)

Architected-for but out of scope now:

- **Quiz mode** — per-module question bank with feedback.
- **Save/export** — PNG export of plots; shareable configuration via URL query params.
- **Auto-generated exercises** — randomized parameters + answer checking.
- **Instructor dashboard / Moodle-LMS (LTI/SCORM)** — requires a backend; revisit as a separate
  decision (breaks the browser-only constraint).
- **Additional modules** — PCM & line coding (CH7), matched-filter detail (CH8), channel capacity
  (CH10).

---

## 11. Risks & Mitigations

- **M-FSK / high-M visualization** — orthogonal M-FSK is not 2-D drawable for M>3 (and 3-D is
  awkward). *Mitigation:* show constellation only for M ≤ 2 (optionally 3 in 3-D), but keep SER
  curve + live error counting for all M, with a clear note. (See §6.2.)
- **Real-time performance** — large live point clouds / Monte-Carlo can jank. *Mitigation:* ring
  buffer + capped live points + incremental stats; offload heavy SER sims to a Web Worker.
- **Web Audio across browsers / autoplay policy** — audio requires a user gesture to start.
  *Mitigation:* gate playback behind an explicit "Play sound" button; provide a built-in tone if
  mic is unavailable.
- **Numeric accuracy of `Q`/`erfc`** — implement a vetted `erfc` approximation and unit-test it
  against reference values.
- **Scope** — five views + live extras is substantial. *Mitigation:* phased, independently
  deployable milestones (§8); each phase is shippable on its own.

---

## 12. Open Questions

None blocking. The eye diagram has been given a dedicated CH8 view (D6); if undesirable it can be
folded into the capstone's waveform panel. Slide-versioning is resolved by D8 (slides git-ignored
by default).
