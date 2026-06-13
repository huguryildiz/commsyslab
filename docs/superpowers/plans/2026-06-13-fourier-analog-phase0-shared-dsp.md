# Faz 0 — Shared DSP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **SHARED-CHECKOUT RULE (project memory):** This repo is worked by multiple concurrent agents in the same tree. Execute this plan in an **isolated git worktree** (use superpowers:using-git-worktrees first). Never work directly in the shared `master` checkout. Inside the worktree, the `git add <paths>` + `git commit` commands below are safe (no foreign staged files). If you must commit on the shared checkout, scope it: `git commit -- <paths>`.

**Goal:** Build the shared, framework-free DSP primitives — FFT/DFT, windowing, and periodic-waveform generation — that both the Fourier and Analog modules depend on.

**Architecture:** Three pure-function modules under `src/lib/dsp/`. `fft.ts` provides a radix-2 Cooley-Tukey FFT with an O(N²) DFT fallback for non-power-of-two lengths, plus a `spectrum()` helper that returns an fftshift-ed magnitude/phase pair. `window.ts` provides rect/Hann/Hamming windows. `signals.ts` (existing) gains periodic-waveform generators. No UI, no React — everything is unit-tested in isolation per the project's DSP rule.

**Tech Stack:** TypeScript (strict, no `any`), Vitest, path alias `@/` → `src/`. Reuse existing helpers in `src/lib/dsp/math.ts` (`linspace`, `sinc`, `clamp`).

---

## File Structure

- **Create** `src/lib/dsp/fft.ts` — `Complex` type, `fft`, `ifft`, `spectrum`. One responsibility: discrete Fourier transforms and spectral framing.
- **Create** `src/lib/dsp/window.ts` — `WindowType`, `window`. One responsibility: analysis windows.
- **Modify** `src/lib/dsp/signals.ts` — append `Periodic` type + `periodicWave`. Sits next to the existing `Tone` model (waveform generators live together).
- **Create** `tests/dsp/fft.test.ts`, `tests/dsp/window.test.ts`.
- **Modify** `tests/dsp/signals.test.ts` — append `periodicWave` tests.

All formulas carry `// Proakis §x.y` comments per CLAUDE.md.

---

## Task 1: FFT / IFFT (`fft.ts`)

**Files:**
- Create: `src/lib/dsp/fft.ts`
- Test: `tests/dsp/fft.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/fft.test.ts
import { describe, it, expect } from 'vitest';
import { fft, ifft, type Complex } from '@/lib/dsp/fft';

const mag = (c: Complex) => Math.hypot(c.re, c.im);

describe('fft', () => {
  it('DC signal -> all energy in bin 0', () => {
    const X = fft([1, 1, 1, 1]);
    expect(X[0].re).toBeCloseTo(4, 10);
    expect(mag(X[1])).toBeCloseTo(0, 10);
    expect(mag(X[2])).toBeCloseTo(0, 10);
    expect(mag(X[3])).toBeCloseTo(0, 10);
  });

  it('unit impulse -> flat spectrum (all magnitudes 1)', () => {
    const X = fft([1, 0, 0, 0]);
    for (const c of X) expect(mag(c)).toBeCloseTo(1, 10);
  });

  it('satisfies Parseval on a power-of-two ramp', () => {
    const x = [0, 1, 2, 3, 4, 5, 6, 7];
    const X = fft(x);
    const N = x.length;
    const timeEnergy = x.reduce((s, v) => s + v * v, 0);
    const freqEnergy = X.reduce((s, c) => s + mag(c) ** 2, 0) / N;
    expect(freqEnergy).toBeCloseTo(timeEnergy, 6);
  });

  it('non-power-of-two length uses the DFT fallback (N=6)', () => {
    const X = fft([1, 1, 1, 1, 1, 1]);
    expect(X[0].re).toBeCloseTo(6, 10);
    for (let k = 1; k < 6; k++) expect(mag(X[k])).toBeCloseTo(0, 10);
  });

  it('ifft(fft(x)) reconstructs x', () => {
    const x = [3, -1, 4, 1, 5, 9, 2, 6];
    const y = ifft(fft(x));
    for (let i = 0; i < x.length; i++) expect(y[i].re).toBeCloseTo(x[i], 8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fft.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/fft`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/dsp/fft.ts
// Proakis §2.2 — Fourier Transform (discrete form for numerical spectra).

export interface Complex {
  re: number;
  im: number;
}

function toComplex(x: number[] | Complex[]): Complex[] {
  return x.map((v) => (typeof v === 'number' ? { re: v, im: 0 } : { re: v.re, im: v.im }));
}

function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Naive O(N^2) DFT. sign=-1 forward, +1 inverse (unscaled). Fallback for N != 2^k. */
function dft(x: Complex[], sign: number): Complex[] {
  const N = x.length;
  const out: Complex[] = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (sign * 2 * Math.PI * k * n) / N;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      re += x[n].re * c - x[n].im * s;
      im += x[n].re * s + x[n].im * c;
    }
    out[k] = { re, im };
  }
  return out;
}

/** Iterative radix-2 Cooley-Tukey. sign=-1 forward, +1 inverse (unscaled). */
function radix2(input: Complex[], sign: number): Complex[] {
  const N = input.length;
  const a = input.map((c) => ({ re: c.re, im: c.im }));
  // bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = a[i + k].re;
        const uIm = a[i + k].im;
        const j2 = i + k + len / 2;
        const vRe = a[j2].re * curRe - a[j2].im * curIm;
        const vIm = a[j2].re * curIm + a[j2].im * curRe;
        a[i + k] = { re: uRe + vRe, im: uIm + vIm };
        a[j2] = { re: uRe - vRe, im: uIm - vIm };
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
  return a;
}

/** Forward DFT: radix-2 FFT when N is a power of two, else O(N^2) DFT. */
export function fft(x: number[] | Complex[]): Complex[] {
  const cx = toComplex(x);
  return isPow2(cx.length) ? radix2(cx, -1) : dft(cx, -1);
}

/** Inverse DFT, scaled by 1/N. */
export function ifft(X: Complex[]): Complex[] {
  const N = X.length;
  const y = isPow2(N) ? radix2(X, +1) : dft(X, +1);
  return y.map((c) => ({ re: c.re / N, im: c.im / N }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fft.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fft.test.ts src/lib/dsp/fft.ts
git commit -m "feat(dsp): radix-2 FFT with DFT fallback + ifft (Proakis §2.2)"
```

---

## Task 2: Spectrum helper (`fft.ts`)

**Files:**
- Modify: `src/lib/dsp/fft.ts` (append `spectrum`)
- Test: `tests/dsp/fft.test.ts` (append a `describe('spectrum', …)`)

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fft.test.ts
import { spectrum } from '@/lib/dsp/fft';

describe('spectrum', () => {
  it('locates a cosine peak at its frequency with half-amplitude (two-sided)', () => {
    const fs = 64;
    const N = 64;
    const f0 = 8; // integer cycles in the window -> no leakage
    const x = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * f0 * n) / fs));
    const { freq, mag } = spectrum(x, fs);
    let kPos = 0;
    for (let i = 0; i < freq.length; i++) {
      if (Math.abs(freq[i] - f0) < Math.abs(freq[kPos] - f0)) kPos = i;
    }
    expect(freq[kPos]).toBeCloseTo(f0, 6);
    expect(mag[kPos]).toBeCloseTo(0.5, 6);
  });

  it('returns an ascending frequency axis starting at -fs/2', () => {
    const { freq } = spectrum([0, 0, 0, 0], 8);
    for (let i = 1; i < freq.length; i++) expect(freq[i]).toBeGreaterThan(freq[i - 1]);
    expect(freq[0]).toBeCloseTo(-4, 10); // -fs/2
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fft.test.ts -t spectrum`
Expected: FAIL — `spectrum` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fft.ts`:

```ts
/**
 * Two-sided amplitude & phase spectrum, fftshift-ed to ascending freq in [-fs/2, fs/2).
 * Magnitude is normalized by N so a tone A·cos(2πf₀t) shows peaks of A/2 at ±f₀.
 * Proakis §2.2.
 */
export function spectrum(
  x: number[],
  fs: number,
): { freq: number[]; mag: number[]; phase: number[] } {
  const N = x.length;
  const X = fft(x);
  const bins = X.map((c, k) => ({
    f: (k < N / 2 ? k : k - N) * (fs / N),
    mag: Math.hypot(c.re, c.im) / N,
    phase: Math.atan2(c.im, c.re),
  }));
  bins.sort((a, b) => a.f - b.f);
  return {
    freq: bins.map((b) => b.f),
    mag: bins.map((b) => b.mag),
    phase: bins.map((b) => b.phase),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fft.test.ts`
Expected: PASS (all `fft` + `spectrum` tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fft.test.ts src/lib/dsp/fft.ts
git commit -m "feat(dsp): two-sided fftshift spectrum helper (Proakis §2.2)"
```

---

## Task 3: Analysis windows (`window.ts`)

**Files:**
- Create: `src/lib/dsp/window.ts`
- Test: `tests/dsp/window.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/window.test.ts
import { describe, it, expect } from 'vitest';
import { window } from '@/lib/dsp/window';

describe('window', () => {
  it('rect is all ones', () => {
    expect(window('rect', 5)).toEqual([1, 1, 1, 1, 1]);
  });

  it('hann endpoints are zero, center is one', () => {
    const w = window('hann', 5);
    expect(w[0]).toBeCloseTo(0, 10);
    expect(w[4]).toBeCloseTo(0, 10);
    expect(w[2]).toBeCloseTo(1, 10);
  });

  it('hamming endpoints are 0.08', () => {
    const w = window('hamming', 5);
    expect(w[0]).toBeCloseTo(0.08, 10);
    expect(w[4]).toBeCloseTo(0.08, 10);
  });

  it('is symmetric and of length N', () => {
    const w = window('hann', 8);
    expect(w).toHaveLength(8);
    for (let i = 0; i < 4; i++) expect(w[i]).toBeCloseTo(w[7 - i], 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/window.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/window`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/dsp/window.ts
// Analysis windows for the DFT spectrum analyzer. Proakis §2.2 (spectral leakage).

export type WindowType = 'rect' | 'hann' | 'hamming';

/** Symmetric window coefficients of length N. */
export function window(type: WindowType, N: number): number[] {
  const w = new Array<number>(N);
  for (let n = 0; n < N; n++) {
    if (type === 'rect') {
      w[n] = 1;
    } else if (type === 'hann') {
      w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
    } else {
      w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    }
  }
  return w;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/window.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/window.test.ts src/lib/dsp/window.ts
git commit -m "feat(dsp): rect/Hann/Hamming analysis windows (Proakis §2.2)"
```

---

## Task 4: Periodic waveform generators (`signals.ts`)

**Files:**
- Modify: `src/lib/dsp/signals.ts` (append type + function — do NOT touch the existing `Tone` exports)
- Test: `tests/dsp/signals.test.ts` (append a `describe('periodicWave', …)`)

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/signals.test.ts
import { periodicWave } from '@/lib/dsp/signals';

describe('periodicWave', () => {
  it('square is +1 in the first half-period, -1 in the second', () => {
    expect(periodicWave('square', 1, 0.1)).toBe(1);
    expect(periodicWave('square', 1, 0.6)).toBe(-1);
  });

  it('sawtooth ramps from -1 to ~+1 across a period', () => {
    expect(periodicWave('sawtooth', 1, 0)).toBeCloseTo(-1, 10);
    expect(periodicWave('sawtooth', 1, 0.5)).toBeCloseTo(0, 10);
    expect(periodicWave('sawtooth', 1, 0.999)).toBeGreaterThan(0.9);
  });

  it('triangle goes -1 at edges, +1 at the midpoint', () => {
    expect(periodicWave('triangle', 1, 0)).toBeCloseTo(-1, 10);
    expect(periodicWave('triangle', 1, 0.5)).toBeCloseTo(1, 10);
  });

  it('pulse is high only for the duty fraction', () => {
    expect(periodicWave('pulse', 1, 0.1, 0.25)).toBe(1);
    expect(periodicWave('pulse', 1, 0.3, 0.25)).toBe(0);
  });

  it('is periodic with period 1/f0', () => {
    expect(periodicWave('square', 2, 0.1)).toBe(periodicWave('square', 2, 0.1 + 0.5));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/signals.test.ts -t periodicWave`
Expected: FAIL — `periodicWave` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/signals.ts`:

```ts
/** Standard periodic waveforms used for Fourier-series demos. Proakis §2.1. */
export type Periodic = 'square' | 'triangle' | 'sawtooth' | 'pulse';

/**
 * Unit-amplitude periodic waveform value at time t (fundamental f0, optional duty for pulse).
 * square: ±1 (50% duty). sawtooth: ramp -1→1. triangle: -1 at edges, +1 at midpoint.
 * pulse: 1 over the first `duty` fraction of each period, else 0.
 */
export function periodicWave(kind: Periodic, f0: number, t: number, duty = 0.5): number {
  const phase = (((t * f0) % 1) + 1) % 1; // fractional position in [0,1)
  if (kind === 'square') return phase < 0.5 ? 1 : -1;
  if (kind === 'sawtooth') return 2 * phase - 1;
  if (kind === 'triangle') return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
  return phase < duty ? 1 : 0; // pulse
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/signals.test.ts`
Expected: PASS (existing signals tests + new periodicWave tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/signals.test.ts src/lib/dsp/signals.ts
git commit -m "feat(dsp): periodic waveform generators for Fourier series (Proakis §2.1)"
```

---

## Task 5: Faz 0 gate — full suite green

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests plus `fft`/`window`/`signals` additions.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run build` (runs `tsc --noEmit`) and `npm run lint`
Expected: no type errors, zero lint warnings.

- [ ] **Step 3: Confirm exported API surface**

Confirm these are exported (the two module plans depend on them verbatim):
- `fft.ts`: `Complex`, `fft`, `ifft`, `spectrum`
- `window.ts`: `WindowType`, `window`
- `signals.ts`: `Periodic`, `periodicWave` (plus pre-existing `Tone`, `evalSignal`, `PRESETS`, …)

This is the **merge point**: once green, merge this worktree to `master`. The Fourier (`wt-fourier`) and Analog (`wt-analog`) worktrees branch off the updated `master` so they see this API.

---

## Self-Review

- **Spec coverage:** Covers spec §2.2 paylaşılan DSP API (`fft.ts`, `window.ts`, `signals.ts` ext) — the Faz 0 row of the spec's §7 table. Fourier-series math, Hilbert, AM/FM live in the module plans (Faz 1a/1b), which is correct — they import this foundation.
- **Placeholder scan:** No TBD/TODO; every code step has complete code and exact run commands.
- **Type consistency:** `Complex` defined in Task 1 and reused by `spectrum` (Task 2). `Periodic` (Task 4) matches the spec's `signals.ts` signature. `WindowType` matches the spec. `fft`/`ifft`/`spectrum` signatures match spec §2.2 verbatim.
- **Note:** `spectrum()` magnitude is normalized by N (two-sided, A/2 per tone) — the module plans must read peaks as A/2, not A.
