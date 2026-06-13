# DigiCommLab Phase 1a — Sampling & Quantization DSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, unit-tested DSP foundation for the Sampling & Quantization module (CH7): signal model, sampling + sinc reconstruction + aliasing, uniform quantization + SQNR, and the line-spectrum/replica model. No React — these are pure functions consumed later by the module UI (Phase 1b).

**Architecture:** Add `sinc` to the existing `src/lib/dsp/math.ts`, then four new pure modules under `src/lib/dsp/`. Every function is slide-faithful (EE413 CH7) and TDD-tested with reference values taken from the slides.

**Tech Stack:** TypeScript, Vitest. `@` alias → `src/`. Run tests with `npm test -- <path>`.

> **Branch:** `phase-1-sampling`. **Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-design.md` §6.1. This is Phase **1a**; the module UI + live features (scrolling sampler, PCM bitstream, Web Audio) are Phase 1b, planned after this DSP exists.

> **Conventions:** Strict TDD (failing test first, confirm failure, implement, confirm pass). One commit per task. `npm run lint` must stay at exit 0. Run from repo root `/Users/huguryildiz/Documents/GitHub/digital-communications`.

---

## File Structure (Phase 1a)

```
src/lib/dsp/math.ts        # MODIFY: add sinc()
src/lib/dsp/signals.ts     # NEW: Tone model, evalSignal, bandwidth, peak, power, presets
src/lib/dsp/sampling.ts    # NEW: sample, sincReconstruct, aliasFrequency, nyquistRate, samplingRegime
src/lib/dsp/quantize.ts    # NEW: numLevels, step, quantize (midrise/midtread), error, SQNR (theo + measured)
src/lib/dsp/spectrum.ts    # NEW: baseband lines, replica lines, aliasing detection
tests/dsp/sinc.test.ts
tests/dsp/signals.test.ts
tests/dsp/sampling.test.ts
tests/dsp/quantize.test.ts
tests/dsp/spectrum.test.ts
```

---

## Task 1: Add `sinc` to math.ts (TDD)

**Files:** Modify `src/lib/dsp/math.ts`; Test `tests/dsp/sinc.test.ts`.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/sinc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sinc } from '@/lib/dsp/math';

describe('sinc (normalized: sin(pi x)/(pi x))', () => {
  it('sinc(0) = 1', () => {
    expect(sinc(0)).toBeCloseTo(1, 12);
  });
  it('sinc(integer) = 0', () => {
    expect(sinc(1)).toBeCloseTo(0, 12);
    expect(sinc(-3)).toBeCloseTo(0, 12);
  });
  it('sinc(0.5) = 2/pi', () => {
    expect(sinc(0.5)).toBeCloseTo(2 / Math.PI, 12);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/sinc.test.ts`
Expected: FAIL — `sinc` is not exported from `@/lib/dsp/math`.

- [ ] **Step 3: Append `sinc` to `src/lib/dsp/math.ts`** (add at the end of the file, do not change existing exports):

```ts

/** Normalized sinc: sin(pi*x)/(pi*x), with sinc(0) = 1. */
export function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/sinc.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/math.ts tests/dsp/sinc.test.ts
git commit -m "feat: add normalized sinc to dsp math"
```

---

## Task 2: Signal model — signals.ts (TDD)

**Files:** Create `src/lib/dsp/signals.ts`; Test `tests/dsp/signals.test.ts`.

The analog message is a sum of sinusoids `amp*cos(2*pi*freq*t + phase)`.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/signals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  evalSignal,
  signalBandwidth,
  signalPeak,
  signalPower,
  PRESETS,
} from '@/lib/dsp/signals';

describe('evalSignal', () => {
  it('single cosine at t=0 equals its amplitude', () => {
    expect(evalSignal([{ freq: 1, amp: 2 }], 0)).toBeCloseTo(2, 12);
  });
  it('cosine is zero at a quarter period', () => {
    expect(evalSignal([{ freq: 1, amp: 1 }], 0.25)).toBeCloseTo(0, 12);
  });
  it('sums components', () => {
    expect(evalSignal([{ freq: 1, amp: 1 }, { freq: 2, amp: 3 }], 0)).toBeCloseTo(4, 12);
  });
});

describe('signalBandwidth', () => {
  it('is the maximum component frequency', () => {
    expect(signalBandwidth([{ freq: 3, amp: 1 }, { freq: 7, amp: 1 }])).toBe(7);
  });
});

describe('signalPeak', () => {
  it('is the sum of absolute amplitudes', () => {
    expect(signalPeak([{ freq: 1, amp: 2 }, { freq: 2, amp: 3 }])).toBe(5);
  });
});

describe('signalPower', () => {
  it('is sum of amp^2/2 for cosines', () => {
    expect(signalPower([{ freq: 1, amp: 2 }])).toBeCloseTo(2, 12); // 4/2
    expect(signalPower([{ freq: 1, amp: 5 }])).toBeCloseTo(12.5, 12); // 25/2
  });
});

describe('PRESETS', () => {
  it('provides named tone sets', () => {
    expect(Array.isArray(PRESETS.singleTone)).toBe(true);
    expect(PRESETS.singleTone.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/signals.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/signals`.

- [ ] **Step 3: Create `src/lib/dsp/signals.ts`:**

```ts
/** A single sinusoidal component: amp * cos(2*pi*freq*t + phase). */
export interface Tone {
  freq: number;
  amp: number;
  phase?: number;
}

/** Evaluate the sum-of-sinusoids signal at time t (seconds). */
export function evalSignal(tones: Tone[], t: number): number {
  let v = 0;
  for (const tone of tones) {
    v += tone.amp * Math.cos(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
  }
  return v;
}

/** Bandwidth W = highest component frequency (Hz). 0 for an empty signal. */
export function signalBandwidth(tones: Tone[]): number {
  let w = 0;
  for (const tone of tones) w = Math.max(w, Math.abs(tone.freq));
  return w;
}

/** Peak amplitude bound m_max = sum of |amp| (worst-case alignment). */
export function signalPeak(tones: Tone[]): number {
  let p = 0;
  for (const tone of tones) p += Math.abs(tone.amp);
  return p;
}

/** Average power P_M = sum of amp^2 / 2 (distinct nonzero frequencies). */
export function signalPower(tones: Tone[]): number {
  let p = 0;
  for (const tone of tones) p += (tone.amp * tone.amp) / 2;
  return p;
}

/** Built-in example signals. */
export const PRESETS: Record<string, Tone[]> = {
  singleTone: [{ freq: 2, amp: 1 }],
  twoTone: [
    { freq: 2, amp: 1 },
    { freq: 5, amp: 0.6 },
  ],
  threeTone: [
    { freq: 1, amp: 1 },
    { freq: 3, amp: 0.5 },
    { freq: 6, amp: 0.35 },
  ],
};
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/signals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/signals.ts tests/dsp/signals.test.ts
git commit -m "feat: add sum-of-sinusoids signal model"
```

---

## Task 3: Sampling, reconstruction, aliasing — sampling.ts (TDD)

**Files:** Create `src/lib/dsp/sampling.ts`; Test `tests/dsp/sampling.test.ts`. Depends on Task 1 (`sinc`) and Task 2 (`Tone`, `evalSignal`, `signalBandwidth`).

- [ ] **Step 1: Write the failing test** — create `tests/dsp/sampling.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  sample,
  sincReconstruct,
  aliasFrequency,
  nyquistRate,
  samplingRegime,
} from '@/lib/dsp/sampling';

describe('sample', () => {
  it('produces samples at multiples of Ts across the interval', () => {
    const s = sample([{ freq: 1, amp: 1 }], 4, 0, 1); // Ts = 0.25
    expect(s.Ts).toBeCloseTo(0.25, 12);
    expect(s.times).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(s.values.length).toBe(5);
  });
});

describe('sincReconstruct', () => {
  it('reproduces the sample value exactly at a sampling instant', () => {
    const s = sample([{ freq: 1, amp: 1 }], 4, 0, 1);
    expect(sincReconstruct(s, s.times[2])).toBeCloseTo(s.values[2], 6);
  });
});

describe('aliasFrequency', () => {
  it('returns the input frequency when below Nyquist', () => {
    expect(aliasFrequency(3, 8)).toBeCloseTo(3, 12);
  });
  it('folds frequencies above Nyquist', () => {
    expect(aliasFrequency(5, 8)).toBeCloseTo(3, 12); // |5 - 8|
    expect(aliasFrequency(1, 1.5)).toBeCloseTo(0.5, 12); // |1 - 1.5|
  });
});

describe('nyquistRate', () => {
  it('is twice the bandwidth', () => {
    expect(nyquistRate([{ freq: 3, amp: 1 }, { freq: 7, amp: 1 }])).toBe(14);
  });
});

describe('samplingRegime', () => {
  it('classifies relative to 2W', () => {
    expect(samplingRegime(8, 3)).toBe('oversampling'); // 8 > 6
    expect(samplingRegime(6, 3)).toBe('nyquist'); // == 6
    expect(samplingRegime(4, 3)).toBe('undersampling'); // 4 < 6
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/sampling.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/sampling`.

- [ ] **Step 3: Create `src/lib/dsp/sampling.ts`:**

```ts
import { sinc } from './math';
import { evalSignal, signalBandwidth, type Tone } from './signals';

export interface Samples {
  times: number[];
  values: number[];
  Ts: number;
}

/** Sample a signal at rate fs over [tStart, tEnd] (inclusive of tEnd within Ts/2). */
export function sample(tones: Tone[], fs: number, tStart: number, tEnd: number): Samples {
  const Ts = 1 / fs;
  const times: number[] = [];
  const values: number[] = [];
  const n = Math.floor((tEnd - tStart) / Ts + 1e-9);
  for (let i = 0; i <= n; i++) {
    const t = tStart + i * Ts;
    times.push(t);
    values.push(evalSignal(tones, t));
  }
  return { times, values, Ts };
}

/** Whittaker-Shannon ideal reconstruction at time t from samples. */
export function sincReconstruct(s: Samples, t: number): number {
  let v = 0;
  for (let n = 0; n < s.times.length; n++) {
    v += s.values[n] * sinc((t - s.times[n]) / s.Ts);
  }
  return v;
}

/** Apparent (folded) frequency in [0, fs/2] for a tone of frequency f sampled at fs. */
export function aliasFrequency(f: number, fs: number): number {
  return Math.abs(f - fs * Math.round(f / fs));
}

/** Nyquist sampling rate = 2 * bandwidth. */
export function nyquistRate(tones: Tone[]): number {
  return 2 * signalBandwidth(tones);
}

export type SamplingRegime = 'oversampling' | 'nyquist' | 'undersampling';

/** Classify fs relative to the Nyquist rate 2W. */
export function samplingRegime(fs: number, bandwidth: number): SamplingRegime {
  const nyq = 2 * bandwidth;
  const tol = 1e-9 * Math.max(1, nyq);
  if (fs > nyq + tol) return 'oversampling';
  if (fs < nyq - tol) return 'undersampling';
  return 'nyquist';
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/sampling.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/sampling.ts tests/dsp/sampling.test.ts
git commit -m "feat: add sampling, sinc reconstruction, and aliasing"
```

---

## Task 4: Uniform quantization & SQNR — quantize.ts (TDD)

**Files:** Create `src/lib/dsp/quantize.ts`; Test `tests/dsp/quantize.test.ts`.

Slide-faithful: L = 2^R levels, step Δ = 2·m_max/L, midrise/midtread, SQNR[dB] = 10·log10(3·P_M/m_max²) + 6.02·R. Reference: a cosine of amplitude 5 with R=3 → 19.82 dB; R=4 → 25.84 dB (CH7 Example-2).

- [ ] **Step 1: Write the failing test** — create `tests/dsp/quantize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  numLevels,
  step,
  quantize,
  quantizeSignal,
  quantizationError,
  sqnrTheoreticalDb,
  sqnrMeasuredDb,
} from '@/lib/dsp/quantize';

describe('numLevels & step', () => {
  it('L = 2^R', () => {
    expect(numLevels(3)).toBe(8);
  });
  it('step = 2*mMax/L', () => {
    expect(step(1, 2)).toBeCloseTo(0.5, 12); // 2*1/4
  });
});

describe('quantize midrise (mMax=1, bits=2, delta=0.5)', () => {
  it('maps to mid-rise levels', () => {
    expect(quantize(0.1, 1, 2, 'midrise')).toBeCloseTo(0.25, 12);
    expect(quantize(-0.1, 1, 2, 'midrise')).toBeCloseTo(-0.25, 12);
    expect(quantize(0.9, 1, 2, 'midrise')).toBeCloseTo(0.75, 12);
  });
  it('clamps out-of-range inputs to the top level', () => {
    expect(quantize(5, 1, 2, 'midrise')).toBeCloseTo(0.75, 12);
  });
});

describe('quantize midtread (mMax=1, bits=2, delta=0.5)', () => {
  it('has a level at zero', () => {
    expect(quantize(0.1, 1, 2, 'midtread')).toBeCloseTo(0, 12);
    expect(quantize(0.3, 1, 2, 'midtread')).toBeCloseTo(0.5, 12);
    expect(quantize(-0.3, 1, 2, 'midtread')).toBeCloseTo(-0.5, 12);
  });
});

describe('error bound', () => {
  it('|error| <= delta/2 when the signal stays within +/- mMax', () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.cos((2 * Math.PI * i) / 50));
    const mMax = 1;
    const bits = 4;
    const q = quantizeSignal(values, mMax, bits, 'midrise');
    const err = quantizationError(values, q);
    const half = step(mMax, bits) / 2 + 1e-9;
    expect(Math.max(...err.map(Math.abs))).toBeLessThanOrEqual(half);
  });
});

describe('sqnrTheoreticalDb (slide reference values)', () => {
  it('cosine amp 5, R=3 -> 19.82 dB', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 3)).toBeCloseTo(19.82, 1);
  });
  it('cosine amp 5, R=4 -> 25.84 dB', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 4)).toBeCloseTo(25.84, 1);
  });
  it('adds ~6.02 dB per extra bit', () => {
    expect(sqnrTheoreticalDb(12.5, 5, 4) - sqnrTheoreticalDb(12.5, 5, 3)).toBeCloseTo(6.02, 1);
  });
});

describe('sqnrMeasuredDb', () => {
  it('is close to theoretical for a densely sampled cosine', () => {
    const values = Array.from({ length: 4000 }, (_, i) => 5 * Math.cos((2 * Math.PI * i) / 1000));
    const q = quantizeSignal(values, 5, 4, 'midrise');
    expect(sqnrMeasuredDb(values, q)).toBeGreaterThan(23);
    expect(sqnrMeasuredDb(values, q)).toBeLessThan(28);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/quantize.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/quantize`.

- [ ] **Step 3: Create `src/lib/dsp/quantize.ts`:**

```ts
import { clamp } from './math';

export type QuantizerType = 'midrise' | 'midtread';

/** Number of representation levels L = 2^bits. */
export function numLevels(bits: number): number {
  return 2 ** bits;
}

/** Uniform quantizer step size Δ = 2*mMax/L. */
export function step(mMax: number, bits: number): number {
  return (2 * mMax) / numLevels(bits);
}

/** Quantize a single value to L = 2^bits uniform levels in [-mMax, mMax]. */
export function quantize(value: number, mMax: number, bits: number, type: QuantizerType): number {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  if (type === 'midrise') {
    const k = clamp(Math.floor(value / d), -L / 2, L / 2 - 1);
    return (k + 0.5) * d;
  }
  // midtread: a level sits at 0
  const k = clamp(Math.round(value / d), -(L / 2 - 1), L / 2 - 1);
  return k * d;
}

/** Quantize an array of samples. */
export function quantizeSignal(
  values: number[],
  mMax: number,
  bits: number,
  type: QuantizerType,
): number[] {
  return values.map((v) => quantize(v, mMax, bits, type));
}

/** Per-sample quantization error e[n] = x[n] - Q(x[n]). */
export function quantizationError(values: number[], quantized: number[]): number[] {
  return values.map((v, i) => v - quantized[i]);
}

function meanSquare(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x * x;
  return s / xs.length;
}

/** Theoretical SQNR in dB: 10*log10(3*P_M/mMax^2) + 6.02*bits. */
export function sqnrTheoreticalDb(signalPower: number, mMax: number, bits: number): number {
  return 10 * Math.log10((3 * signalPower) / (mMax * mMax)) + 20 * bits * Math.log10(2);
}

/** Measured SQNR in dB from the actual signal and quantization error. */
export function sqnrMeasuredDb(values: number[], quantized: number[]): number {
  const err = quantizationError(values, quantized);
  return 10 * Math.log10(meanSquare(values) / meanSquare(err));
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/quantize.test.ts`
Expected: PASS (all groups, including slide reference SQNR values).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/quantize.ts tests/dsp/quantize.test.ts
git commit -m "feat: add uniform quantization and SQNR (theoretical + measured)"
```

---

## Task 5: Line spectrum & replicas — spectrum.ts (TDD)

**Files:** Create `src/lib/dsp/spectrum.ts`; Test `tests/dsp/spectrum.test.ts`. Depends on Task 2 (`Tone`, `signalBandwidth`).

A cosine of frequency f maps to two spectral lines at ±f with magnitude amp/2. Sampling replicates the baseband spectrum at every multiple of fs; replicas overlap (aliasing) when W > fs/2.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/spectrum.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { baselineLines, replicaLines, hasAliasing } from '@/lib/dsp/spectrum';

describe('baselineLines', () => {
  it('a cosine yields two lines at +/-f with magnitude amp/2', () => {
    const lines = baselineLines([{ freq: 2, amp: 1 }]);
    expect(lines).toHaveLength(2);
    const freqs = lines.map((l) => l.freq).sort((a, b) => a - b);
    expect(freqs).toEqual([-2, 2]);
    expect(lines[0].mag).toBeCloseTo(0.5, 12);
  });
});

describe('replicaLines', () => {
  it('shifts the baseband lines by every multiple of fs', () => {
    const lines = replicaLines([{ freq: 2, amp: 1 }], 8, 1); // n in {-1,0,1}
    expect(lines).toHaveLength(2 * 3); // 2 baseband lines x 3 replicas
    const freqs = lines.map((l) => l.freq);
    expect(freqs).toContain(2);
    expect(freqs).toContain(2 - 8);
    expect(freqs).toContain(2 + 8);
  });
});

describe('hasAliasing', () => {
  it('false when fs > 2W', () => {
    expect(hasAliasing([{ freq: 3, amp: 1 }], 8)).toBe(false); // 3 < 4
  });
  it('true when fs < 2W', () => {
    expect(hasAliasing([{ freq: 5, amp: 1 }], 8)).toBe(true); // 5 > 4
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/spectrum.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/spectrum`.

- [ ] **Step 3: Create `src/lib/dsp/spectrum.ts`:**

```ts
import { signalBandwidth, type Tone } from './signals';

export interface SpectralLine {
  freq: number;
  mag: number;
}

/** Baseband line spectrum: each cosine -> two lines at +/-freq, magnitude amp/2.
 *  A DC term (freq 0) yields a single line of magnitude |amp|. */
export function baselineLines(tones: Tone[]): SpectralLine[] {
  const lines: SpectralLine[] = [];
  for (const tone of tones) {
    if (tone.freq === 0) {
      lines.push({ freq: 0, mag: Math.abs(tone.amp) });
    } else {
      lines.push({ freq: tone.freq, mag: Math.abs(tone.amp) / 2 });
      lines.push({ freq: -tone.freq, mag: Math.abs(tone.amp) / 2 });
    }
  }
  return lines;
}

/** Sampled-spectrum replicas: baseband lines shifted by n*fs for n in [-numReplicas, numReplicas]. */
export function replicaLines(tones: Tone[], fs: number, numReplicas: number): SpectralLine[] {
  const base = baselineLines(tones);
  const out: SpectralLine[] = [];
  for (let n = -numReplicas; n <= numReplicas; n++) {
    for (const l of base) out.push({ freq: l.freq + n * fs, mag: l.mag });
  }
  return out;
}

/** Aliasing occurs when the bandwidth exceeds the folding frequency fs/2 (i.e., fs < 2W). */
export function hasAliasing(tones: Tone[], fs: number): boolean {
  return signalBandwidth(tones) > fs / 2;
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/spectrum.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/spectrum.ts tests/dsp/spectrum.test.ts
git commit -m "feat: add line spectrum, replicas, and aliasing detection"
```

---

## Final verification

- [ ] Run `npm test` — all suites pass (Phase 0's 17 tests + the new sinc/signals/sampling/quantize/spectrum tests).
- [ ] Run `npm run lint` — exit 0.
- [ ] Run `npm run build` — succeeds.
- [ ] `git status -s` — clean.

---

## Self-Review (spec coverage for Phase 1a)

- **Sampling theorem / Nyquist / aliasing** → Task 3 (`sample`, `sincReconstruct`, `aliasFrequency`, `nyquistRate`, `samplingRegime`). ✓
- **Spectrum replicas + overlap** → Task 5 (`baselineLines`, `replicaLines`, `hasAliasing`). ✓
- **Uniform quantization (midrise/midtread), error, SQNR theo+measured** → Task 4, validated against CH7 Example-2 values (19.82 / 25.84 dB). ✓
- **Signal model (bandwidth W, peak m_max, power P_M)** → Task 2. ✓
- **sinc** → Task 1. ✓

No placeholders; cross-file deps are explicit (`sampling` imports `sinc` + `signals`; `spectrum` imports `signals`; `quantize` imports `clamp`). The module UI, scrolling sampler, PCM bitstream, and Web Audio playback are Phase 1b (separate plan, written once these APIs are committed).
