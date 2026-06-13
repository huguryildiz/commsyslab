# Baseband & Eye Diagram — Design Spec (Phase 4, CH8)

> **Status:** approved in brainstorming (2026-06-13). Unit of execution = one detailed bite-sized
> TDD plan (phase1b/2a/3b style), generated next via `superpowers:writing-plans`.
> **Book:** Proakis & Salehi, *Communication Systems Engineering* (2nd Ed.). Section numbers below
> were read from `slides/Book.pdf` and verified, per the project's mandatory Book.pdf rule.

## Goal

A single **tabbed** Baseband module (course CH8) that tells one coherent story across three tabs:
pulse shaping → optimum receiver → eye/ISI/equalization. Covers the user's three requested concepts —
**matched filter**, **eye diagram / intersymbol interference**, **correlation receiver** — plus four
book-grounded additions confirmed in brainstorming: roll-off **α**, the **Nyquist zero-ISI criterion**,
the **root-raised-cosine (RRC) split** that unifies matched filter ↔ pulse shaping, and **quantitative
eye-diagram annotations** with 2-/4-PAM.

## Architecture & placement

- Route `/baseband`; nav label **"Baseband & Eye"** in the CH8 group; a card on `src/pages/Home.tsx`.
- Single tabbed module (mirrors the committed `src/modules/infotheory/` pattern).
- Layering unchanged: pure unit-tested DSP in `src/lib/dsp/**` (strict TDD) ↔ Canvas/SVG draw helpers
  ↔ `useSimulationLoop` + bit sources ↔ React module. All math via KaTeX `Formula`; all strings via `t()`.

```
src/modules/baseband/
  BasebandModule.tsx          // tab host + shared top controls (pulse kind, roll-off α)
  PulseShapingSection.tsx     // Tab 1
  ReceiverSection.tsx         // Tab 2
  EyeEqualizationSection.tsx  // Tab 3
  panels.tsx                  // Canvas draw panels (pulse, spectrum, MF output, eye, taps)
  model.ts                    // pure state -> derived data (calls DSP; no React)
  baseband.css                // tokenized (signal_sim design language)
```

## DSP layer (pure, unit-tested) — book-verified

### `src/lib/dsp/pulse.ts` — pulse shaping (Proakis §8.3, Nyquist Theorem 8.3.1)

```ts
raisedCosine(t: number, alpha: number, T: number): number;        // x(0)=1; sinc(t/T)·cos(παt/T)/(1−(2αt/T)²)
rootRaisedCosine(t: number, alpha: number, T: number): number;    // √RC; two √RC cascaded = RC
pulseWaveform(kind: 'rc'|'rrc'|'sinc', alpha: number, sps: number, span: number): number[];
raisedCosineSpectrum(f: number, alpha: number, T: number): number;// flat to (1−α)/2T, cosine roll-off to (1+α)/2T
raisedCosineBandwidth(alpha: number, T: number): number;          // W = (1+α)/(2T)
nyquistOffCenterSamples(pulse: number[], sps: number): number[];  // values at t=nT (n≠0); ~0 ⇒ zero ISI
```

Worked test values (the TDD targets):
- `raisedCosine(0, α, 1) = 1`; `raisedCosine(n, α, 1) ≈ 0` for n=1,2,3 (zero-ISI at sampling instants).
- `α=0` reduces to `sinc(t/T)`.
- `raisedCosineBandwidth(0, T) = 1/(2T)`; `raisedCosineBandwidth(1, T) = 1/T` (100% excess bandwidth).
- **RRC split (concept C):** `convolve(rootRaisedCosine…, rootRaisedCosine…)` sampled at `nT` ≈ `δ[n]`
  (cascade of two √RC = RC ⇒ zero ISI). This is the testable bridge between this file and the receiver.

### `src/lib/dsp/matchedfilter.ts` — optimum receiver (Proakis §7.5.1 correlation, §7.5.2 matched filter)

```ts
matchedFilter(pulse: number[]): number[];                          // h[n] = p[N−1−n]
convolve(x: number[], h: number[]): number[];                      // full linear convolution
matchedFilterOutput(received: number[], pulse: number[]): number[];// convolve(received, matchedFilter(pulse))
correlate(received: number[], pulse: number[]): number;            // Σ r·p — correlation-receiver decision statistic
pulseEnergy(pulse: number[]): number;                              // Σ p²
peakSnr(pulseEnergy: number, n0: number): number;                  // 2E/N0
```

Worked test values:
- `matchedFilter([1,2,3]) = [3,2,1]`.
- `matchedFilterOutput([1,1,1],[1,1,1])` peaks at the center sample = `3` = E.
- `convolve([1,2],[1,1]) = [1,3,2]`.
- **Equivalence (the "correlation receiver" point):** `correlate(r, p)` equals the matched-filter output
  sampled at `t=T` (both = Σ r·p) — proves the correlator and matched filter are the same optimum receiver.
- `peakSnr(3, 2) = 3`.

### `src/lib/dsp/eye.ts` — eye diagram (Proakis §8.3, Fig 8.7)

```ts
interface EyeTrace { samples: number[] }
eyeTraces(signal: number[], sps: number, spanSymbols: number): EyeTrace[];        // overlapping windows
interface EyeMetrics { eyeHeight: number; noiseMargin: number; timingMargin: number }
eyeMetrics(traces: EyeTrace[], sps: number): EyeMetrics;                            // Fig 8.7(b) margins
```

- `eyeHeight` = vertical opening at the optimal sampling instant (min upper-rail − max lower-rail).
- `noiseMargin` (vertical) and `timingMargin` (horizontal) per Fig 8.7(b).
- Test: trace count = ⌊len / (spanSymbols·sps)⌋ region; a clean ISI-free signal has a larger eyeHeight
  than the same signal through an ISI channel.

### `src/lib/dsp/equalizer.ts` — equalization (Proakis §8.6.2)

```ts
zeroForcingTaps(channel: number[], nTaps: number): number[];       // truncated inverse, forces ISI→0
mmseTaps(channel: number[], noiseVar: number, nTaps: number): number[]; // → ZF as noiseVar→0
applyFilter(signal: number[], taps: number[]): number[];           // = convolve
residualIsi(channel: number[], taps: number[]): number;            // Σ|(channel*taps)[k]| off the main tap
```

- `zeroForcingTaps([1,0.5],4) ≈ [1,−0.5,0.25,−0.125]`.
- `convolve([1,0.5], zeroForcingTaps([1,0.5],4))` → main tap `1`, samples 1–3 `≈0` (|·|<1e-9).
- `mmseTaps([1,0.5],0,4) ≈ zeroForcingTaps([1,0.5],4)` (within 1e-6).
- `residualIsi([1,0.5], zeroForcingTaps([1,0.5],4)) ≈ 0`.

The ISI channel is **not** a separate file — it is an FIR tap array applied via `convolve`. Baseband
M-PAM symbols (2-PAM ±1, 4-PAM ±1,±3) are generated from random bits (`makeRng`/`Bit`) and pulse-shaped.

## UI — three tabs

**Tab 1 · Pulse Shaping & Nyquist.** Controls: pulse kind (RC/RRC/sinc), **roll-off α slider [0..1]**,
samples/symbol. Panels: (1) `p(t)` time-domain with **zero-crossing markers at every `nT`** (concept B);
(2) spectrum `X(f)` with bandwidth `W=(1+α)/2T` and Nyquist `1/2T` markers (concept A); (3) several
shaped symbols overlaid showing ISI-free superposition. Readouts: bandwidth `W`, excess bandwidth α,
first zero crossing. Theory: raised-cosine pulse, Nyquist `Σ X(f+m/T)=T` (Theorem 8.3.1).

**Tab 2 · Optimum Receiver.** Controls: noise on/off + `N0`, sub-optimal-filter contrast toggle. Panels:
(1) TX pulse `p(t)` and matched filter `h(t)=p(T−t)`; (2) MF output convolution building as `t` advances
(`useSimulationLoop`) with a marker at `t=T` where output = `E`; (3) correlator integral `∫r·p` vs the
MF sample at `t=T` → **same value** (the equivalence); (4) **RRC split** visual: TX `√RC` × RX matched
`√RC` = RC (concept C). Readouts: pulse energy `E`, peak SNR `2E/N0`. Theory: matched filter = time-
reversed pulse, correlation demod §7.5.1, peak-SNR optimality, the RRC split.

**Tab 3 · Eye, ISI & Equalization.** Controls: **M (2-/4-PAM)**, ISI channel taps (sliders), noise,
equalizer ZF/MMSE/off + tap count. Panels: (1) **live eye diagram** (traces accumulate via
`useSimulationLoop`) annotated with optimal sampling instant, **noise margin** (vertical), **timing
margin** (horizontal), peak distortion (concept D), M−1 openings for M-PAM; (2) combined channel⋆
equalizer response (→ impulse for ZF); (3) equalizer-tap stem plot; (4) **eye before vs after**
equalization (the payoff). Readouts: eye height, residual ISI, noise enhancement (ZF) vs MMSE.
Theory: ISI from §8.3, ZF inverts `H(z)`, MMSE balances ISI vs noise (§8.6.2).

**Optional readout (E):** §8.4.1 M-PAM error probability
`P_M = 2(M−1)/M · Q(√(6 log₂M · E_b / ((M²−1) N₀)))` as a small eye-opening↔BER readout in Tab 3.
Included as a lightweight readout only; not a core acceptance item.

## Reuse (no duplication)

`useSimulationLoop`, `Canvas`, draw primitives (`drawLine`/`drawStems`/`drawScatter`/`drawVLine`/
`drawAxes`/`drawText`/`linScale`/`logScale`), `addAwgn` (awgn), `makeRng`/`Bit` (sim/sources),
`sinc`/`clamp`/`linspace` (math), `Formula`/KaTeX, `t()` i18n, the infotheory tabbed-module pattern.
(Exact exported signatures are confirmed against the repo during the implementation plan.)

## Testing (strict TDD on DSP)

- `tests/dsp/pulse.test.ts`, `tests/dsp/matchedfilter.test.ts`, `tests/dsp/eye.test.ts`,
  `tests/dsp/equalizer.test.ts` — the worked values above.
- `tests/modules/baseband-model.test.ts` (pure derived data) + `tests/modules/BasebandModule.test.tsx`
  (render + tab switch smoke).

## Build order (bite-sized TDD; each step ships green: tests pass, lint 0, build clean)

1. `pulse.ts` → **Tab 1** (Pulse Shaping & Nyquist).
2. `matchedfilter.ts` → **Tab 2** (Optimum Receiver + RRC split).
3. `eye.ts` + `equalizer.ts` → **Tab 3** (Eye + ISI + Equalization).

## Out of scope (YAGNI / deferred)

Partial-response / duobinary controlled ISI (§8.3.2); maximum-likelihood sequence detection &
modulation codes (§8.5); decision-feedback and adaptive/LMS equalizers (advanced part of §8.6.2);
OFDM / multicarrier (§8.7). Each is a distinct topic; revisit after v1 ships.

## Acceptance

DSP test suites pass; `/baseband` renders with three working tabs; lowering α visibly widens the
spectrum and opens the pulse superposition; the MF output peaks to `E` at `t=T` and the correlator
matches it; an ISI channel closes the eye and ZF/MMSE reopens it with residual ISI → ~0; build + lint clean.
