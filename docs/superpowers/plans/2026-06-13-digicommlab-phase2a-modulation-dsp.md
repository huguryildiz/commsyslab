# DigiCommLab Phase 2a — Modulation & Detection DSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, unit-tested DSP foundation for the Modulation & Detection module (CH9, the centerpiece): signal-space constellations (BPSK/BASK/BFSK/M-PSK/M-ASK/M-QAM/M-FSK), AWGN, ML & MAP detection, and theoretical + Monte-Carlo symbol-error-rate. No React — pure functions consumed later by the module UI (Phase 2b).

**Architecture:** Four new pure modules under `src/lib/dsp/`: `awgn.ts`, `modulation.ts`, `detector.ts`, `ser.ts`. Every formula is slide-faithful (EE413 CH9). Energy is parameterized by `Eb` (energy per bit, default 1). Reuses committed `qfunc` (math.ts), `makeRng` (sim/sources.ts), and `toGray`/`toNBC` (pcm.ts) — no duplication.

**Tech Stack:** TypeScript (strict), Vitest. `@` alias → `src/`. Tests `npm test -- <path>`. Lint `npm run lint` exit 0.

> **Branch:** `phase-2-modulation` (from `master`). **Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-design.md` §6.2. This is Phase **2a**; the constellation/decision-region UI, SER plot, live transmission, and text transmission are Phase 2b (planned after this DSP exists).

> **Conventions:** Strict TDD (failing test first, confirm failure, implement, confirm pass). One commit per task. Run from repo root `/Users/huguryildiz/Documents/GitHub/digital-communications`. Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure (Phase 2a)

```
src/lib/dsp/awgn.ts         # NEW: Eb/N0 helpers, Box-Muller gaussian, addAwgn
src/lib/dsp/modulation.ts   # NEW: Scheme, Constellation, makeConstellation (7 schemes), Gray labels
src/lib/dsp/detector.ts     # NEW: detectML, detectMAP, mapThreshold1D
src/lib/dsp/ser.ts          # NEW: theoreticalSer (slide Pe), simulateSer (Monte-Carlo)
tests/dsp/awgn.test.ts
tests/dsp/modulation.test.ts
tests/dsp/detector.test.ts
tests/dsp/ser.test.ts
```

Dependency order: `awgn` (leaf, uses math+sources) → `modulation` (uses pcm) → `detector` (leaf) → `ser` (uses math+awgn+detector). Implement in this order.

---

## Task 1: AWGN & Eb/N0 — awgn.ts (TDD)

**Files:** Create `src/lib/dsp/awgn.ts`; Test `tests/dsp/awgn.test.ts`. Uses `makeRng` from `@/lib/sim/sources`.

AWGN adds `N(0, N0/2)` per signal-space dimension. `Eb/N0` is energy-per-bit over `N0`; `σ = √(N0/2)`.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/awgn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ebN0Linear, n0FromEbN0Db, sigmaFromN0, gaussian, addAwgn } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

describe('Eb/N0 helpers', () => {
  it('converts dB to linear', () => {
    expect(ebN0Linear(0)).toBeCloseTo(1, 12);
    expect(ebN0Linear(10)).toBeCloseTo(10, 9);
    expect(ebN0Linear(3)).toBeCloseTo(1.9953, 3);
  });
  it('N0 = Eb / (Eb/N0)_lin', () => {
    expect(n0FromEbN0Db(0, 1)).toBeCloseTo(1, 12); // Eb=1, lin=1
    expect(n0FromEbN0Db(10, 1)).toBeCloseTo(0.1, 9);
  });
  it('sigma = sqrt(N0/2)', () => {
    expect(sigmaFromN0(2)).toBeCloseTo(1, 12);
    expect(sigmaFromN0(0.5)).toBeCloseTo(0.5, 12);
  });
});

describe('gaussian (Box-Muller, standard normal)', () => {
  it('has mean ~0 and variance ~1 over many seeded draws', () => {
    const rng = makeRng(12345);
    const N = 20000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const z = gaussian(rng);
      sum += z;
      sumSq += z * z;
    }
    const mean = sum / N;
    const varr = sumSq / N - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(varr - 1)).toBeLessThan(0.06);
  });
});

describe('addAwgn', () => {
  it('returns a vector of the same dimension', () => {
    const rng = makeRng(7);
    const out = addAwgn([1, -1], 0.3, rng);
    expect(out).toHaveLength(2);
  });
  it('with sigma=0 returns the input unchanged', () => {
    const rng = makeRng(7);
    expect(addAwgn([2, -3, 0.5], 0, rng)).toEqual([2, -3, 0.5]);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/awgn.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/awgn`.

- [ ] **Step 3: Create `src/lib/dsp/awgn.ts`:**

```ts
/** Eb/N0 (dB) -> linear ratio. */
export function ebN0Linear(ebN0Db: number): number {
  return 10 ** (ebN0Db / 10);
}

/** Noise PSD N0 from Eb/N0 (dB) and energy-per-bit Eb: N0 = Eb / (Eb/N0)_lin. */
export function n0FromEbN0Db(ebN0Db: number, eb: number): number {
  return eb / ebN0Linear(ebN0Db);
}

/** Per-dimension noise standard deviation: sigma = sqrt(N0/2). */
export function sigmaFromN0(n0: number): number {
  return Math.sqrt(n0 / 2);
}

/** One standard-normal sample via Box-Muller, drawn from rng() in [0,1). */
export function gaussian(rng: () => number): number {
  let u = rng();
  // avoid log(0)
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Add i.i.d. N(0, sigma^2) noise to each dimension of a signal-space point. */
export function addAwgn(point: number[], sigma: number, rng: () => number): number[] {
  if (sigma === 0) return point.slice();
  return point.map((c) => c + sigma * gaussian(rng));
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/awgn.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add src/lib/dsp/awgn.ts tests/dsp/awgn.test.ts
git commit -m "feat: add AWGN channel and Eb/N0 helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Constellations — modulation.ts (TDD)

**Files:** Create `src/lib/dsp/modulation.ts`; Test `tests/dsp/modulation.test.ts`. Uses `toGray`, `toNBC` from `@/lib/dsp/pcm`.

Slide-faithful signal-space constellations, parameterized by energy-per-bit `Eb` (default 1). `M` is assumed a power of 2 (integer bits/symbol). All points are arrays of length `dim`.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/modulation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeConstellation } from '@/lib/dsp/modulation';

describe('BPSK', () => {
  it('two antipodal 1-D points with d_min = 2*sqrt(Eb)', () => {
    const c = makeConstellation('bpsk', 2, 1);
    expect(c.dim).toBe(1);
    expect(c.M).toBe(2);
    expect(c.bitsPerSymbol).toBe(1);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    expect(xs).toEqual([-1, 1]); // +/- sqrt(Eb), Eb=1
    expect(c.dMin).toBeCloseTo(2, 12);
    expect(c.EsAvg).toBeCloseTo(1, 12);
  });
});

describe('BASK', () => {
  it('on-off 1-D: {0, sqrt(2Eb)}, d_min = sqrt(2Eb), EsAvg = Eb', () => {
    const c = makeConstellation('bask', 2, 1);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(0, 12);
    expect(xs[1]).toBeCloseTo(Math.SQRT2, 12);
    expect(c.dMin).toBeCloseTo(Math.SQRT2, 12);
    expect(c.EsAvg).toBeCloseTo(1, 12);
  });
});

describe('BFSK', () => {
  it('2-D orthogonal, d_min = sqrt(2Eb)', () => {
    const c = makeConstellation('bfsk', 2, 1);
    expect(c.dim).toBe(2);
    expect(c.dMin).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe('M-PSK / QPSK', () => {
  it('QPSK (M=4): 4 points on a circle of radius sqrt(Es), d_min = 2*sqrt(Eb)', () => {
    const c = makeConstellation('mpsk', 4, 1);
    expect(c.dim).toBe(2);
    expect(c.bitsPerSymbol).toBe(2);
    const Es = 2; // Eb*log2(4)
    for (const p of c.points) {
      expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.sqrt(Es), 9);
    }
    expect(c.EsAvg).toBeCloseTo(Es, 9);
    expect(c.dMin).toBeCloseTo(2, 9); // 2*sqrt(2Eb)*sin(pi/4) = 2*sqrt(Eb)
  });
  it('8-PSK d_min = 2*sqrt(Es)*sin(pi/8)', () => {
    const c = makeConstellation('mpsk', 8, 1);
    const Es = 3;
    expect(c.dMin).toBeCloseTo(2 * Math.sqrt(Es) * Math.sin(Math.PI / 8), 9);
  });
});

describe('M-ASK', () => {
  it('4-ASK: levels (2i+1-M)A, EsAvg = A^2(M^2-1)/3, d_min = 2A', () => {
    const c = makeConstellation('mask', 4, 1);
    expect(c.dim).toBe(1);
    // EsAvg must equal Eb*log2(M) = 2
    expect(c.EsAvg).toBeCloseTo(2, 9);
    const xs = c.points.map((p) => p[0]).sort((a, b) => a - b);
    const A = (xs[3] - xs[2]) / 2; // step is 2A
    expect(c.dMin).toBeCloseTo(2 * A, 9);
    // symmetric about 0
    expect(xs[0]).toBeCloseTo(-xs[3], 9);
    // d_min^2 = 12*EsAvg/(M^2-1)
    expect(c.dMin * c.dMin).toBeCloseTo((12 * c.EsAvg) / (16 - 1), 9);
  });
});

describe('M-QAM', () => {
  it('16-QAM: 16 points, EsAvg = Eb*log2(M), d_min = 2*sqrt(E0)', () => {
    const c = makeConstellation('mqam', 16, 1);
    expect(c.dim).toBe(2);
    expect(c.M).toBe(16);
    expect(c.bitsPerSymbol).toBe(4);
    expect(c.EsAvg).toBeCloseTo(4, 6); // Eb*log2(16)
    const E0 = (3 * 1 * 4) / (2 * (16 - 1)); // 3*Eb*log2(M)/(2(M-1))
    expect(c.dMin).toBeCloseTo(2 * Math.sqrt(E0), 6);
  });
});

describe('M-FSK', () => {
  it('4-FSK: orthogonal in M dimensions, d_min = sqrt(2Es)', () => {
    const c = makeConstellation('mfsk', 4, 1);
    expect(c.dim).toBe(4);
    const Es = 2; // Eb*log2(4)
    expect(c.dMin).toBeCloseTo(Math.sqrt(2 * Es), 9);
    // each point is sqrt(Es) on its own axis
    expect(Math.hypot(...c.points[0])).toBeCloseTo(Math.sqrt(Es), 9);
  });
});

describe('labels', () => {
  it('provides M distinct bit labels of width log2(M)', () => {
    const c = makeConstellation('mqam', 16, 1);
    expect(c.labels).toHaveLength(16);
    expect(new Set(c.labels).size).toBe(16);
    expect(c.labels[0]).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/modulation.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/modulation`.

- [ ] **Step 3: Create `src/lib/dsp/modulation.ts`:**

```ts
import { toGray, toNBC } from './pcm';

export type Scheme = 'bpsk' | 'bask' | 'bfsk' | 'mpsk' | 'mask' | 'mqam' | 'mfsk';

export interface Constellation {
  scheme: Scheme;
  M: number;
  /** signal-space dimension */
  dim: number;
  /** M points, each of length `dim` */
  points: number[][];
  /** bit labels (Gray-coded), length M, width bitsPerSymbol */
  labels: string[];
  bitsPerSymbol: number;
  /** minimum distance between any two points */
  dMin: number;
  /** average symbol energy */
  EsAvg: number;
}

/** Gray-coded fixed-width bit labels for indices 0..M-1. */
function grayLabels(M: number): string[] {
  const bits = Math.round(Math.log2(M));
  const out: string[] = [];
  for (let i = 0; i < M; i++) out.push(toNBC(toGray(i), bits).join(''));
  return out;
}

/** Smallest pairwise Euclidean distance among points. */
function minDistance(points: number[][]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let s = 0;
      for (let d = 0; d < points[i].length; d++) {
        const diff = points[i][d] - points[j][d];
        s += diff * diff;
      }
      best = Math.min(best, Math.sqrt(s));
    }
  }
  return best;
}

function avgEnergy(points: number[][]): number {
  let s = 0;
  for (const p of points) for (const c of p) s += c * c;
  return s / points.length;
}

/** Build a signal-space constellation for the given scheme, M, and energy-per-bit Eb. */
export function makeConstellation(scheme: Scheme, M: number, eb = 1): Constellation {
  const bitsPerSymbol = Math.round(Math.log2(M));
  let dim: number;
  let points: number[][];

  switch (scheme) {
    case 'bpsk': {
      dim = 1;
      points = [[Math.sqrt(eb)], [-Math.sqrt(eb)]];
      break;
    }
    case 'bask': {
      dim = 1;
      points = [[0], [Math.sqrt(2 * eb)]];
      break;
    }
    case 'bfsk': {
      dim = 2;
      points = [
        [Math.sqrt(eb), 0],
        [0, Math.sqrt(eb)],
      ];
      break;
    }
    case 'mpsk': {
      dim = 2;
      const Es = eb * bitsPerSymbol;
      const r = Math.sqrt(Es);
      points = [];
      for (let i = 0; i < M; i++) {
        const theta = (2 * Math.PI * i) / M;
        points.push([r * Math.cos(theta), -r * Math.sin(theta)]);
      }
      break;
    }
    case 'mask': {
      dim = 1;
      // EsAvg = A^2 (M^2-1)/3 must equal Eb*log2(M) => solve for A
      const A = Math.sqrt((3 * eb * bitsPerSymbol) / (M * M - 1));
      points = [];
      for (let i = 0; i < M; i++) points.push([(2 * i + 1 - M) * A]);
      break;
    }
    case 'mqam': {
      dim = 2;
      const L = Math.round(Math.sqrt(M)); // points per axis (square QAM)
      const E0 = (3 * eb * bitsPerSymbol) / (2 * (M - 1));
      const s = Math.sqrt(E0);
      points = [];
      for (let row = 0; row < L; row++) {
        for (let col = 0; col < L; col++) {
          const a = 2 * col - (L - 1); // odd-spaced: ..., -3, -1, 1, 3, ...
          const b = 2 * row - (L - 1);
          points.push([s * a, s * b]);
        }
      }
      break;
    }
    case 'mfsk': {
      dim = M;
      const Es = eb * bitsPerSymbol;
      const r = Math.sqrt(Es);
      points = [];
      for (let i = 0; i < M; i++) {
        const p = new Array<number>(M).fill(0);
        p[i] = r;
        points.push(p);
      }
      break;
    }
    default: {
      throw new Error(`unknown scheme: ${scheme as string}`);
    }
  }

  return {
    scheme,
    M,
    dim,
    points,
    labels: grayLabels(M),
    bitsPerSymbol,
    dMin: minDistance(points),
    EsAvg: avgEnergy(points),
  };
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/modulation.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add src/lib/dsp/modulation.ts tests/dsp/modulation.test.ts
git commit -m "feat: add signal-space constellations (BPSK/BASK/BFSK/M-PSK/M-ASK/M-QAM/M-FSK)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Detection — detector.ts (TDD)

**Files:** Create `src/lib/dsp/detector.ts`; Test `tests/dsp/detector.test.ts`. Pure (no imports beyond the type).

ML = minimum distance (Voronoi). MAP minimizes `‖r − s_i‖² − N0·ln P(s_i)`; `mapThreshold1D` gives the binary 1-D decision boundary.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/detector.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectML, detectMAP, mapThreshold1D } from '@/lib/dsp/detector';

const pts = [[-1], [1]]; // antipodal 1-D (BPSK, Eb=1)

describe('detectML', () => {
  it('picks the nearest point', () => {
    expect(detectML([-0.3], pts)).toBe(0);
    expect(detectML([0.3], pts)).toBe(1);
  });
  it('works in 2-D', () => {
    const qpsk = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    expect(detectML([0.9, 0.1], qpsk)).toBe(0);
    expect(detectML([-0.1, 0.9], qpsk)).toBe(1);
  });
});

describe('detectMAP', () => {
  it('equals ML when priors are equal', () => {
    const priors = [0.5, 0.5];
    expect(detectMAP([-0.3], pts, priors, 1)).toBe(detectML([-0.3], pts));
    expect(detectMAP([0.3], pts, priors, 1)).toBe(detectML([0.3], pts));
  });
  it('biases toward the more-likely symbol', () => {
    // r = 0.3 is closer to s1 (index 1); with strong prior on s0 and large N0, MAP picks s0
    const priors = [0.95, 0.05];
    expect(detectML([0.3], pts)).toBe(1);
    expect(detectMAP([0.3], pts, priors, 4)).toBe(0);
  });
});

describe('mapThreshold1D', () => {
  it('is the midpoint for equal priors', () => {
    expect(mapThreshold1D(-1, 1, 0.5, 0.5, 1)).toBeCloseTo(0, 12);
  });
  it('shifts toward the less-likely symbol as its prior shrinks', () => {
    // p0 > p1 -> threshold moves toward s1 (region for s0 grows)
    const thr = mapThreshold1D(-1, 1, 0.8, 0.2, 1);
    expect(thr).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/detector.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/detector`.

- [ ] **Step 3: Create `src/lib/dsp/detector.ts`:**

```ts
function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

/** Maximum-likelihood (minimum-distance) detection. Returns the index of the nearest point. */
export function detectML(r: number[], points: number[][]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = dist2(r, points[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** MAP detection: argmin_i { ||r - s_i||^2 - N0 * ln P(s_i) }. */
export function detectMAP(
  r: number[],
  points: number[][],
  priors: number[],
  n0: number,
): number {
  let best = 0;
  let bestMetric = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = priors[i] > 0 ? priors[i] : 1e-12;
    const metric = dist2(r, points[i]) - n0 * Math.log(p);
    if (metric < bestMetric) {
      bestMetric = metric;
      best = i;
    }
  }
  return best;
}

/**
 * Binary 1-D MAP decision boundary between s0 and s1 (assumes s0 < s1).
 * x* = (s0+s1)/2 + N0*ln(p0/p1) / (2*(s1-s0)).
 * Reduces to the midpoint when p0 = p1.
 */
export function mapThreshold1D(
  s0: number,
  s1: number,
  p0: number,
  p1: number,
  n0: number,
): number {
  return (s0 + s1) / 2 + (n0 * Math.log(p0 / p1)) / (2 * (s1 - s0));
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/detector.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add src/lib/dsp/detector.ts tests/dsp/detector.test.ts
git commit -m "feat: add ML and MAP detectors with binary MAP threshold

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: SER — ser.ts (TDD)

**Files:** Create `src/lib/dsp/ser.ts`; Test `tests/dsp/ser.test.ts`. Uses `qfunc` (math), `Scheme`/`makeConstellation` (modulation), `n0FromEbN0Db`/`sigmaFromN0`/`addAwgn` (awgn), `detectML`/`detectMAP` (detector), `makeRng` (sources).

Theoretical Pe uses the slide formulas (SNR-per-bit form). Simulated SER is Monte-Carlo.

- [ ] **Step 1: Write the failing test** — create `tests/dsp/ser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { theoreticalSer, simulateSer } from '@/lib/dsp/ser';
import { makeConstellation } from '@/lib/dsp/modulation';
import { qfunc } from '@/lib/dsp/math';

describe('theoreticalSer (slide Pe formulas)', () => {
  it('BPSK = Q(sqrt(2*Eb/N0))', () => {
    const g = 10 ** (4 / 10);
    expect(theoreticalSer('bpsk', 2, 4)).toBeCloseTo(qfunc(Math.sqrt(2 * g)), 12);
  });
  it('BPSK is in a sane band at 4 dB and decreases with SNR', () => {
    const p4 = theoreticalSer('bpsk', 2, 4);
    expect(p4).toBeGreaterThan(0.011);
    expect(p4).toBeLessThan(0.014);
    expect(theoreticalSer('bpsk', 2, 8)).toBeLessThan(p4);
  });
  it('BASK/BFSK = Q(sqrt(Eb/N0))', () => {
    const g = 10 ** (6 / 10);
    expect(theoreticalSer('bask', 2, 6)).toBeCloseTo(qfunc(Math.sqrt(g)), 12);
    expect(theoreticalSer('bfsk', 2, 6)).toBeCloseTo(qfunc(Math.sqrt(g)), 12);
  });
  it('M-PSK = 2 Q(sqrt(2 log2M Eb/N0) sin(pi/M))', () => {
    const g = 10 ** (8 / 10);
    expect(theoreticalSer('mpsk', 8, 8)).toBeCloseTo(
      2 * qfunc(Math.sqrt(2 * 3 * g) * Math.sin(Math.PI / 8)),
      12,
    );
  });
  it('M-FSK = (M-1) Q(sqrt(log2M Eb/N0))', () => {
    const g = 10 ** (6 / 10);
    expect(theoreticalSer('mfsk', 4, 6)).toBeCloseTo((4 - 1) * qfunc(Math.sqrt(2 * g)), 12);
  });
  it('M-ASK = (2(M-1)/M) Q(sqrt(6 log2M Eb/N0 / (M^2-1)))', () => {
    const g = 10 ** (10 / 10);
    expect(theoreticalSer('mask', 4, 10)).toBeCloseTo(
      (2 * 3 / 4) * qfunc(Math.sqrt((6 * 2 * g) / 15)),
      12,
    );
  });
  it('M-QAM = (4(sqrtM-1)/sqrtM) Q(sqrt(3 log2M Eb/N0 / (M-1)))', () => {
    const g = 10 ** (12 / 10);
    expect(theoreticalSer('mqam', 16, 12)).toBeCloseTo(
      (4 * (4 - 1) / 4) * qfunc(Math.sqrt((3 * 4 * g) / 15)),
      12,
    );
  });
});

describe('simulateSer (Monte-Carlo)', () => {
  it('BPSK simulated SER tracks the theoretical value', () => {
    const c = makeConstellation('bpsk', 2, 1);
    const r = simulateSer({
      constellation: c,
      ebN0Db: 4,
      numSymbols: 40000,
      decision: 'ml',
      seed: 12345,
    });
    expect(r.total).toBe(40000);
    expect(r.ser).toBeGreaterThan(0.009);
    expect(r.ser).toBeLessThan(0.017);
  });
  it('QPSK simulated SER is finite and below 1', () => {
    const c = makeConstellation('mpsk', 4, 1);
    const r = simulateSer({
      constellation: c,
      ebN0Db: 6,
      numSymbols: 20000,
      decision: 'ml',
      seed: 99,
    });
    expect(r.ser).toBeGreaterThanOrEqual(0);
    expect(r.ser).toBeLessThan(1);
  });
  it('MAP with equal priors matches ML detection counts', () => {
    const c = makeConstellation('bpsk', 2, 1);
    const common = { constellation: c, ebN0Db: 3, numSymbols: 10000, seed: 2024 } as const;
    const ml = simulateSer({ ...common, decision: 'ml' });
    const map = simulateSer({ ...common, decision: 'map', priors: [0.5, 0.5] });
    expect(map.errors).toBe(ml.errors);
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `npm test -- tests/dsp/ser.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/ser`.

- [ ] **Step 3: Create `src/lib/dsp/ser.ts`:**

```ts
import { qfunc } from './math';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from './awgn';
import { detectML, detectMAP } from './detector';
import type { Scheme, Constellation } from './modulation';
import { makeRng } from '@/lib/sim/sources';

/** Theoretical symbol-error probability (slide formulas, Eb/N0 in dB). */
export function theoreticalSer(scheme: Scheme, M: number, ebN0Db: number): number {
  const g = 10 ** (ebN0Db / 10); // Eb/N0 linear
  const k = Math.log2(M);
  switch (scheme) {
    case 'bpsk':
      return qfunc(Math.sqrt(2 * g));
    case 'bask':
    case 'bfsk':
      return qfunc(Math.sqrt(g));
    case 'mpsk':
      return 2 * qfunc(Math.sqrt(2 * k * g) * Math.sin(Math.PI / M));
    case 'mfsk':
      return (M - 1) * qfunc(Math.sqrt(k * g));
    case 'mask':
      return ((2 * (M - 1)) / M) * qfunc(Math.sqrt((6 * k * g) / (M * M - 1)));
    case 'mqam':
      return ((4 * (Math.sqrt(M) - 1)) / Math.sqrt(M)) * qfunc(Math.sqrt((3 * k * g) / (M - 1)));
    default:
      throw new Error(`unknown scheme: ${scheme as string}`);
  }
}

export interface SimSerOptions {
  constellation: Constellation;
  ebN0Db: number;
  numSymbols: number;
  decision: 'ml' | 'map';
  /** Required for MAP; ignored for ML. Should sum to ~1 and have length M. */
  priors?: number[];
  seed?: number;
}

export interface SimSerResult {
  errors: number;
  total: number;
  ser: number;
}

/** Build a cumulative-distribution sampler from priors (or uniform). */
function symbolSampler(M: number, priors: number[] | undefined): (u: number) => number {
  if (!priors) return (u: number) => Math.min(M - 1, Math.floor(u * M));
  const cdf: number[] = [];
  let acc = 0;
  for (let i = 0; i < M; i++) {
    acc += priors[i];
    cdf.push(acc);
  }
  return (u: number) => {
    const x = u * acc;
    for (let i = 0; i < M; i++) if (x <= cdf[i]) return i;
    return M - 1;
  };
}

/** Monte-Carlo symbol-error-rate for a constellation over an AWGN channel. */
export function simulateSer(o: SimSerOptions): SimSerResult {
  const { constellation: c, ebN0Db, numSymbols, decision } = o;
  const eb = c.EsAvg / c.bitsPerSymbol; // energy per bit from average symbol energy
  const n0 = n0FromEbN0Db(ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const priors = decision === 'map' ? o.priors : undefined;
  const rng = makeRng(o.seed ?? 1);
  const pick = symbolSampler(c.M, priors);

  let errors = 0;
  for (let n = 0; n < numSymbols; n++) {
    const tx = pick(rng());
    const r = addAwgn(c.points[tx], sigma, rng);
    const rx =
      decision === 'map'
        ? detectMAP(r, c.points, priors ?? c.points.map(() => 1 / c.M), n0)
        : detectML(r, c.points);
    if (rx !== tx) errors++;
  }
  return { errors, total: numSymbols, ser: errors / numSymbols };
}
```

- [ ] **Step 4: Run test, verify it PASSES**

Run: `npm test -- tests/dsp/ser.test.ts`
Expected: PASS (theoretical groups exact; Monte-Carlo within tolerance bands).

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add src/lib/dsp/ser.ts tests/dsp/ser.test.ts
git commit -m "feat: add theoretical and Monte-Carlo symbol-error-rate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npm test` — all suites pass (prior 67 + awgn/modulation/detector/ser).
- [ ] `npm run lint` — exit 0.
- [ ] `npm run build` — succeeds.
- [ ] `git status -s` — clean.

---

## Self-Review (spec coverage for Phase 2a, §6.2 DSP)

- **Constellations (BPSK/BASK/BFSK/M-PSK/M-ASK/M-QAM/M-FSK) in slide notation, d_min, EsAvg, dim, Gray labels** → Task 2. ✓
- **AWGN N(0, N0/2) per dimension; σ from Eb/N0** → Task 1. ✓
- **ML (min distance) + MAP (argmin ‖r−s‖²−N0 ln P); binary 1-D MAP threshold** → Task 3. ✓
- **Theoretical Pe (BPSK/BASK/BFSK/M-PSK/M-FSK/M-ASK/M-QAM), Q(x)=0.5 erfc(x/√2)** → Task 4, asserted definitionally + sanity bands. ✓
- **Simulated SER (Monte-Carlo, ML or MAP, prior-weighted symbols)** → Task 4. ✓

Deferred to Phase 2b (UI): constellation plane + shaded decision regions (ML Voronoi / MAP-shifted) + noise cloud + d_min annotation; threshold-line viz for 1-D; SER-vs-Eb/N0 log-y plot; scheme/M/Eb-N0/#symbols/ML-MAP/prior/Gray controls; live transmission (noise-vector arrow, fading received cloud, SER odometer); text/image transmission. These consume the APIs committed here.

No placeholders; cross-file deps explicit (`ser` → math/awgn/detector/modulation/sources; `modulation` → pcm). `Eb` defaults to 1; `simulateSer` derives Eb from `EsAvg/bitsPerSymbol` so any scheme/energy is handled consistently.
