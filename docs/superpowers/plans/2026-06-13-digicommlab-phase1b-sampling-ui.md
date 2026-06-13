# DigiCommLab Phase 1b — Sampling & Quantization Module UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive Sampling & Quantization module UI (CH7) on top of the Phase 1a DSP layer: a pure per-frame view builder, PCM codeword encoding, the live `/sampling` page with three linked Canvas panels (time / spectrum / quantization + error), controls, readouts, a theory box, a live scrolling oscilloscope sampler with a streaming PCM bitstream, and Web Audio playback so students *hear* aliasing and quantization noise.

**Architecture:** A new pure `pcm.ts` (codeword encoding) and two pure helpers added to `quantize.ts`, plus a pure `buildSamplingView()` frame builder in `src/modules/sampling/model.ts` keep all logic unit-tested and React-free. Two imperative Canvas helpers (`drawStep`, `drawVLine`) are added to `plot/draw.ts` (matching the existing untested-imperative convention). The React `SamplingModule` is a thin consumer: state → `buildSamplingView` (memoized) → Canvas panels + readouts. The live loop uses the existing `useSimulationLoop`; Web Audio is isolated in `src/lib/audio/`.

**Tech Stack:** React 18, TypeScript (strict), Vitest + React Testing Library (jsdom), Canvas 2D, KaTeX, Web Audio API. `@` alias → `src/`. Tests: `npm test -- <path>`. Lint `npm run lint` must stay exit 0. Build `npm run build`.

> **Branch:** `phase-1-sampling` (continues from Phase 1a). **Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-design.md` §6.1. **Depends on committed Phase 1a APIs:** `signals.ts` (`Tone`, `evalSignal`, `signalBandwidth`, `signalPeak`, `signalPower`, `PRESETS`), `sampling.ts` (`sample`, `sincReconstruct`, `aliasFrequency`, `nyquistRate`, `samplingRegime`, `Samples`, `SamplingRegime`), `quantize.ts` (`numLevels`, `step`, `quantize`, `quantizeSignal`, `quantizationError`, `sqnrTheoreticalDb`, `sqnrMeasuredDb`, `QuantizerType`), `spectrum.ts` (`baselineLines`, `replicaLines`, `hasAliasing`, `SpectralLine`), `math.ts` (`sinc`, `clamp`, `linspace`).

> **Conventions:** Strict TDD for pure logic (failing test first, confirm failure, implement, confirm pass). Imperative Canvas draw helpers follow the existing convention (no unit tests — `drawLine`/`drawStems`/`drawScatter` have none; verified via build + the module smoke test). One commit per task. Run from repo root `/Users/huguryildiz/Documents/GitHub/digital-communications`. Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure (Phase 1b)

```
src/lib/dsp/pcm.ts                     # NEW: codeIndex, toNBC, toGray, pcmCodeword, pcmStream
src/lib/dsp/quantize.ts                # MODIFY: add levelValues(), quantizationNoisePower()
src/lib/plot/draw.ts                   # MODIFY: add drawStep(), drawVLine()
src/modules/sampling/model.ts          # NEW: buildSamplingView() pure frame builder
src/modules/sampling/SamplingModule.tsx# NEW: the page (state, controls, panels, readouts, theory)
src/modules/sampling/panels.tsx        # NEW: Canvas panel components (Time/Spectrum/Quant/Error)
src/modules/sampling/sampling.css      # NEW: module-specific styles (bitstream, regime badge)
src/lib/audio/sampling-audio.ts        # NEW: Web Audio playback engine (guarded, gesture-started)
src/i18n/en.ts                         # MODIFY: add sampling.* strings
src/App.tsx                            # MODIFY: route /sampling -> SamplingModule

tests/dsp/pcm.test.ts                  # NEW
tests/dsp/quantize.test.ts             # MODIFY (extend)
tests/modules/sampling-model.test.ts   # NEW
tests/modules/SamplingModule.test.tsx  # NEW (RTL smoke test)
```

---

## Task 1: PCM codeword encoding — pcm.ts (TDD)

**Files:** Create `src/lib/dsp/pcm.ts`; Test `tests/dsp/pcm.test.ts`. Imports `clamp`, `numLevels` from existing modules. Relies on the Phase 1a midtread fix (quantizer spans the full `L = 2^bits` codes), so `codeIndex` is in `[0, L-1]` for both quantizer types.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/pcm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { codeIndex, toNBC, toGray, pcmCodeword, pcmStream } from '@/lib/dsp/pcm';

describe('codeIndex (mMax=1, bits=2 -> L=4, delta=0.5)', () => {
  it('midrise maps the four sub-ranges to indices 0..3', () => {
    expect(codeIndex(-0.9, 1, 2, 'midrise')).toBe(0);
    expect(codeIndex(-0.1, 1, 2, 'midrise')).toBe(1);
    expect(codeIndex(0.1, 1, 2, 'midrise')).toBe(2);
    expect(codeIndex(0.9, 1, 2, 'midrise')).toBe(3);
  });
  it('clamps out-of-range to the top index', () => {
    expect(codeIndex(99, 1, 2, 'midrise')).toBe(3);
    expect(codeIndex(-99, 1, 2, 'midrise')).toBe(0);
  });
  it('midtread spans all four indices', () => {
    expect(codeIndex(-0.9, 1, 2, 'midtread')).toBe(0); // -1.0 level
    expect(codeIndex(-0.3, 1, 2, 'midtread')).toBe(1); // -0.5
    expect(codeIndex(0.1, 1, 2, 'midtread')).toBe(2); // 0
    expect(codeIndex(0.3, 1, 2, 'midtread')).toBe(3); // +0.5
  });
});

describe('toNBC (natural binary, MSB first)', () => {
  it('encodes an index to a fixed-width bit array', () => {
    expect(toNBC(0, 2)).toEqual([0, 0]);
    expect(toNBC(1, 2)).toEqual([0, 1]);
    expect(toNBC(2, 2)).toEqual([1, 0]);
    expect(toNBC(3, 2)).toEqual([1, 1]);
    expect(toNBC(5, 3)).toEqual([1, 0, 1]);
  });
});

describe('toGray', () => {
  it('produces the reflected binary Gray code sequence', () => {
    expect([0, 1, 2, 3].map(toGray)).toEqual([0, 1, 3, 2]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(toGray)).toEqual([0, 1, 3, 2, 6, 7, 5, 4]);
  });
});

describe('pcmCodeword', () => {
  it('NBC codeword has length=bits and matches the natural index', () => {
    expect(pcmCodeword(0.9, 1, 2, 'midrise', 'nbc')).toEqual([1, 1]); // index 3
  });
  it('Gray codeword applies the Gray map to the index', () => {
    // index 3 -> gray 2 -> [1,0]
    expect(pcmCodeword(0.9, 1, 2, 'midrise', 'gray')).toEqual([1, 0]);
    // index 2 -> gray 3 -> [1,1]
    expect(pcmCodeword(0.1, 1, 2, 'midrise', 'gray')).toEqual([1, 1]);
  });
});

describe('pcmStream', () => {
  it('concatenates one codeword per sample (length = n*bits)', () => {
    const bits = pcmStream([-0.9, 0.9], 1, 2, 'midrise', 'nbc');
    expect(bits).toEqual([0, 0, 1, 1]); // index 0 -> 00, index 3 -> 11
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/pcm.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/pcm`.

- [ ] **Step 3: Create `src/lib/dsp/pcm.ts`:**

```ts
import { clamp } from './math';
import { numLevels, type QuantizerType } from './quantize';
import type { Bit } from '@/lib/sim/sources';

/** PCM codeword bit-to-symbol mapping. */
export type PcmCoding = 'nbc' | 'gray';

/**
 * Quantizer code index in [0, L-1] for a value, where L = 2^bits.
 * Mirrors the level selection in `quantize`: midrise uses floor, midtread
 * uses round; both clamp the integer level k to [-L/2, L/2-1] and offset by
 * L/2 so the smallest level maps to 0 and the largest to L-1.
 */
export function codeIndex(
  value: number,
  mMax: number,
  bits: number,
  type: QuantizerType,
): number {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  const k =
    type === 'midrise'
      ? clamp(Math.floor(value / d), -L / 2, L / 2 - 1)
      : clamp(Math.round(value / d), -L / 2, L / 2 - 1);
  return k + L / 2;
}

/** Natural binary code: index -> bits, MSB first, fixed width. */
export function toNBC(index: number, bits: number): Bit[] {
  const out: Bit[] = [];
  for (let b = bits - 1; b >= 0; b--) out.push(((index >> b) & 1) as Bit);
  return out;
}

/** Reflected binary (Gray) code of an index. */
export function toGray(index: number): number {
  return index ^ (index >> 1);
}

/** Encode one sample to an R-bit PCM codeword under the chosen coding. */
export function pcmCodeword(
  value: number,
  mMax: number,
  bits: number,
  type: QuantizerType,
  coding: PcmCoding,
): Bit[] {
  const idx = codeIndex(value, mMax, bits, type);
  const symbol = coding === 'gray' ? toGray(idx) : idx;
  return toNBC(symbol, bits);
}

/** Encode a sequence of samples into a flat PCM bitstream. */
export function pcmStream(
  values: number[],
  mMax: number,
  bits: number,
  type: QuantizerType,
  coding: PcmCoding,
): Bit[] {
  const out: Bit[] = [];
  for (const v of values) out.push(...pcmCodeword(v, mMax, bits, type, coding));
  return out;
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/pcm.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` (exit 0). Then:

```bash
git add src/lib/dsp/pcm.ts tests/dsp/pcm.test.ts
git commit -m "feat: add PCM codeword encoding (NBC/Gray) for sampling module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Quantization viz helpers — extend quantize.ts (TDD)

**Files:** Modify `src/lib/dsp/quantize.ts` (append two functions; do not change existing exports); Modify `tests/dsp/quantize.test.ts` (append two describe blocks).

`levelValues` returns the L representation levels (ascending) for drawing horizontal quantizer level-lines. `quantizationNoisePower` is the slide's uniform-quantizer noise power `E[Q²] = Δ²/12`.

- [ ] **Step 1: Write the failing test** — append to `tests/dsp/quantize.test.ts` (add these imports to the existing top import list: `levelValues`, `quantizationNoisePower`):

```ts
describe('levelValues', () => {
  it('midrise: L levels at (k+0.5)*delta, ascending', () => {
    expect(levelValues(1, 2, 'midrise')).toEqual([-0.75, -0.25, 0.25, 0.75]);
  });
  it('midtread: L levels at k*delta including zero, ascending', () => {
    expect(levelValues(1, 2, 'midtread')).toEqual([-1, -0.5, 0, 0.5]);
  });
  it('has exactly L = 2^bits entries', () => {
    expect(levelValues(2, 3, 'midrise')).toHaveLength(8);
  });
});

describe('quantizationNoisePower', () => {
  it('equals delta^2 / 12', () => {
    // mMax=1, bits=2 -> delta=0.5 -> 0.25/12
    expect(quantizationNoisePower(1, 2)).toBeCloseTo(0.25 / 12, 12);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/quantize.test.ts`
Expected: FAIL — `levelValues` / `quantizationNoisePower` not exported.

- [ ] **Step 3: Append to `src/lib/dsp/quantize.ts`** (after the existing exports; the file already imports `clamp` and defines `numLevels`, `step`):

```ts

/** The L = 2^bits representation levels (ascending). Mirrors `quantize`:
 *  midrise at (k+0.5)*Δ, midtread at k*Δ, for k in [-L/2, L/2-1]. */
export function levelValues(mMax: number, bits: number, type: QuantizerType): number[] {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  const out: number[] = [];
  for (let k = -L / 2; k <= L / 2 - 1; k++) {
    out.push(type === 'midrise' ? (k + 0.5) * d : k * d);
  }
  return out;
}

/** Uniform-quantizer noise power E[Q^2] = Δ^2 / 12. */
export function quantizationNoisePower(mMax: number, bits: number): number {
  const d = step(mMax, bits);
  return (d * d) / 12;
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/quantize.test.ts`
Expected: PASS (existing + the two new groups).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` (exit 0). Then:

```bash
git add src/lib/dsp/quantize.ts tests/dsp/quantize.test.ts
git commit -m "feat: add levelValues and quantizationNoisePower helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Frame builder + Canvas draw helpers (TDD for the pure builder)

**Files:** Create `src/modules/sampling/model.ts`; Create `tests/modules/sampling-model.test.ts`; Modify `src/lib/plot/draw.ts` (append `drawStep`, `drawVLine`).

`buildSamplingView` is a pure function that assembles every array a panel needs for a given time window plus all scalar metrics — unit-tested. `drawStep`/`drawVLine` are imperative Canvas helpers (no unit test, matching `drawLine`/`drawStems`).

- [ ] **Step 1: Write the failing test** — create `tests/modules/sampling-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSamplingView, type SamplingParams } from '@/modules/sampling/model';

const base: SamplingParams = {
  tones: [{ freq: 2, amp: 1 }],
  fs: 20,
  bits: 3,
  mMax: 1,
  type: 'midrise',
  coding: 'nbc',
  t0: 0,
  windowSec: 1,
  analogN: 200,
};

describe('buildSamplingView', () => {
  it('produces dense analog/reconstructed curves and discrete samples', () => {
    const v = buildSamplingView(base);
    expect(v.analog.t).toHaveLength(200);
    expect(v.reconstructed.t).toHaveLength(200);
    expect(v.samples.t.length).toBeGreaterThan(0);
    expect(v.samples.t.length).toBe(v.samples.x.length);
    expect(v.quantized.x).toHaveLength(v.samples.x.length);
    expect(v.error.e).toHaveLength(v.samples.x.length);
  });

  it('reconstruction reproduces sample values at sampling instants when fs > 2W', () => {
    const v = buildSamplingView(base);
    const i = Math.floor(v.samples.t.length / 2);
    const ti = v.samples.t[i];
    // find the reconstructed value nearest ti
    let best = 0;
    for (let j = 1; j < v.reconstructed.t.length; j++) {
      if (Math.abs(v.reconstructed.t[j] - ti) < Math.abs(v.reconstructed.t[best] - ti)) best = j;
    }
    expect(v.reconstructed.t[best]).toBeCloseTo(ti, 2);
    expect(v.reconstructed.x[best]).toBeCloseTo(v.samples.x[i], 1);
  });

  it('classifies the sampling regime and Nyquist rate', () => {
    expect(buildSamplingView({ ...base, fs: 20 }).regime).toBe('oversampling'); // 20 > 4
    expect(buildSamplingView({ ...base, fs: 3 }).regime).toBe('undersampling'); // 3 < 4
    expect(buildSamplingView(base).nyquist).toBe(4);
    expect(buildSamplingView(base).bandwidth).toBe(2);
  });

  it('emits a PCM bitstream of length n*bits', () => {
    const v = buildSamplingView(base);
    expect(v.pcm).toHaveLength(v.samples.x.length * base.bits);
  });

  it('reports delta, noise power, and both SQNR values', () => {
    const v = buildSamplingView(base);
    expect(v.delta).toBeCloseTo((2 * 1) / 8, 12); // 2*mMax/L, L=8
    expect(v.noisePower).toBeCloseTo(v.delta * v.delta / 12, 12);
    expect(Number.isFinite(v.sqnrTheoryDb)).toBe(true);
    expect(Number.isFinite(v.sqnrMeasuredDb)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/modules/sampling-model.test.ts`
Expected: FAIL — cannot resolve `@/modules/sampling/model`.

- [ ] **Step 3a: Create `src/modules/sampling/model.ts`:**

```ts
import { evalSignal, signalBandwidth, signalPower, type Tone } from '@/lib/dsp/signals';
import {
  sample,
  sincReconstruct,
  nyquistRate,
  samplingRegime,
  type SamplingRegime,
} from '@/lib/dsp/sampling';
import {
  quantize,
  quantizationError,
  step,
  quantizationNoisePower,
  sqnrTheoreticalDb,
  sqnrMeasuredDb,
  type QuantizerType,
} from '@/lib/dsp/quantize';
import { pcmStream, type PcmCoding } from '@/lib/dsp/pcm';
import { linspace } from '@/lib/dsp/math';
import type { Bit } from '@/lib/sim/sources';

export interface SamplingParams {
  tones: Tone[];
  fs: number;
  bits: number;
  mMax: number;
  type: QuantizerType;
  coding: PcmCoding;
  /** Left edge of the visible time window (seconds). */
  t0: number;
  /** Width of the visible time window (seconds). */
  windowSec: number;
  /** Dense-curve resolution for analog + reconstructed traces. */
  analogN?: number;
}

export interface XY {
  t: number[];
  x: number[];
}

export interface SamplingView {
  analog: XY;
  samples: XY;
  reconstructed: XY;
  quantized: XY;
  error: { t: number[]; e: number[] };
  pcm: Bit[];
  bandwidth: number;
  nyquist: number;
  regime: SamplingRegime;
  delta: number;
  noisePower: number;
  sqnrTheoryDb: number;
  sqnrMeasuredDb: number;
}

/** Assemble all panel traces + scalar metrics for a time window. Pure. */
export function buildSamplingView(p: SamplingParams): SamplingView {
  const { tones, fs, bits, mMax, type, coding, t0, windowSec } = p;
  const analogN = p.analogN ?? 400;
  const t1 = t0 + windowSec;

  const at = linspace(t0, t1, analogN);
  const ax = at.map((t) => evalSignal(tones, t));

  const s = sample(tones, fs, t0, t1);
  const rx = at.map((t) => sincReconstruct(s, t));

  const qx = s.values.map((v) => quantize(v, mMax, bits, type));
  const err = quantizationError(s.values, qx);
  const pcm = pcmStream(s.values, mMax, bits, type, coding);

  return {
    analog: { t: at, x: ax },
    samples: { t: s.times, x: s.values },
    reconstructed: { t: at, x: rx },
    quantized: { t: s.times, x: qx },
    error: { t: s.times, e: err },
    pcm,
    bandwidth: signalBandwidth(tones),
    nyquist: nyquistRate(tones),
    regime: samplingRegime(fs, signalBandwidth(tones)),
    delta: step(mMax, bits),
    noisePower: quantizationNoisePower(mMax, bits),
    sqnrTheoryDb: sqnrTheoreticalDb(signalPower(tones), mMax, bits),
    sqnrMeasuredDb: sqnrMeasuredDb(s.values, qx),
  };
}
```

- [ ] **Step 3b: Append `drawStep` and `drawVLine` to `src/lib/plot/draw.ts`** (do not change existing functions):

```ts

/** Draw a sample-and-hold staircase through (xs[i], ys[i]). */
export function drawStep(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  width = 2,
): void {
  if (xs.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax.x(xs[0]), ax.y(ys[0]));
  for (let i = 1; i < xs.length; i++) {
    ctx.lineTo(ax.x(xs[i]), ax.y(ys[i - 1])); // hold previous level
    ctx.lineTo(ax.x(xs[i]), ax.y(ys[i])); // step to new level
  }
  ctx.stroke();
}

/** Draw a vertical line at data-x spanning data-y [y0, y1]. */
export function drawVLine(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xData: number,
  y0: number,
  y1: number,
  color: string,
  dashed = false,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [4, 4] : []);
  const px = ax.x(xData);
  ctx.beginPath();
  ctx.moveTo(px, ax.y(y0));
  ctx.lineTo(px, ax.y(y1));
  ctx.stroke();
  ctx.setLineDash([]);
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/modules/sampling-model.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` (exit 0). Then:

```bash
git add src/modules/sampling/model.ts tests/modules/sampling-model.test.ts src/lib/plot/draw.ts
git commit -m "feat: add sampling view frame builder and step/vline draw helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Static Sampling module UI — panels, controls, readouts, theory, route

**Files:** Create `src/modules/sampling/panels.tsx`, `src/modules/sampling/SamplingModule.tsx`, `src/modules/sampling/sampling.css`; Create `tests/modules/SamplingModule.test.tsx`; Modify `src/i18n/en.ts`, `src/App.tsx`.

This task delivers the full static (non-animated) module: four Canvas panels, the control sidebar, the readouts, and a KaTeX theory box, wired into the `/sampling` route. The live loop and audio come in Tasks 5–6, so `t0` is fixed at `0` here.

- [ ] **Step 1: Write the failing smoke test** — create `tests/modules/SamplingModule.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SamplingModule } from '@/modules/sampling/SamplingModule';

describe('SamplingModule', () => {
  it('renders controls, panels, and key readouts', () => {
    render(<SamplingModule />);
    // four Canvas panels (role=img via the Canvas wrapper)
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(4);
    // unique plain-text readout labels (avoid KaTeX/duplicate "Nyquist"/"SQNR" matches)
    expect(screen.getByText('Bandwidth W')).toBeInTheDocument();
    expect(screen.getByText('SQNR (theory)')).toBeInTheDocument();
    // the regime value is reported; default fs=20 with W=2 is oversampling
    expect(screen.getByText('Oversampling')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/modules/SamplingModule.test.tsx`
Expected: FAIL — cannot resolve `@/modules/sampling/SamplingModule`.

- [ ] **Step 3a: Add i18n strings** — in `src/i18n/en.ts`, add these keys to the `en` object (before the closing `}`):

```ts
  'sampling.signal': 'Signal',
  'sampling.preset.single': 'Single tone',
  'sampling.preset.two': 'Two tones',
  'sampling.preset.three': 'Three tones',
  'sampling.toneFreq': 'Tone frequency f₁',
  'sampling.fs': 'Sampling rate fₛ',
  'sampling.bits': 'Resolution R',
  'sampling.quantizer': 'Quantizer',
  'sampling.midrise': 'Mid-rise',
  'sampling.midtread': 'Mid-tread',
  'sampling.coding': 'PCM coding',
  'sampling.nbc': 'Natural binary',
  'sampling.gray': 'Gray',
  'sampling.reconstruct': 'Show sinc reconstruction',
  'sampling.panel.time': 'Time domain',
  'sampling.panel.spectrum': 'Spectrum (replicas)',
  'sampling.panel.quant': 'Quantization',
  'sampling.panel.error': 'Quantization error e[n]',
  'sampling.readout.bandwidth': 'Bandwidth W',
  'sampling.readout.nyquist': 'Nyquist rate 2W',
  'sampling.readout.regime': 'Regime',
  'sampling.readout.aliasFreq': 'Alias frequency',
  'sampling.readout.levels': 'Levels L',
  'sampling.readout.delta': 'Step Δ',
  'sampling.readout.noise': 'Noise power Δ²/12',
  'sampling.readout.sqnrTheory': 'SQNR (theory)',
  'sampling.readout.sqnrMeasured': 'SQNR (measured)',
  'sampling.theory.title': 'Theory — sampling & quantization',
  'sampling.pcm.title': 'PCM bitstream',
```

- [ ] **Step 3b: Create `src/modules/sampling/sampling.css`:**

```css
.sampling__panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 1100px) {
  .sampling__panels {
    grid-template-columns: 1fr;
  }
}
.sampling__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.sampling__readouts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
.sampling__bitstream {
  font-family: var(--mono);
  font-size: 0.85rem;
  word-break: break-all;
  line-height: 1.6;
  color: var(--text);
  background: var(--surface-2, rgba(127, 127, 127, 0.12));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2);
  min-height: 3.2em;
}
.sampling__bitstream b {
  color: var(--accent);
}
.regime-badge {
  font-weight: 600;
}
.regime-badge--ok {
  color: var(--ok, #46c93a);
}
.regime-badge--warn {
  color: var(--warn, #e0a800);
}
.regime-badge--err {
  color: var(--err, #ff5c5c);
}
```

- [ ] **Step 3c: Create `src/modules/sampling/panels.tsx`:**

```tsx
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawAxes,
  drawLine,
  drawStems,
  drawStep,
  drawVLine,
  type Axes,
} from '@/lib/plot/draw';
import { replicaLines, hasAliasing } from '@/lib/dsp/spectrum';
import { levelValues } from '@/lib/dsp/quantize';
import type { SamplingView } from './model';
import type { Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';

const COL = {
  analog: '#4aa3ff',
  sample: '#ffb454',
  recon: '#9aa7b4',
  quant: '#46c93a',
  level: 'rgba(154,167,180,0.25)',
  error: '#ff7c7c',
  base: '#4aa3ff',
  replica: 'rgba(154,167,180,0.5)',
  alias: 'rgba(255,92,92,0.22)',
  marker: 'rgba(255,92,92,0.8)',
  cursor: 'rgba(255,180,84,0.9)',
};

const PAD = { l: 8, r: 8, t: 10, b: 10 };

function axesFor(
  w: number,
  h: number,
  domX: [number, number],
  domY: [number, number],
): Axes {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

export interface TimePanelProps {
  view: SamplingView;
  mMax: number;
  showReconstruction: boolean;
  /** Optional sweep-cursor time (live mode). */
  cursorT?: number;
}

export function TimePanel({ view, mMax, showReconstruction, cursorT }: TimePanelProps) {
  const yMax = mMax * 1.15;
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={200}
      ariaLabel="Time domain: analog signal, samples, reconstruction"
      deps={[view, mMax, showReconstruction, cursorT]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, view.analog.t, view.analog.x, COL.analog, 2);
        if (showReconstruction) {
          drawLine(ctx, ax, view.reconstructed.t, view.reconstructed.x, COL.recon, 1.5, true);
        }
        drawStems(ctx, ax, view.samples.t, view.samples.x, COL.sample, 3);
        if (cursorT != null) drawVLine(ctx, ax, cursorT, -yMax, yMax, COL.cursor, false, 1.5);
      }}
    />
  );
}

export interface SpectrumPanelProps {
  tones: Tone[];
  fs: number;
}

export function SpectrumPanel({ tones, fs }: SpectrumPanelProps) {
  const lines = replicaLines(tones, fs, 2);
  const W = tones.reduce((m, t) => Math.max(m, Math.abs(t.freq)), 0);
  const aliasing = hasAliasing(tones, fs);
  const fMax = Math.max(fs * 1.6, W * 1.4, 1);
  const magMax = lines.reduce((m, l) => Math.max(m, l.mag), 0.5) * 1.25;
  return (
    <Canvas
      height={200}
      ariaLabel="Frequency domain: spectral replicas and aliasing"
      deps={[tones, fs]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-fMax, fMax], [0, magMax]);
        drawAxes(ctx, ax, [-fMax, fMax]);
        // overlap shading when undersampling: baseband [.,W] meets replica down to fs-W
        if (aliasing) {
          const lo = fs - W;
          ctx.fillStyle = COL.alias;
          const x0 = ax.x(lo);
          const x1 = ax.x(W);
          ctx.fillRect(Math.min(x0, x1), PAD.t, Math.abs(x1 - x0), h - PAD.t - PAD.b);
          const mx0 = ax.x(-W);
          const mx1 = ax.x(-lo);
          ctx.fillRect(Math.min(mx0, mx1), PAD.t, Math.abs(mx1 - mx0), h - PAD.t - PAD.b);
        }
        // baseband (n=0) lines bright; replicas dim
        for (const l of lines) {
          const isBase = Math.abs(l.freq) <= W + 1e-9;
          drawStems(ctx, ax, [l.freq], [l.mag], isBase ? COL.base : COL.replica, 2.5);
        }
        // folding frequency markers at +/- fs/2
        drawVLine(ctx, ax, fs / 2, 0, magMax, COL.marker, true, 1);
        drawVLine(ctx, ax, -fs / 2, 0, magMax, COL.marker, true, 1);
      }}
    />
  );
}

export interface QuantPanelProps {
  view: SamplingView;
  mMax: number;
  bits: number;
  type: QuantizerType;
}

export function QuantPanel({ view, mMax, bits, type }: QuantPanelProps) {
  const yMax = mMax * 1.15;
  const levels = levelValues(mMax, bits, type);
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={200}
      ariaLabel="Quantization: signal, staircase, and levels"
      deps={[view, mMax, bits, type]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        for (const lv of levels) drawLine(ctx, ax, [t0, t1], [lv, lv], COL.level, 1);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, view.analog.t, view.analog.x, COL.analog, 1.5);
        drawStep(ctx, ax, view.quantized.t, view.quantized.x, COL.quant, 2);
      }}
    />
  );
}

export interface ErrorPanelProps {
  view: SamplingView;
  delta: number;
}

export function ErrorPanel({ view, delta }: ErrorPanelProps) {
  const yMax = (delta / 2) * 1.4 || 1;
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={130}
      ariaLabel="Quantization error per sample"
      deps={[view, delta]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        // +/- delta/2 bounds
        drawLine(ctx, ax, [t0, t1], [delta / 2, delta / 2], COL.level, 1);
        drawLine(ctx, ax, [t0, t1], [-delta / 2, -delta / 2], COL.level, 1);
        drawAxes(ctx, ax, [t0, t1]);
        drawStems(ctx, ax, view.error.t, view.error.e, COL.error, 2.5);
      }}
    />
  );
}
```

- [ ] **Step 3d: Create `src/modules/sampling/SamplingModule.tsx`:**

```tsx
import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  TheoryBox,
  Formula,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, signalPeak, type Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';
import type { PcmCoding } from '@/lib/dsp/pcm';
import { buildSamplingView } from './model';
import { TimePanel, SpectrumPanel, QuantPanel, ErrorPanel } from './panels';
import './sampling.css';

type PresetKey = 'single' | 'two' | 'three';

const PRESET_TONES: Record<PresetKey, Tone[]> = {
  single: PRESETS.singleTone,
  two: PRESETS.twoTone,
  three: PRESETS.threeTone,
};

const REGIME_TONE = {
  oversampling: 'ok',
  nyquist: 'warn',
  undersampling: 'err',
} as const;

const WINDOW_SEC = 1;

export function SamplingModule() {
  const [preset, setPreset] = useState<PresetKey>('single');
  const [toneFreq, setToneFreq] = useState(2);
  const [fs, setFs] = useState(20);
  const [bits, setBits] = useState(3);
  const [type, setType] = useState<QuantizerType>('midrise');
  const [coding, setCoding] = useState<PcmCoding>('nbc');
  const [showRecon, setShowRecon] = useState(true);

  const tones: Tone[] = useMemo(() => {
    if (preset === 'single') return [{ freq: toneFreq, amp: 1 }];
    return PRESET_TONES[preset];
  }, [preset, toneFreq]);

  const mMax = useMemo(() => signalPeak(tones), [tones]);

  const view = useMemo(
    () =>
      buildSamplingView({
        tones,
        fs,
        bits,
        mMax,
        type,
        coding,
        t0: 0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, fs, bits, mMax, type, coding],
  );

  const pcmPreview = view.pcm
    .slice(0, 48)
    .join('')
    .replace(/(.{4})/g, '$1 ')
    .trim();

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        <Panel title={t('nav.sampling')}>
          <Select<PresetKey>
            label={t('sampling.signal')}
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'single', label: t('sampling.preset.single') },
              { value: 'two', label: t('sampling.preset.two') },
              { value: 'three', label: t('sampling.preset.three') },
            ]}
          />
          {preset === 'single' && (
            <Slider
              label={t('sampling.toneFreq')}
              value={toneFreq}
              min={1}
              max={20}
              step={1}
              unit="Hz"
              onChange={setToneFreq}
            />
          )}
          <Slider
            label={t('sampling.fs')}
            value={fs}
            min={2}
            max={60}
            step={1}
            unit="Hz"
            onChange={setFs}
          />
          <Slider
            label={t('sampling.bits')}
            value={bits}
            min={1}
            max={8}
            step={1}
            unit="bit"
            onChange={setBits}
          />
          <Select<QuantizerType>
            label={t('sampling.quantizer')}
            value={type}
            onChange={setType}
            options={[
              { value: 'midrise', label: t('sampling.midrise') },
              { value: 'midtread', label: t('sampling.midtread') },
            ]}
          />
          <Select<PcmCoding>
            label={t('sampling.coding')}
            value={coding}
            onChange={setCoding}
            options={[
              { value: 'nbc', label: t('sampling.nbc') },
              { value: 'gray', label: t('sampling.gray') },
            ]}
          />
          <Toggle
            label={t('sampling.reconstruct')}
            checked={showRecon}
            onChange={setShowRecon}
          />
        </Panel>

        <Panel title={t('sampling.pcm.title')}>
          <div className="sampling__bitstream" aria-label="PCM bitstream preview">
            {pcmPreview || '—'}
          </div>
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="sampling__readouts">
          <Readout label={t('sampling.readout.bandwidth')} value={view.bandwidth} unit="Hz" />
          <Readout label={t('sampling.readout.nyquist')} value={view.nyquist} unit="Hz" />
          <Readout
            label={t('sampling.readout.regime')}
            value={
              view.regime === 'oversampling'
                ? 'Oversampling'
                : view.regime === 'nyquist'
                  ? 'Nyquist'
                  : 'Undersampling'
            }
            tone={REGIME_TONE[view.regime]}
          />
          <Readout label={t('sampling.readout.levels')} value={2 ** bits} />
          <Readout label={t('sampling.readout.delta')} value={view.delta.toFixed(3)} />
          <Readout
            label={t('sampling.readout.noise')}
            value={view.noisePower.toExponential(2)}
          />
          <Readout
            label={t('sampling.readout.sqnrTheory')}
            value={view.sqnrTheoryDb.toFixed(2)}
            unit="dB"
          />
          <Readout
            label={t('sampling.readout.sqnrMeasured')}
            value={
              Number.isFinite(view.sqnrMeasuredDb) ? view.sqnrMeasuredDb.toFixed(2) : '∞'
            }
            unit="dB"
          />
        </div>

        <div className="sampling__panels">
          <Panel title={t('sampling.panel.time')}>
            <TimePanel view={view} mMax={mMax} showReconstruction={showRecon} />
          </Panel>
          <Panel title={t('sampling.panel.spectrum')}>
            <SpectrumPanel tones={tones} fs={fs} />
          </Panel>
          <Panel title={t('sampling.panel.quant')}>
            <QuantPanel view={view} mMax={mMax} bits={bits} type={type} />
          </Panel>
          <Panel title={t('sampling.panel.error')}>
            <ErrorPanel view={view} delta={view.delta} />
          </Panel>
        </div>

        <TheoryBox title={t('sampling.theory.title')}>
          <p>
            <Formula tex="f_s \ge 2W \quad\text{(Nyquist)}" block />
          </p>
          <p>
            <Formula tex="g_R(t)=\sum_n g(nT_s)\,\operatorname{sinc}\!\left(\tfrac{t-nT_s}{T_s}\right)" block />
          </p>
          <p>
            <Formula tex="\Delta=\dfrac{2m_{\max}}{L},\quad L=2^{R},\quad E[Q^2]=\dfrac{\Delta^2}{12}" block />
          </p>
          <p>
            <Formula tex="\mathrm{SQNR_{dB}}=10\log_{10}\!\left(\dfrac{3P_M}{m_{\max}^{2}}\right)+6.02\,R" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 3e: Wire the route in `src/App.tsx`** — add the import and replace the `/sampling` route:

Add near the other imports:

```tsx
import { SamplingModule } from '@/modules/sampling/SamplingModule';
```

Replace the line:

```tsx
            <Route path="/sampling" element={<ModulePlaceholder title={t('nav.sampling')} />} />
```

with:

```tsx
            <Route path="/sampling" element={<SamplingModule />} />
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/modules/SamplingModule.test.tsx`
Expected: PASS (renders ≥3 canvases, Nyquist + SQNR + regime text present).

- [ ] **Step 5: Verify build + lint, then commit**

Run: `npm run lint` (exit 0). Run: `npm run build` (succeeds). Then:

```bash
git add src/modules/sampling/panels.tsx src/modules/sampling/SamplingModule.tsx src/modules/sampling/sampling.css tests/modules/SamplingModule.test.tsx src/i18n/en.ts src/App.tsx
git commit -m "feat: add interactive Sampling & Quantization module UI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Live scrolling sampler + streaming PCM bitstream

**Files:** Modify `src/modules/sampling/SamplingModule.tsx` (add the simulation loop, scrolling window, sweep cursor, transport controls, streaming bit log).

The waveform scrolls right-to-left as `t0` advances; the time/quant panels show a sweep cursor at the latest sample; the PCM bitstream accumulates as new samples are crossed. Uses the existing `useSimulationLoop` and `TransportControls`.

- [ ] **Step 1: Update `SamplingModule.tsx`** — apply these focused edits:

(a) Extend the imports:

```tsx
import { useMemo, useRef, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { pcmCodeword } from '@/lib/dsp/pcm';
import { quantize } from '@/lib/dsp/quantize';
import { evalSignal } from '@/lib/dsp/signals';
```

(Keep the existing imports for `PRESETS`, `signalPeak`, `Tone`, `buildSamplingView`, panels, `t`, types, css.)

(b) Add live state below the existing `useState` declarations:

```tsx
  const [t0, setT0] = useState(0);
  const [bitLog, setBitLog] = useState<string>('');
  const lastSampleIdx = useRef(-1);
```

(c) Drive the window with a simulation loop. Add after `mMax` is computed and before `view`:

```tsx
  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (dt, simTime) => {
      setT0(simTime);
      // emit PCM for any sample instant newly crossed at the window's right edge
      const Ts = 1 / fs;
      const rightEdge = simTime + WINDOW_SEC;
      const idx = Math.floor(rightEdge / Ts);
      if (idx !== lastSampleIdx.current) {
        lastSampleIdx.current = idx;
        const val = evalSignal(tones, idx * Ts);
        const word = pcmCodeword(val, mMax, bits, type, coding).join('');
        setBitLog((prev) => (prev + word).slice(-64));
      }
    },
    onReset: () => {
      setT0(0);
      setBitLog('');
      lastSampleIdx.current = -1;
    },
  });
```

(d) Use `t0` in the memoized view and add `loop.running` so memo recomputes each tick:

```tsx
  const view = useMemo(
    () =>
      buildSamplingView({
        tones,
        fs,
        bits,
        mMax,
        type,
        coding,
        t0,
        windowSec: WINDOW_SEC,
        analogN: 480,
      }),
    [tones, fs, bits, mMax, type, coding, t0],
  );

  const cursorT = view.samples.t.length ? view.samples.t[view.samples.t.length - 1] : undefined;
```

(e) Replace the static `pcmPreview` derivation so that, while running, it shows the streamed log; when idle it shows the window's stream:

```tsx
  const windowBits = view.pcm.slice(0, 64).join('');
  const pcmPreview = (loop.running ? bitLog : windowBits)
    .replace(/(.{4})/g, '$1 ')
    .trim();
```

(f) Pass the cursor to `TimePanel`:

```tsx
            <TimePanel
              view={view}
              mMax={mMax}
              showReconstruction={showRecon}
              cursorT={loop.running ? cursorT : undefined}
            />
```

(g) Add `TransportControls` inside the first `Panel` (after the reconstruction toggle):

```tsx
          <TransportControls loop={loop} />
```

- [ ] **Step 2: Verify the smoke test still passes**

Run: `npm test -- tests/modules/SamplingModule.test.tsx`
Expected: PASS (rendering unchanged at rest; the loop starts paused).

- [ ] **Step 3: Run the full suite + lint + build**

Run: `npm test` — all pass.
Run: `npm run lint` — exit 0.
Run: `npm run build` — succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/modules/sampling/SamplingModule.tsx
git commit -m "feat: add live scrolling sampler and streaming PCM bitstream

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Web Audio playback — hear aliasing & quantization noise

**Files:** Create `src/lib/audio/sampling-audio.ts`; Modify `src/modules/sampling/SamplingModule.tsx` (add an audio panel: tone-frequency + audio-fs sliders, a Play button, an "alias pitch" readout).

The engine renders an audible cosine tone, *resamples* it at a chosen demo rate via zero-order hold, quantizes each held value to `R` bits (reusing `quantize`), and plays the result so the perceived pitch aliases and quantization noise is audible. AudioContext is created on the user gesture (Play). jsdom has no AudioContext, so the engine is feature-guarded and not unit-tested (consistent with the imperative-code convention); the displayed alias pitch reuses the already-tested `aliasFrequency`.

- [ ] **Step 1: Create `src/lib/audio/sampling-audio.ts`:**

```ts
import { quantize, type QuantizerType } from '@/lib/dsp/quantize';

export interface AudioDemoParams {
  /** Audible analog tone frequency (Hz). */
  toneHz: number;
  /** Demonstration sampling rate (Hz) applied to the tone. */
  sampleHz: number;
  /** Quantizer resolution (bits). */
  bits: number;
  type: QuantizerType;
  /** Playback duration (seconds). */
  durationSec?: number;
  /** Output gain in [0,1]. */
  gain?: number;
}

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when the Web Audio API is available in this environment. */
export function audioSupported(): boolean {
  return typeof window !== 'undefined' && getAudioContextCtor() !== null;
}

/**
 * Play a zero-order-hold reconstruction of a tone sampled at `sampleHz` and
 * quantized to `bits`. Returns a stop() handle. Must be called from a user
 * gesture (browser autoplay policy). No-op (returns null) when unsupported.
 */
export function playSampledTone(p: AudioDemoParams): { stop: () => void } | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  const durationSec = p.durationSec ?? 1.5;
  const gain = p.gain ?? 0.25;
  const mMax = 1;

  const ctx = new Ctor();
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(durationSec * sr));
  const buffer = ctx.createBuffer(1, n, sr);
  const ch = buffer.getChannelData(0);
  const Ts = 1 / p.sampleHz;

  for (let i = 0; i < n; i++) {
    const time = i / sr;
    const heldIndex = Math.floor(time / Ts); // zero-order hold
    const heldTime = heldIndex * Ts;
    const analog = Math.cos(2 * Math.PI * p.toneHz * heldTime);
    ch[i] = quantize(analog, mMax, p.bits, p.type) * gain;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  src.onended = () => {
    void ctx.close();
  };

  return {
    stop: () => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
      void ctx.close();
    },
  };
}
```

- [ ] **Step 2: Add the audio panel to `SamplingModule.tsx`:**

(a) Extend imports:

```tsx
import { aliasFrequency } from '@/lib/dsp/sampling';
import { audioSupported, playSampledTone } from '@/lib/audio/sampling-audio';
```

(b) Add audio state with the other `useState` calls:

```tsx
  const [audioToneHz, setAudioToneHz] = useState(2200);
  const [audioFs, setAudioFs] = useState(3000);
```

(c) Compute the audible alias pitch (reuses tested `aliasFrequency`):

```tsx
  const aliasPitch = aliasFrequency(audioToneHz, audioFs);
```

(d) Add an audio `Panel` to the sidebar (after the PCM panel):

```tsx
        <Panel title="🔊 Audio (aliasing & quantization)">
          <Slider
            label="Tone"
            value={audioToneHz}
            min={200}
            max={4000}
            step={50}
            unit="Hz"
            onChange={setAudioToneHz}
          />
          <Slider
            label="Sampling rate"
            value={audioFs}
            min={500}
            max={8000}
            step={100}
            unit="Hz"
            onChange={setAudioFs}
          />
          <Readout label="You should hear ≈" value={aliasPitch.toFixed(0)} unit="Hz" />
          <button
            type="button"
            disabled={!audioSupported()}
            onClick={() =>
              playSampledTone({
                toneHz: audioToneHz,
                sampleHz: audioFs,
                bits,
                type,
              })
            }
          >
            ▶ Play sampled tone
          </button>
        </Panel>
```

- [ ] **Step 3: Run the full suite + lint + build**

Run: `npm test` — all pass (the smoke test ignores audio; `audioSupported()` is false in jsdom so the button renders disabled).
Run: `npm run lint` — exit 0 (no unused imports).
Run: `npm run build` — succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/audio/sampling-audio.ts src/modules/sampling/SamplingModule.tsx
git commit -m "feat: add Web Audio playback for aliasing and quantization noise

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npm test` — all suites pass (Phase 1a 49 + pcm + quantize-extension + sampling-model + SamplingModule smoke).
- [ ] `npm run lint` — exit 0.
- [ ] `npm run build` — succeeds.
- [ ] `git status -s` — clean.
- [ ] Manual sanity (optional, `npm run dev`): `/sampling` shows four panels; lowering `f_s` below `2W` shades the spectrum overlap red and flips the regime badge to "Undersampling"; Play emits an audibly aliased, quantization-noisy tone.

---

## Self-Review (spec coverage for Phase 1b, §6.1)

- **Analog signal (1–3 sinusoids), W from max freq** → preset Select + tone-freq slider; `signalBandwidth`. ✓
- **Sampling `g(nT_s)`, `T_s=1/f_s`** → `sample` via `buildSamplingView`; sample stems. ✓
- **Sinc reconstruction overlaid (dashed)** → `sincReconstruct`; `TimePanel` dashed trace + toggle. ✓
- **Sampled spectrum replicas; overlap shaded red when `f_s<2W`** → `replicaLines` + `hasAliasing`; `SpectrumPanel` red shading + `±f_s/2` markers. ✓
- **Regime classification vs Nyquist** → `samplingRegime`; regime badge (ok/warn/err) + Nyquist readout. ✓
- **Alias frequency shown** → audio "alias pitch" readout via `aliasFrequency`. ✓ (time-domain alias is visualized by undersampled stems + shading.)
- **Uniform quantizer Δ=2m_max/L, L=2^R, midrise/midtread; error e[n]** → `quantize`/`quantizeSignal`/`quantizationError`; `QuantPanel` staircase + level lines; `ErrorPanel` stems. ✓
- **Noise power Δ²/12; SQNR theory + measured ("+6.02 dB/bit")** → `quantizationNoisePower`, `sqnrTheoreticalDb`, `sqnrMeasuredDb`; readouts. ✓
- **Controls: f_s, signal freq/preset, R(1–8), midrise/midtread, reconstruction on/off** → all present. ✓
- **Live: scrolling sampler + sweep cursor** → `useSimulationLoop` advances `t0`; cursor via `drawVLine`. ✓
- **Live: PCM bitstream (NBC/Gray) streaming** → `pcm.ts`; coding Select; streaming bit log. ✓
- **Web Audio playback (tone + sample + quantize)** → `sampling-audio.ts`; Play button + gesture-started AudioContext. ✓
- **Edge cases: clamp f_s, m_max from amplitude, guard sinc(0)** → fs slider min=2; `mMax=signalPeak(tones)`; `sinc` guarded in Phase 1a. ✓

No placeholders. Pure logic (pcm, level/noise helpers, frame builder) is TDD-tested; React/Canvas/Audio is verified via the RTL smoke test + build, consistent with the repo's existing imperative-code convention.
