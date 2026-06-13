# DigiCommLab Enhancements (Items 1–7) — Roadmap Plan

> **For agentic workers:** This is a **roadmap / master plan** covering seven independent enhancements. The
> seven items are independent subsystems, so per the `superpowers:writing-plans` scope-check each one is
> executed from its **own detailed bite-sized TDD sub-plan** (same style as
> `2026-06-13-digicommlab-phase1b-sampling-ui.md` / `…-phase2a-modulation-dsp.md`), generated just before
> that item is built. This document fixes each item's scope: exact files, DSP signatures, slide/book
> formulas, concrete example test values, UI surface, reuse, and acceptance — enough to review and to
> generate the sub-plan without re-deciding anything. Checkboxes track **item-level** completion.

**Goal:** Extend DigiCommLab beyond the committed 5-module roadmap with seven book-grounded enhancements
(line coding + PSD, Shannon/capacity overlay, delta modulation, matched filter, equalization, Turkish UI,
and a quiz/preset/share layer) — each a live, slide-faithful, independently deployable addition.

**Architecture:** Every item keeps the project's layering: pure unit-tested DSP in `src/lib/dsp/**`
(strict TDD), imperative Canvas/SVG draw helpers + React modules verified by smoke test + build, all live
demos driven by the existing `useSimulationLoop`, all math rendered with KaTeX, all strings via `t()`.
New DSP reuses committed APIs (`math.ts`, `spectrum.ts`, `pcm.ts`, `awgn.ts`, `modulation.ts`,
`ser.ts`, `sim/sources.ts`) — no duplication.

**Tech Stack:** React 18 + TypeScript (strict), Vite, Vitest (+ RTL/jsdom), Canvas 2D + inline SVG,
KaTeX, Web Audio API, `react-router-dom` HashRouter. `@` alias → `src/`. Tests `npm test -- <path>`,
lint `npm run lint` (exit 0), build `npm run build`. Commit trailer:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Book:** Proakis & Salehi, *Communication Systems Engineering* (2nd Ed.) — section numbers below refer to it.
**Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-design.md`.

---

## Committed-roadmap context (not part of items 1–7, but sequencing depends on it)

Current state: Phase 0 (infra) + Phase 1 (Sampling & Quantization, CH7) shipped; Phase 2a (Modulation DSP —
`modulation.ts`/`awgn.ts`/`detector.ts`/`ser.ts`) committed on branch `phase-2-modulation`; **Phase 2b
(Modulation UI) not yet built**; Huffman (CH10), Baseband (CH8), End-to-end (capstone) not started.

Two of the seven items have a hard prerequisite on committed-but-unbuilt work:

- **Item 2 (Shannon overlay)** overlays onto the Modulation module's SER-vs-Eb/N0 plot → needs **Phase 2b**.
- **Items 4 & 5 (matched filter, equalization)** live in the Baseband module (CH8) and share its pulse/ISI
  DSP (`pulse.ts`) → that DSP is built as the first task of each item if the Baseband module does not yet exist.

**Recommendation: finish Phase 2b (Modulation UI) first** — it is in-flight, its DSP is done, and it unblocks
Item 2. Items 1, 3, and 7a have no such prerequisite and can start immediately.

---

## Dependency & build order

| Order | Item | Title | Host | Hard prerequisite |
|------|------|-------|------|-------------------|
| E1.a | **3** | Delta Modulation (DM/DPCM) | new `modules/deltamod/` (CH7) | none (reuses sampling DSP + audio) |
| E1.b | **1** | Line Coding & PSD | new `modules/linecoding/` (CH8) | none (reuses `spectrum`/draw; adds `psd.ts`) |
| E1.c | **7a** | URL state sharing | `lib/url.ts` + hook | none (benefits all modules) |
| E2 | **2** | Channel Capacity / Shannon limit | extend `modules/modulation/` | Phase 2b Modulation UI |
| E3.a | **4** | Matched filter / correlation Rx | `modules/baseband/` (CH8) | Baseband `pulse.ts` (built in task 1) |
| E3.b | **5** | Equalization (ZF/MMSE) | `modules/baseband/` (CH8) | Baseband `pulse.ts` + ISI model |
| E4.a | **7b/7c** | Presets + Quiz / self-check | `components/` + `lib/quiz/` | modules exist (uses their DSP as answer key) |
| E4.b | **6** | Turkish UI (`tr.ts`) | `i18n/` | done last so the full key set is stable |

```
E1 (parallel, no prereq) ─┬─ Item 3  Delta Mod
                          ├─ Item 1  Line Coding + PSD
                          └─ Item 7a URL sharing
Phase 2b (Modulation UI) ──► E2 ── Item 2  Shannon overlay
Baseband DSP (pulse.ts) ───► E3 ─┬─ Item 4  Matched filter
                                 └─ Item 5  Equalization
all modules ───────────────► E4 ─┬─ Item 7b/7c Presets + Quiz
                                 └─ Item 6  Turkish UI (translate stable keys once)
```

Each item below ends **deployable** (tests green, lint clean, build OK), matching the spec's per-phase rule.

---

## Item 3 — Delta Modulation (DM) & DPCM  *(book §6.6; course CH7)*

- [ ] **Item 3 complete** → detailed sub-plan: `…-item3-deltamod.md`

**Why:** Slope-overload vs granular noise is the most *audible* concept in the course and the Web Audio
engine already exists ([sampling-audio.ts](src/lib/audio/sampling-audio.ts)) — the student *hears* the
distortion. Natural sibling to the existing PCM/sampling module.

**Host:** new `src/modules/deltamod/` at route `/delta-modulation` (CH7 group on Home + nav).

**Files**
- Create: `src/lib/dsp/deltamod.ts`
- Create: `src/modules/deltamod/{model.ts, DeltaModModule.tsx, panels.tsx, deltamod.css}`
- Create: `src/lib/audio/deltamod-audio.ts` (DM-reconstructed playback; mirrors the sampling-audio guard pattern)
- Modify: `src/i18n/en.ts` (`deltamod.*`), `src/App.tsx` (route+nav), `src/pages/Home.tsx` (card)
- Test: `tests/dsp/deltamod.test.ts`, `tests/modules/deltamod-model.test.ts`, `tests/modules/DeltaModModule.test.tsx`

**DSP (`deltamod.ts`) — signatures, formulas, example test values**

```ts
export interface DmResult { bits: Bit[]; staircase: number[] }
// 1-bit DM, predictor starts at x0: for each x[n], bit=1 & xhat+=step if x[n] >= xhat, else bit=0 & xhat-=step.
export function deltaModulate(signal: number[], step: number, x0?: number): DmResult
export function deltaDemodulate(bits: Bit[], step: number, x0?: number): number[]  // integrate ±step
// Max trackable slope before slope overload: step / Ts. No-overload condition: max|dx/dt| <= step*fs.
export function slopeOverloadLimit(step: number, fs: number): number               // = step * fs
```

- `deltaModulate([0.4, 0.9, 0.3], 0.5, 0)` → `{ bits:[1,1,0], staircase:[0.5,1.0,0.5] }`
- Granular noise on a flat input: `deltaModulate([0,0,0,0], 0.5, 0).bits` → `[1,0,1,0]`
- `slopeOverloadLimit(0.1, 8000)` → `800`
- `deltaDemodulate([1,1,0], 0.5, 0)` → `[0.5,1.0,0.5]` (round-trips the staircase)

**DPCM (optional extension within the same item):**
`dpcmEncode(signal, a, step)` with 1-tap predictor `x̂[n]=a·x_q[n-1]` and uniform quantized prediction error;
test that with `a=0` it reduces to plain quantization of `signal`.

**UI:** controls — tone freq/amp, sampling rate `fs`, step Δ, (optional) DPCM predictor `a`. Panels — signal +
staircase overlay (segments where `|slope|>step·fs` drawn red = slope overload), DM bitstream (`1010…`),
quantization error. Readouts — slope-overload threshold, granular step Δ, SNR. **Audio** — Play *original*
vs *DM-reconstructed* so overload/granular noise is audible. Theory box — DM staircase, slope-overload
condition `max|m'(t)| ≤ Δ·fs`, DPCM predictor gain. Live — `useSimulationLoop` scrolls the staircase building.

**Reuse:** `evalSignal`/`signalPeak` (signals), `useSimulationLoop`, `drawLine`/`drawStep`/`drawStems` (draw),
`Canvas`, audio-guard pattern from `sampling-audio.ts`.

**Acceptance:** DM tests pass; `/delta-modulation` renders; lowering Δ on a steep tone visibly *and* audibly
produces slope overload; flat input shows granular `1010…`; build + lint clean.

---

## Item 1 — Line Coding & Power Spectral Density  *(book §8.2; course CH8)*

- [ ] **Item 1 complete** → detailed sub-plan: `…-item1-linecoding.md`

**Why:** Picking a line code and watching both the waveform *and* its PSD (DC null, first-null bandwidth) is a
classic exam topic and highly visual. The empirical PSD of a long random bitstream *converging* to the
analytic curve mirrors the SER-odometer-converges-to-theory motif.

**Host:** new `src/modules/linecoding/` at route `/line-coding` (CH8 group).

**Files**
- Create: `src/lib/dsp/linecoding.ts`, `src/lib/dsp/psd.ts` (general averaged periodogram — none exists yet;
  `spectrum.ts` is analytic sampling-replica only)
- Create: `src/modules/linecoding/{model.ts, LineCodingModule.tsx, panels.tsx, linecoding.css}`
- Modify: `src/i18n/en.ts`, `src/App.tsx`, `src/pages/Home.tsx`
- Test: `tests/dsp/linecoding.test.ts`, `tests/dsp/psd.test.ts`, `tests/modules/linecoding-model.test.ts`,
  `tests/modules/LineCodingModule.test.tsx`

**DSP (`linecoding.ts`) — signatures + conventions + test values**

```ts
export type LineCode = 'unipolar-nrz' | 'polar-nrz' | 'unipolar-rz' | 'ami' | 'manchester';
// Sampled waveform, `spb` samples/bit, level amplitude A. AMI alternates the polarity of successive 1s;
// Manchester (1->[+A,-A], 0->[-A,+A]) and RZ (1->[A,0]) require spb even/>=2.
export function lineCodeWaveform(bits: Bit[], code: LineCode, spb: number, A?: number): number[];
// Analytic baseband PSD (A=1), normalized bit period T, sinc(x)=sin(pi x)/(pi x) from math.ts:
//   polar-nrz   : T*sinc(fT)^2
//   unipolar-nrz: (T/4)*sinc(fT)^2  (+ DC delta, reported separately via hasDcSpectralLine)
//   manchester  : T*sinc(fT/2)^2 * sin(pi fT/2)^2
//   ami         : T*sinc(fT)^2    * sin(pi fT)^2
export function lineCodePsdAnalytic(code: LineCode, f: number, T?: number): number;
export function hasDcSpectralLine(code: LineCode): boolean;   // true for unipolar-nrz/rz
export function firstNullBandwidth(code: LineCode, Tb: number): number; // NRZ/AMI: 1/Tb; Manchester: 2/Tb
```

- `lineCodeWaveform([1,0,1], 'polar-nrz', 2)` → `[1,1,-1,-1,1,1]`
- `lineCodeWaveform([1,1,0,1], 'ami', 1)` → `[1,-1,0,1]` (mark inversion)
- `lineCodeWaveform([1,0], 'manchester', 2)` → `[1,-1,-1,1]`
- `lineCodePsdAnalytic('polar-nrz', 1, 1)` → `0` (null at f=1/T, since sinc(1)=0); at `f=0` → `1`
- `lineCodePsdAnalytic('manchester', 0, 1)` → `0` and `lineCodePsdAnalytic('ami', 0, 1)` → `0` (no DC)
- `hasDcSpectralLine('manchester')` → `false`; `hasDcSpectralLine('unipolar-nrz')` → `true`

**DSP (`psd.ts`) — empirical PSD**

```ts
// Averaged periodogram via naive DFT (O(N^2), fine for N<=1024 offline / per-tick segments).
export function periodogram(signal: number[], fs: number, segLen: number): { freqs: number[]; psd: number[] };
```

- Periodogram of a pure cosine at `f0` concentrates power near `f0` (test: argmax bin freq ≈ f0 within one bin).
- DC signal → power in the 0-Hz bin only.

**UI:** controls — line code select, bit pattern (random/custom), bit rate, samples/bit. Panels — time
waveform (one color per code, AMI shows alternating polarity), **PSD panel** (empirical periodogram
accumulating live via `useSimulationLoop` + analytic curve overlaid, DC line flagged). Readouts —
first-null bandwidth, DC present (yes/no), bit rate. Theory box — the four PSD formulas + “why Manchester/AMI
kill DC”. 

**Reuse:** `drawLine`/`drawStep`/`drawScatter`/`drawAxes` (draw), `Canvas`, `useSimulationLoop`, `makeRng`
(sources) for random bits, `sinc` (math).

**Acceptance:** `linecoding`+`psd` tests pass; `/line-coding` renders; switching to Manchester visibly moves
the spectral null off DC and the empirical PSD tracks the analytic overlay; build + lint clean.

---

## Item 7a — URL state sharing  *(spec §10 “shareable configuration via URL params”)*

- [ ] **Item 7a complete** → folded into the detailed sub-plan: `…-item7-presets-quiz.md`

**Why:** Cheapest high-leverage feature: any module config becomes a deep link the instructor can paste. Built
as a shared hook so every module (existing and future) gains it.

**Files**
- Create: `src/lib/url.ts` (pure encode/decode), `src/lib/sim/useUrlState.ts` (hook binding state ↔ hash query)
- Test: `tests/lib/url.test.ts`
- Modify (adopt incrementally, one commit per module): `src/modules/*/[*]Module.tsx`

**DSP/pure (`url.ts`) — signatures + test values**

```ts
export function encodeParams(params: Record<string, string | number | boolean>): string; // -> "fs=20&bits=3&type=midrise"
export function decodeParams(query: string): Record<string, string>;                     // inverse, string values
```

- `encodeParams({ fs: 20, bits: 3, recon: true })` → `'bits=3&fs=20&recon=true'` (keys sorted → stable links)
- `decodeParams('fs=20&bits=3')` → `{ fs: '20', bits: '3' }`
- Round-trip: `decodeParams(encodeParams(p))` recovers every key (values as strings; caller coerces).

**Hook:** `useUrlState(key, initial, codec)` reads the hash query on mount, writes back on change (debounced),
no-ops under SSR/jsdom. Verified via the `url.ts` unit tests + a module smoke test (not separately unit-tested).

**Acceptance:** `url.test.ts` passes; opening `/#/sampling?fs=8&bits=2` restores those controls; changing a
control updates the address bar; build + lint clean.

---

## Item 2 — Channel Capacity / Shannon Limit  *(book §9.2–9.4; capstone of CH9)* — **prereq: Phase 2b**

- [ ] **Item 2 complete** → detailed sub-plan: `…-item2-capacity.md`

**Why:** Every student asks “how good can it get?”. Overlaying the Shannon bound on the existing
SER-vs-Eb/N0 plot turns each modulation scheme into a visible *gap-to-capacity*, and the −1.59 dB limit becomes
concrete. Low cost: pure formulas + one overlay on a plot that already exists after Phase 2b.

**Host:** extend `src/modules/modulation/` (add a `CapacityPanel` + overlay on the SER plot); optionally a
small standalone `/capacity` view reusing the same panel.

**Files**
- Create: `src/lib/dsp/capacity.ts`
- Modify: `src/modules/modulation/panels.tsx` (Shannon-limit marker on the SER plot), `…/ModulationModule.tsx`
  (capacity readouts), `src/i18n/en.ts`
- Test: `tests/dsp/capacity.test.ts`

**DSP (`capacity.ts`) — formulas + test values**

```ts
export function capacityPerHz(snrLinear: number): number;        // log2(1 + SNR)  [bits/s/Hz]
export function awgnCapacityBits(bWHz: number, snrLinear: number): number; // B*log2(1+SNR) [bits/s]
export function shannonLimitEbN0Db(spectralEff: number): number; // 10*log10((2^η - 1)/η)
export function gapToCapacityDb(ebN0Db: number, spectralEff: number): number; // ebN0Db - shannonLimitEbN0Db(η)
```

- `capacityPerHz(1)` → `1` (SNR 0 dB); `capacityPerHz(3)` → `2`
- `shannonLimitEbN0Db(1)` → `0` ; `shannonLimitEbN0Db(2)` → `10*log10(1.5)` ≈ `1.761`
- `shannonLimitEbN0Db(0.001)` → ≈ `-1.59` (the ln2 floor, within 0.01)
- `awgnCapacityBits(1000, 1)` → `1000`

**UI:** on the SER-vs-Eb/N0 plot, draw a vertical Shannon-limit line at the current scheme's spectral
efficiency (bits/symbol over the Nyquist bandwidth); readouts — capacity `C/B` at the current Eb/N0,
gap-to-capacity (dB) for the selected scheme at its operating BER. Theory box — `C=B·log2(1+S/N)`, the
bandwidth-efficiency plane, the −1.59 dB asymptote.

**Reuse:** `theoreticalSer`/`makeConstellation` (for η and the operating point), the Phase-2b SER plot panel,
`drawLine`/`drawVLine`, `Formula`.

**Acceptance:** `capacity.test.ts` passes; the Modulation SER plot shows the Shannon line and a live
gap-to-capacity readout that shrinks as schemes approach the bound; build + lint clean.

---

## Item 4 — Matched Filter / Correlation Receiver  *(book §7.5; course CH8/CH9 boundary)* — **prereq: Baseband `pulse.ts`**

- [ ] **Item 4 complete** → detailed sub-plan: `…-item4-matched-filter.md`

**Why:** The optimum receiver is abstract on paper; sliding the matched filter and watching its output *peak* to
the pulse energy `E` at `t=T` (and seeing peak SNR = `2E/N0`) makes “why we sample there” obvious.

**Host:** `src/modules/baseband/` (CH8). If the Baseband module is not yet built, task 1 of this item creates
the shared baseband DSP `pulse.ts` (raised-cosine/sinc pulses — spec §6.3) and the module shell.

**Files**
- Create: `src/lib/dsp/matchedfilter.ts` (+ `src/lib/dsp/pulse.ts` if absent)
- Create/Modify: `src/modules/baseband/{model.ts, BasebandModule.tsx, panels.tsx, baseband.css}`
- Modify: `src/i18n/en.ts`, `src/App.tsx`, `src/pages/Home.tsx`
- Test: `tests/dsp/matchedfilter.test.ts` (+ `tests/dsp/pulse.test.ts` if `pulse.ts` is new)

**DSP (`matchedfilter.ts`) — signatures + test values**

```ts
export function matchedFilter(pulse: number[]): number[];                 // time-reversed: h[n]=p[N-1-n]
export function convolve(x: number[], h: number[]): number[];            // full linear convolution
export function matchedFilterOutput(received: number[], pulse: number[]): number[]; // convolve(received, matchedFilter(pulse))
export function peakSnr(pulseEnergy: number, n0: number): number;        // = 2*E/N0
```

- `matchedFilter([1,2,3])` → `[3,2,1]`
- For `p=[1,1,1]` (E=3): `matchedFilterOutput(p, p)` peaks at the center sample with value `3` (= E)
- `convolve([1,2],[1,1])` → `[1,3,2]`
- `peakSnr(3, 2)` → `3`

**UI:** show the transmit pulse `p(t)`, the matched filter `h(t)=p(T−t)`, and the convolution output building as
`t` advances (`useSimulationLoop`), with a marker at the optimal sampling instant where output `= E`; noise
on/off contrasts MF vs a sub-optimal filter. Readouts — pulse energy `E`, peak SNR `2E/N0`. Theory box —
matched-filter = time-reversed pulse, output autocorrelation, peak-SNR optimality.

**Reuse:** `Canvas`, `drawLine`/`drawStems`/`drawVLine`, `useSimulationLoop`, `addAwgn` (awgn), `Formula`.

**Acceptance:** `matchedfilter.test.ts` (and `pulse.test.ts` if new) pass; the MF output visibly peaks to `E`
at the sampling instant; build + lint clean.

---

## Item 5 — Equalization (ZF / MMSE)  *(book §8.6.2; course CH8)* — **prereq: Baseband `pulse.ts` + ISI model**

- [ ] **Item 5 complete** → detailed sub-plan: `…-item5-equalization.md`

**Why:** “Open the closed eye.” An ISI channel collapses the eye; applying a ZF/MMSE equalizer reopens it —
the single most satisfying before/after in the whole course, and it pairs directly with the eye diagram.

**Host:** `src/modules/baseband/` (CH8) — extends the eye-diagram view from Item 4 / the committed Baseband phase.

**Files**
- Create: `src/lib/dsp/equalizer.ts`
- Modify: `src/modules/baseband/{model.ts, panels.tsx, BasebandModule.tsx}`, `src/i18n/en.ts`
- Test: `tests/dsp/equalizer.test.ts`

**DSP (`equalizer.ts`) — signatures + test values**

```ts
export function zeroForcingTaps(channel: number[], nTaps: number): number[]; // truncated inverse, forces ISI->0 at sample instants
export function mmseTaps(channel: number[], noiseVar: number, nTaps: number): number[]; // regularized; -> ZF as noiseVar->0
export function applyFilter(signal: number[], taps: number[]): number[];     // = convolve
export function residualIsi(channel: number[], taps: number[]): number;      // sum |（channel*taps)[k]| off the main tap
```

- `zeroForcingTaps([1, 0.5], 4)` ≈ `[1,-0.5,0.25,-0.125]` (geometric inverse of 1+0.5z⁻¹)
- `convolve([1,0.5], zeroForcingTaps([1,0.5],4))` → main tap `1`, samples 1–3 `≈0` (|·|<1e-9)
- `mmseTaps([1,0.5], 0, 4)` ≈ `zeroForcingTaps([1,0.5], 4)` (within 1e-6)
- `residualIsi([1,0.5], zeroForcingTaps([1,0.5],4))` → `≈0`

**UI:** adjustable ISI channel (tap sliders or roll-off) → eye closes; ZF/MMSE toggle + tap count → eye reopens;
panels — equalizer tap stem plot, combined channel response (→ impulse for ZF), eye diagram before vs after.
Readouts — residual ISI, noise enhancement (ZF) vs MMSE trade-off. Theory box — ZF inverts `H(z)`, MMSE
balances ISI vs noise.

**Reuse:** eye-diagram traces + ISI model from `pulse.ts`/Baseband, `Canvas`, `drawLine`/`drawStems`, `Formula`.

**Acceptance:** `equalizer.test.ts` passes; turning on ZF visibly reopens a closed eye and drives residual ISI
to ~0; MMSE shows less noise enhancement at low SNR; build + lint clean.

---

## Item 7b/7c — Presets + Quiz / Self-Check  *(spec §10 “quiz mode”, “worked examples”)*

- [ ] **Item 7b/7c complete** → detailed sub-plan: `…-item7-presets-quiz.md` (with 7a)

**Why:** Turns the tool from a sandbox into a study aid. Presets load slide-exact worked examples in one click;
the quiz uses the **already-tested DSP layer as the answer key** (no hand-entered answers to drift), so it is
correct by construction.

**Files**
- Create: `src/lib/quiz/types.ts` (`Question`, `QuizResult`), `src/lib/quiz/check.ts` (pure checker),
  `src/components/Presets.tsx`, `src/components/Quiz.tsx`, `src/components/quiz.css`
- Create per-module data: `src/modules/<m>/presets.ts`, `src/modules/<m>/questions.ts` (start with **sampling**
  as the template; others adopt the same shape later)
- Modify: the adopting module(s) + `src/i18n/en.ts`
- Test: `tests/quiz/check.test.ts`, `tests/modules/sampling-questions.test.ts`

**Pure (`quiz/check.ts`) — signatures + test values**

```ts
export interface Question {
  id: string; promptKey: string; params: Record<string, number | string>;
  answer: (p: Question['params']) => number;  // computed from DSP (the answer key)
  unit?: string; tolerance?: number;          // default relative tol 1e-3
}
export function checkAnswer(q: Question, userValue: number): { correct: boolean; expected: number };
```

- A Nyquist-rate question `params:{f1:5}`, `answer:()=>2*5` → `checkAnswer(q, 10)` → `{correct:true, expected:10}`;
  `checkAnswer(q, 9)` → `{correct:false, expected:10}`
- `sampling-questions.test.ts`: each question's `answer(params)` equals the corresponding DSP function on the
  same params (e.g. SQNR question === `sqnrTheoreticalDb(...)`) — guarantees the answer key can't drift from the lib.

**UI:** `Presets` dropdown sets the host module's state to a named config; `Quiz` panel sets the module to the
question's params, prompts for a value, and on submit calls `checkAnswer`, showing ✓/✗ + the expected value and
a “show me” button that animates the relevant readout.

**Reuse:** every module's existing DSP functions as answer keys; existing controls/state setters; `t()`.

**Acceptance:** `check.test.ts` + `sampling-questions.test.ts` pass; the Sampling module shows a Presets
dropdown and a working self-check; build + lint clean.

---

## Item 6 — Turkish UI (`tr.ts`)  *(spec D1 / §5.5 — i18n-ready, Turkish deferred by design)*

- [ ] **Item 6 complete** → detailed sub-plan: `…-item6-i18n-tr.md`

**Why:** EE413 students are Turkish; the i18n scaffold already exists and only the dictionary + a switcher are
missing. Highest practical-adoption ROI, lowest code risk. Done **last** so every new module's keys exist and
are translated once. Technical symbols (BPSK, SQNR, H(S), …) stay untranslated per spec §5.5.

**Files**
- Create: `src/i18n/tr.ts` (mirror of every `en` key, Turkish values)
- Modify: `src/i18n/index.ts` (add a `Locale` + `setLocale`/`getLocale`; `t()` reads the active dict),
  `src/App.tsx` (TR/EN toggle in the nav, persisted via Item 7a's URL/localStorage)
- Test: `tests/i18n/tr-parity.test.ts`

**Pure parity test — the safety net**

```ts
import { en } from '@/i18n/en';
import { tr } from '@/i18n/tr';
// tr must define exactly the same key set as en (no missing/extra keys) and no value left in English-only.
it('tr has the same keys as en', () => {
  expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
});
```

**`i18n/index.ts` refactor (concrete shape):**

```ts
import { en } from './en';
import { tr } from './tr';
const DICTS = { en, tr } as const;
export type Locale = keyof typeof DICTS;
let locale: Locale = 'en';
export function setLocale(l: Locale): void { locale = l; }
export function getLocale(): Locale { return locale; }
export function t(key: string): string { return DICTS[locale][key] ?? en[key] ?? key; }
```

**Acceptance:** `tr-parity.test.ts` passes (keys identical); the nav TR/EN toggle switches all UI text while
formulas/symbols stay put; choice persists across reloads; build + lint clean.

---

## Self-Review

**1. Item coverage of the user's seven recommendations:**
1 Line coding + PSD ✓ · 2 Shannon overlay ✓ · 3 Delta modulation ✓ · 4 Matched filter ✓ · 5 Equalization ✓ ·
6 Turkish UI ✓ · 7 Quiz/presets/URL sharing ✓ (split 7a URL / 7b presets / 7c quiz). All seven present.

**2. Prerequisite honesty (no silent gaps):** Item 2 explicitly gated on Phase 2b (Modulation UI); Items 4 & 5
explicitly create/depend on Baseband `pulse.ts`. Items 1, 3, 7a have no prerequisite and are the recommended
starting set. The in-flight Phase 2b is called out as the recommended first move even though it is not one of
the seven.

**3. Placeholder scan:** every item fixes exact file paths, concrete DSP signatures, book formulas, and worked
example test values (no “TBD”, no “add tests”, no “handle edge cases”). Step-by-step code is intentionally
deferred to each item's detailed sub-plan (the executable unit), per the scope-check — stated, not implied.

**4. Naming/type consistency:** reused APIs match the committed exports verified in the repo —
`sinc`/`qfunc`/`clamp`/`linspace` (math), `replicaLines` (spectrum), `toGray`/`toNBC`/`pcmStream` (pcm),
`makeRng`/`Bit` (sources), `useSimulationLoop({ticksPerSecond,onTick,onReset})`, `Canvas({height,ariaLabel,deps,draw})`,
`drawLine`/`drawStems`/`drawScatter`/`drawStep`/`drawVLine`/`drawAxes`/`linScale` (draw),
`makeConstellation`/`theoreticalSer` (modulation/ser). New symbols are introduced once and reused verbatim.

---

## Execution handoff

This roadmap is saved to
`docs/superpowers/plans/2026-06-13-digicommlab-enhancements-1-7-roadmap.md`. The unit of execution is a
**per-item detailed bite-sized TDD sub-plan** (phase1b/phase2a style). Recommended first item: **Item 3
(Delta Modulation)** or **Item 1 (Line Coding + PSD)** — both have zero prerequisites and ship a deployable
module; or **finish Phase 2b (Modulation UI)** first to unblock Item 2.

Two execution styles per item (chosen when we start one):
1. **Subagent-Driven (recommended)** — `superpowers:subagent-driven-development`: a fresh subagent per task with two-stage review between tasks.
2. **Inline Execution** — `superpowers:executing-plans`: batch execution in this session with checkpoints.
