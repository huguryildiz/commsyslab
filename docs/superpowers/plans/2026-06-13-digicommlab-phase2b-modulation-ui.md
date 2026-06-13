# DigiCommLab Phase 2b — Modulation & Detection UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive Modulation & Detection module (CH9 centerpiece) that consumes the committed Phase 2a DSP APIs — constellation plane with shaded ML/MAP decision regions and a live received-noise cloud, a 1-D threshold view, a log-y SER-vs-Eb/N0 plot, full controls, live transmission with a noise-vector arrow and SER odometer, and text/image transmission — mounted at `/modulation`.

**Architecture:** Mirror the existing `sampling` module's three-layer split exactly: a pure, unit-tested `model.ts` (assembles all panel data + scalar metrics from the 2a DSP), a Canvas-only `panels.tsx` (reusing `src/lib/plot/Canvas.tsx` + `draw.ts`, extended with a few new primitives), and a `ModulationModule.tsx` that wires controls, the `useSimulationLoop`, readouts, KaTeX theory, and the live/message simulations. Decision regions are rendered by **grid classification** — sampling a coarse data-space grid and coloring each cell by `detectML`/`detectMAP`, which reuses the 2a detectors verbatim so ML Voronoi and MAP-shifted boundaries are always exact. The constellation plane is rendered entirely on Canvas (not SVG) to stay consistent with every existing panel and avoid a second DPR-aware coordinate layer; crispness comes from the existing DPR scaling in `Canvas.tsx`.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + @testing-library/react, custom Canvas 2D rendering (`src/lib/plot`), KaTeX via the existing `Formula` component, HashRouter.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/i18n/en.ts` (modify) | Add all `modulation.*` user-facing strings. |
| `src/lib/plot/draw.ts` (modify) | Add pure `logScale`, `regionColors`, and Canvas `drawArrow`, `drawText`, `drawRegions` primitives. |
| `src/modules/modulation/model.ts` (create) | Pure `buildModulationView` — projects constellation to 2-D, builds priors, 1-D thresholds (ML + MAP), `d_min` pair, theoretical SER sweep, noise σ, plane extent. |
| `src/modules/modulation/panels.tsx` (create) | `ConstellationPanel`, `ThresholdPanel`, `SerCurvePanel`, `MessagePanel` (Canvas components). |
| `src/modules/modulation/codec.ts` (create) | Pure bit↔symbol mapping + `transmitMessage` (encode → channel → detect → decode) for text/image transmission. |
| `src/modules/modulation/ModulationModule.tsx` (create) | Controls, sim loop (live TX: noise-vector arrow, fading cloud, SER odometer), readouts, theory, message/image transmission wiring. |
| `src/modules/modulation/modulation.css` (create) | Module-local styles (reuse `.module-layout` from sampling.css conventions). |
| `src/App.tsx` (modify) | Replace the `/modulation` placeholder with `<ModulationModule />`. |
| `tests/dsp/draw.test.ts` (create) | Unit tests for `logScale` + `regionColors`. |
| `tests/modules/modulation-model.test.ts` (create) | Unit tests for `buildModulationView`. |
| `tests/modules/modulation-codec.test.ts` (create) | Round-trip + noiseless transmission tests for `codec.ts`. |
| `tests/modules/ModulationModule.test.tsx` (create) | Render smoke test + control interaction. |

**Committed 2a APIs consumed (do not modify):**
- `makeConstellation(scheme, M, eb=1): Constellation` with `{ scheme, M, dim, points:number[][], labels:string[], bitsPerSymbol, dMin, EsAvg }` — `src/lib/dsp/modulation.ts`.
- `detectML(r, points)`, `detectMAP(r, points, priors, n0)`, `mapThreshold1D(s0, s1, p0, p1, n0)` — `src/lib/dsp/detector.ts`.
- `theoreticalSer(scheme, M, ebN0Db)`, `simulateSer({constellation, ebN0Db, numSymbols, decision, priors?, seed?})` — `src/lib/dsp/ser.ts`.
- `n0FromEbN0Db(ebN0Db, eb)`, `sigmaFromN0(n0)`, `addAwgn(point, sigma, rng)` — `src/lib/dsp/awgn.ts`.
- `makeRng(seed)`, `textToBits(text)`, `bitsToText(bits)`, `Bit` — `src/lib/sim/sources.ts`.
- `linspace` — `src/lib/dsp/math.ts`.

---

## Task 1: i18n strings

**Files:**
- Modify: `src/i18n/en.ts` (append before the closing `};`)

- [ ] **Step 1: Add the modulation key block**

Append these entries to the `en` object in `src/i18n/en.ts` (immediately after the last `sampling.*` entry, before `};`):

```ts
  // Modulation & Detection (CH9)
  'modulation.scheme': 'Scheme',
  'modulation.scheme.bpsk': 'BPSK',
  'modulation.scheme.bask': 'BASK (OOK)',
  'modulation.scheme.bfsk': 'BFSK',
  'modulation.scheme.mpsk': 'M-PSK',
  'modulation.scheme.mask': 'M-ASK',
  'modulation.scheme.mqam': 'M-QAM',
  'modulation.scheme.mfsk': 'M-FSK',
  'modulation.M': 'Order M',
  'modulation.ebn0': 'Eb/N₀',
  'modulation.numSymbols': 'Symbols / run',
  'modulation.decision': 'Detector',
  'modulation.decision.ml': 'ML (min distance)',
  'modulation.decision.map': 'MAP (prior-aware)',
  'modulation.prior0': 'Prior P(s₀)',
  'modulation.showRegions': 'Show decision regions',
  'modulation.showLabels': 'Show Gray labels',
  'modulation.panel.constellation': 'Signal-space constellation',
  'modulation.panel.threshold': 'Decision axis ψ₁ (threshold)',
  'modulation.panel.ser': 'Symbol-error rate vs Eb/N₀',
  'modulation.panel.message': 'Message transmission',
  'modulation.readout.dim': 'Dimensions N',
  'modulation.readout.bits': 'Bits/symbol k',
  'modulation.readout.dmin': 'Min distance d_min',
  'modulation.readout.esavg': 'Avg symbol energy Eₛ',
  'modulation.readout.sigma': 'Noise σ / dim',
  'modulation.readout.serTheory': 'Theoretical Pₑ',
  'modulation.readout.serLive': 'Live SER',
  'modulation.readout.errors': 'Errors / total',
  'modulation.notDrawable': 'This constellation has N > 2 dimensions and cannot be drawn in a 2-D plane. The SER curve and live error counting below still work.',
  'modulation.runSweep': 'Run simulated sweep',
  'modulation.legend.theory': 'Theory',
  'modulation.legend.sim': 'Simulated',
  'modulation.legend.live': 'Live',
  'modulation.message.mode': 'Payload',
  'modulation.message.text': 'Text',
  'modulation.message.image': 'Image (16×16)',
  'modulation.message.input': 'Message',
  'modulation.message.send': 'Transmit',
  'modulation.message.original': 'Original',
  'modulation.message.received': 'Received',
  'modulation.message.ber': 'Bit-error rate',
  'modulation.message.symErr': 'Symbol errors',
  'modulation.theory.title': 'Detection theory',
```

- [ ] **Step 2: Verify the dictionary still type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0 (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.ts
git commit -m "feat(modulation): add i18n strings for modulation module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Drawing primitives (pure helpers first, TDD)

**Files:**
- Modify: `src/lib/plot/draw.ts`
- Test: `tests/dsp/draw.test.ts`

- [ ] **Step 1: Write the failing test for `logScale` and `regionColors`**

Create `tests/dsp/draw.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { logScale, regionColors } from '@/lib/plot/draw';

describe('logScale', () => {
  it('maps decade endpoints to the pixel range', () => {
    const s = logScale([1e-4, 1], [200, 0]); // y-pixels: bottom=200 at 1e-4, top=0 at 1
    expect(s(1)).toBeCloseTo(0, 6);
    expect(s(1e-4)).toBeCloseTo(200, 6);
  });

  it('places a mid-decade value proportionally in log space', () => {
    const s = logScale([1e-2, 1], [100, 0]); // 2 decades over 100px
    expect(s(1e-1)).toBeCloseTo(50, 6); // one decade up = halfway
  });

  it('clamps inputs at or below zero to the domain floor', () => {
    const s = logScale([1e-3, 1], [90, 0]);
    expect(s(0)).toBeCloseTo(90, 6);
    expect(s(-5)).toBeCloseTo(90, 6);
  });
});

describe('regionColors', () => {
  it('returns one translucent color per symbol', () => {
    const cols = regionColors(4);
    expect(cols).toHaveLength(4);
    for (const c of cols) expect(c).toMatch(/^hsla\(/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/draw.test.ts`
Expected: FAIL with "logScale is not exported" / "regionColors is not a function".

- [ ] **Step 3: Implement the new primitives**

Append to `src/lib/plot/draw.ts`:

```ts
/** Logarithmic (base-10) scale. Inputs <= 0 clamp to the domain floor. */
export function logScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  const m = (r1 - r0) / (l1 - l0);
  return (v: number) => {
    const lv = v <= d0 ? l0 : Math.log10(v);
    return r0 + (lv - l0) * m;
  };
}

/** M evenly-spaced translucent hues for decision-region fills. */
export function regionColors(M: number, alpha = 0.16): string[] {
  const out: string[] = [];
  for (let i = 0; i < M; i++) {
    const hue = Math.round((360 * i) / M);
    out.push(`hsla(${hue}, 70%, 55%, ${alpha})`);
  }
  return out;
}

/** Draw an arrow from (x0,y0) to (x1,y1) in data coordinates. */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 1.5,
): void {
  const px0 = ax.x(x0);
  const py0 = ax.y(y0);
  const px1 = ax.x(x1);
  const py1 = ax.y(y1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px1, py1);
  ctx.stroke();
  const ang = Math.atan2(py1 - py0, px1 - px0);
  const head = 7;
  ctx.beginPath();
  ctx.moveTo(px1, py1);
  ctx.lineTo(px1 - head * Math.cos(ang - Math.PI / 6), py1 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(px1 - head * Math.cos(ang + Math.PI / 6), py1 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/** Draw a text label anchored at a data point (pixel offsets in CSS px). */
export function drawText(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xData: number,
  yData: number,
  text: string,
  color: string,
  dx = 6,
  dy = -6,
  font = '11px system-ui, sans-serif',
): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, ax.x(xData) + dx, ax.y(yData) + dy);
}

/**
 * Shade decision regions by classifying a coarse data-space grid.
 * `classify(x, y)` returns a symbol index; `colors[index]` fills that cell.
 */
export function drawRegions(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  domainY: [number, number],
  classify: (x: number, y: number) => number,
  colors: string[],
  n = 80,
): void {
  const [x0, x1] = domainX;
  const [y0, y1] = domainY;
  const dx = (x1 - x0) / n;
  const dy = (y1 - y0) / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * dx;
      const cy = y0 + (j + 0.5) * dy;
      const idx = classify(cx, cy);
      const left = ax.x(x0 + i * dx);
      const right = ax.x(x0 + (i + 1) * dx);
      const top = ax.y(y0 + (j + 1) * dy);
      const bottom = ax.y(y0 + j * dy);
      ctx.fillStyle = colors[idx] ?? 'transparent';
      ctx.fillRect(left, top, right - left + 1, bottom - top + 1);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/draw.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/plot/draw.ts tests/dsp/draw.test.ts
git commit -m "feat(plot): add logScale, regionColors, arrow/text/region primitives

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: The pure view model (`model.ts`, TDD)

**Files:**
- Create: `src/modules/modulation/model.ts`
- Test: `tests/modules/modulation-model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/modules/modulation-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildModulationView, type ModulationParams } from '@/modules/modulation/model';

const base: ModulationParams = {
  scheme: 'bpsk',
  M: 2,
  ebN0Db: 8,
  decision: 'ml',
  prior0: 0.5,
};

describe('buildModulationView', () => {
  it('projects a 2-D scheme to drawable points', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 4 });
    expect(v.drawable).toBe(true);
    expect(v.dim).toBe(2);
    expect(v.points2d).toHaveLength(4);
    expect(v.labels).toHaveLength(4);
  });

  it('flags >2-D schemes as not drawable but still gives a SER curve', () => {
    const v = buildModulationView({ ...base, scheme: 'mfsk', M: 4 });
    expect(v.drawable).toBe(false);
    expect(v.points2d).toHaveLength(0);
    expect(v.serCurve.pe.length).toBe(v.serCurve.ebN0Db.length);
  });

  it('puts 1-D schemes on the y=0 axis with thresholds', () => {
    const v = buildModulationView(base); // BPSK
    expect(v.dim).toBe(1);
    expect(v.points2d.every((p) => p.y === 0)).toBe(true);
    expect(v.axis1d).toBeDefined();
    // BPSK points are +/-sqrt(Eb); ML boundary is the midpoint 0.
    expect(v.axis1d!.thresholds[0].ml).toBeCloseTo(0, 6);
  });

  it('shifts the MAP threshold toward the less-likely symbol', () => {
    // sorted order: index1 (-sqrt Eb, prior 0.2) < index0 (+sqrt Eb, prior 0.8)
    const v = buildModulationView({ ...base, decision: 'map', prior0: 0.8 });
    const th = v.axis1d!.thresholds[0];
    expect(th.ml).toBeCloseTo(0, 6);
    // Boundary moves toward the lower-prior (negative) symbol => threshold < 0.
    expect(th.map).toBeLessThan(0);
  });

  it('builds priors that sum to 1 with prior0 on symbol 0', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 4, decision: 'map', prior0: 0.4 });
    expect(v.priors[0]).toBeCloseTo(0.4, 6);
    expect(v.priors.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('produces a monotonically non-increasing theoretical SER curve', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 8 });
    const pe = v.serCurve.pe;
    for (let i = 1; i < pe.length; i++) expect(pe[i]).toBeLessThanOrEqual(pe[i - 1] + 1e-12);
  });

  it('reports the closest pair for the d_min annotation', () => {
    const v = buildModulationView({ ...base, scheme: 'mqam', M: 16 });
    expect(v.dMinPair[0]).not.toBe(v.dMinPair[1]);
    expect(v.dMin).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/modulation-model.test.ts`
Expected: FAIL with "Cannot find module '@/modules/modulation/model'".

- [ ] **Step 3: Implement `model.ts`**

Create `src/modules/modulation/model.ts`:

```ts
import { makeConstellation, type Scheme, type Constellation } from '@/lib/dsp/modulation';
import { theoreticalSer } from '@/lib/dsp/ser';
import { n0FromEbN0Db, sigmaFromN0 } from '@/lib/dsp/awgn';
import { mapThreshold1D } from '@/lib/dsp/detector';
import { linspace } from '@/lib/dsp/math';

export type Decision = 'ml' | 'map';

export interface ModulationParams {
  scheme: Scheme;
  M: number;
  ebN0Db: number;
  decision: Decision;
  /** Prior of symbol 0 in [0,1]; remaining mass split equally over the others. MAP only. */
  prior0: number;
}

export interface Pt2 {
  x: number;
  y: number;
}

export interface Threshold1D {
  ml: number; // ML boundary (midpoint of adjacent points)
  map: number; // MAP boundary (prior-shifted)
}

export interface Axis1D {
  positions: number[]; // point x-positions, ascending
  order: number[]; // constellation indices in ascending-position order
  thresholds: Threshold1D[]; // length positions.length - 1
}

export interface ModulationView {
  constellation: Constellation;
  drawable: boolean; // dim <= 2
  dim: number;
  points2d: Pt2[]; // projected points (dim===1 -> y=0); empty when !drawable
  labels: string[];
  dMin: number;
  dMinPair: [number, number];
  EsAvg: number;
  bitsPerSymbol: number;
  eb: number;
  n0: number;
  sigma: number;
  priors: number[];
  axis1d?: Axis1D; // present only for dim === 1
  theoreticalSerNow: number;
  serCurve: { ebN0Db: number[]; pe: number[] };
  extent: number; // symmetric half-extent of the 2-D plane (data units)
}

function projectPoints(c: Constellation): Pt2[] {
  if (c.dim === 1) return c.points.map((p) => ({ x: p[0], y: 0 }));
  if (c.dim === 2) return c.points.map((p) => ({ x: p[0], y: p[1] }));
  return [];
}

function buildPriors(M: number, prior0: number): number[] {
  if (M === 1) return [1];
  const rest = (1 - prior0) / (M - 1);
  const out = new Array<number>(M).fill(rest);
  out[0] = prior0;
  return out;
}

function buildAxis1d(c: Constellation, priors: number[], n0: number): Axis1D {
  const xs = c.points.map((p) => p[0]);
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const positions = order.map((i) => xs[i]);
  const thresholds: Threshold1D[] = [];
  for (let k = 0; k < order.length - 1; k++) {
    const a = order[k];
    const b = order[k + 1];
    const s0 = xs[a];
    const s1 = xs[b];
    thresholds.push({
      ml: (s0 + s1) / 2,
      map: mapThreshold1D(s0, s1, priors[a], priors[b], n0),
    });
  }
  return { positions, order, thresholds };
}

function closestPair(points: number[][]): [number, number] {
  let bi = 0;
  let bj = 1;
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let s = 0;
      for (let d = 0; d < points[i].length; d++) {
        const df = points[i][d] - points[j][d];
        s += df * df;
      }
      if (s < best) {
        best = s;
        bi = i;
        bj = j;
      }
    }
  }
  return [bi, bj];
}

/** Assemble all panel data + scalar metrics for the modulation view. Pure. */
export function buildModulationView(p: ModulationParams): ModulationView {
  const c = makeConstellation(p.scheme, p.M);
  const eb = c.EsAvg / c.bitsPerSymbol;
  const n0 = n0FromEbN0Db(p.ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const priors = buildPriors(c.M, p.prior0);
  const points2d = projectPoints(c);

  const maxCoord = points2d.reduce(
    (m, q) => Math.max(m, Math.abs(q.x), Math.abs(q.y)),
    Math.sqrt(eb),
  );
  const extent = maxCoord + 3.5 * sigma;

  const dbAxis = linspace(0, 14, 29);
  const serCurve = {
    ebN0Db: dbAxis,
    pe: dbAxis.map((db) => theoreticalSer(p.scheme, p.M, db)),
  };

  return {
    constellation: c,
    drawable: c.dim <= 2,
    dim: c.dim,
    points2d,
    labels: c.labels,
    dMin: c.dMin,
    dMinPair: closestPair(c.points),
    EsAvg: c.EsAvg,
    bitsPerSymbol: c.bitsPerSymbol,
    eb,
    n0,
    sigma,
    priors,
    axis1d: c.dim === 1 ? buildAxis1d(c, priors, n0) : undefined,
    theoreticalSerNow: theoreticalSer(p.scheme, p.M, p.ebN0Db),
    serCurve,
    extent,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/modules/modulation-model.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/modulation/model.ts tests/modules/modulation-model.test.ts
git commit -m "feat(modulation): pure view model (projection, priors, thresholds, SER sweep)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Message/image codec (`codec.ts`, TDD)

**Files:**
- Create: `src/modules/modulation/codec.ts`
- Test: `tests/modules/modulation-codec.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/modules/modulation-codec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeConstellation } from '@/lib/dsp/modulation';
import { bitsToSymbols, symbolsToBits, transmit, SMILEY } from '@/modules/modulation/codec';
import { textToBits, bitsToText, type Bit } from '@/lib/sim/sources';

describe('bit<->symbol mapping', () => {
  it('round-trips bits through symbols for k=2', () => {
    const bits: Bit[] = [0, 1, 1, 0, 1, 1, 0, 0];
    const syms = bitsToSymbols(bits, 2);
    expect(syms).toEqual([1, 2, 3, 0]);
    expect(symbolsToBits(syms, 2)).toEqual(bits);
  });

  it('zero-pads a trailing partial group', () => {
    const bits: Bit[] = [1, 0, 1]; // k=2 -> [10, 1_] -> [2, 2]
    const syms = bitsToSymbols(bits, 2);
    expect(syms).toEqual([2, 2]);
  });
});

describe('transmit', () => {
  it('recovers text exactly at very high Eb/N0 (noiseless limit)', () => {
    const c = makeConstellation('mqam', 16);
    const bits = textToBits('EE413');
    const r = transmit(bits, c, { ebN0Db: 50, decision: 'ml', seed: 7 });
    expect(r.bitErrors).toBe(0);
    expect(bitsToText(r.rxBits.slice(0, bits.length))).toBe('EE413');
  });

  it('produces some errors at low Eb/N0', () => {
    const c = makeConstellation('mpsk', 8);
    const bits = textToBits('the quick brown fox');
    const r = transmit(bits, c, { ebN0Db: 0, decision: 'ml', seed: 3 });
    expect(r.bitErrors).toBeGreaterThan(0);
    expect(r.totalBits).toBe(bits.length);
  });

  it('SMILEY bitmap is 256 bits (16x16)', () => {
    expect(SMILEY).toHaveLength(256);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/modulation-codec.test.ts`
Expected: FAIL with "Cannot find module '@/modules/modulation/codec'".

- [ ] **Step 3: Implement `codec.ts`**

Create `src/modules/modulation/codec.ts`. The bitmap is a 16×16 row-major 1-bpp smiley (1 = filled).

```ts
import type { Constellation } from '@/lib/dsp/modulation';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from '@/lib/dsp/awgn';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import { makeRng, type Bit } from '@/lib/sim/sources';

/** Pack bits into symbol indices, k bits per symbol, MSB-first, zero-padded. */
export function bitsToSymbols(bits: Bit[], k: number): number[] {
  const syms: number[] = [];
  for (let i = 0; i < bits.length; i += k) {
    let v = 0;
    for (let b = 0; b < k; b++) v = (v << 1) | (i + b < bits.length ? bits[i + b] : 0);
    syms.push(v);
  }
  return syms;
}

/** Unpack symbol indices back into bits, k bits per symbol, MSB-first. */
export function symbolsToBits(syms: number[], k: number): Bit[] {
  const bits: Bit[] = [];
  for (const s of syms) for (let b = k - 1; b >= 0; b--) bits.push(((s >> b) & 1) as Bit);
  return bits;
}

export interface TransmitOptions {
  ebN0Db: number;
  decision: 'ml' | 'map';
  priors?: number[];
  seed?: number;
}

export interface TransmitResult {
  rxBits: Bit[];
  bitErrors: number;
  totalBits: number;
  symErrors: number;
  totalSymbols: number;
}

/** Encode bits -> symbols -> AWGN channel -> detect -> decode. */
export function transmit(bits: Bit[], c: Constellation, o: TransmitOptions): TransmitResult {
  const k = c.bitsPerSymbol;
  const eb = c.EsAvg / k;
  const n0 = n0FromEbN0Db(o.ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const rng = makeRng(o.seed ?? 1);
  const txSyms = bitsToSymbols(bits, k);
  const priors = o.priors ?? c.points.map(() => 1 / c.M);

  let symErrors = 0;
  const rxSyms = txSyms.map((tx) => {
    const r = addAwgn(c.points[tx], sigma, rng);
    const rx = o.decision === 'map' ? detectMAP(r, c.points, priors, n0) : detectML(r, c.points);
    if (rx !== tx) symErrors++;
    return rx;
  });

  const rxBits = symbolsToBits(rxSyms, k);
  let bitErrors = 0;
  for (let i = 0; i < bits.length; i++) if (rxBits[i] !== bits[i]) bitErrors++;

  return {
    rxBits,
    bitErrors,
    totalBits: bits.length,
    symErrors,
    totalSymbols: txSyms.length,
  };
}

/** 16x16 row-major 1-bpp smiley face (1 = filled). */
// prettier-ignore
export const SMILEY: Bit[] = [
  0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
  0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
  0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,
  0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,
  0,1,0,0,0,1,1,0,0,1,1,0,0,0,1,0,
  1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1,
  1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,
  1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,
  0,1,0,0,1,0,0,0,0,0,0,1,0,0,1,0,
  0,1,0,0,0,1,1,1,1,1,1,0,0,0,1,0,
  0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,
  0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
  0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
] as Bit[];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/modules/modulation-codec.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/modulation/codec.ts tests/modules/modulation-codec.test.ts
git commit -m "feat(modulation): message/image codec (bit<->symbol, channel transmit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Canvas panels (`panels.tsx`)

**Files:**
- Create: `src/modules/modulation/panels.tsx`

> No new pure logic here — panels are thin Canvas wrappers verified by the module smoke test (Task 7) and by browser verification (Task 8). Follow the `sampling/panels.tsx` structure exactly.

- [ ] **Step 1: Create `panels.tsx`**

Create `src/modules/modulation/panels.tsx`:

```tsx
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  logScale,
  drawAxes,
  drawLine,
  drawScatter,
  drawVLine,
  drawArrow,
  drawText,
  drawRegions,
  regionColors,
  type Axes,
} from '@/lib/plot/draw';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import type { ModulationView, Pt2 } from './model';

const COL = {
  axis: 'rgba(154,167,180,0.5)',
  point: '#4aa3ff',
  label: '#cdd6e0',
  cloud: 'rgba(74,163,255,0.35)',
  cloudErr: 'rgba(255,92,92,0.6)',
  dmin: 'rgba(255,180,84,0.9)',
  ml: '#46c93a',
  map: '#ff7c7c',
  theory: '#4aa3ff',
  sim: '#ffb454',
  live: '#46c93a',
  marker: 'rgba(255,92,92,0.8)',
};

const PAD = { l: 34, r: 12, t: 12, b: 24 };

function axesFor(w: number, h: number, dx: [number, number], dy: [number, number]): Axes {
  return {
    x: linScale(dx, [PAD.l, w - PAD.r]),
    y: linScale(dy, [h - PAD.b, PAD.t]),
  };
}

export interface CloudPt {
  x: number;
  y: number;
  err: boolean;
}

export interface ConstellationPanelProps {
  view: ModulationView;
  decision: 'ml' | 'map';
  showRegions: boolean;
  showLabels: boolean;
  cloud: CloudPt[];
  arrow?: { from: Pt2; to: Pt2 };
}

export function ConstellationPanel({
  view,
  decision,
  showRegions,
  showLabels,
  cloud,
  arrow,
}: ConstellationPanelProps) {
  const e = view.extent;
  const colors = regionColors(view.constellation.M);
  return (
    <Canvas
      height={320}
      ariaLabel="Signal-space constellation with decision regions and received cloud"
      deps={[view, decision, showRegions, showLabels, cloud, arrow]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-e, e]);
        const pts = view.constellation.points;
        const n0 = view.n0;
        const priors = view.priors;
        if (showRegions) {
          drawRegions(
            ctx,
            ax,
            [-e, e],
            [-e, e],
            (x, y) =>
              decision === 'map'
                ? detectMAP([x, y], pts, priors, n0)
                : detectML([x, y], pts),
            colors,
            80,
          );
        }
        // axes cross
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, [0, 0], [-e, e], COL.axis, 1);
        // received cloud
        for (const p of cloud) {
          drawScatter(ctx, ax, [p.x], [p.y], p.err ? COL.cloudErr : COL.cloud, 1.6);
        }
        // d_min annotation
        const [i, j] = view.dMinPair;
        const a = view.points2d[i];
        const b = view.points2d[j];
        if (a && b) {
          drawLine(ctx, ax, [a.x, b.x], [a.y, b.y], COL.dmin, 1.5, true);
          drawText(ctx, ax, (a.x + b.x) / 2, (a.y + b.y) / 2, 'd_min', COL.dmin, 4, -4);
        }
        // ideal points + labels
        for (let k = 0; k < view.points2d.length; k++) {
          const p = view.points2d[k];
          drawScatter(ctx, ax, [p.x], [p.y], COL.point, 4.5);
          if (showLabels) drawText(ctx, ax, p.x, p.y, view.labels[k], COL.label, 7, -7);
        }
        // live noise-vector arrow
        if (arrow) {
          drawArrow(ctx, ax, arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, COL.map, 1.5);
        }
      }}
    />
  );
}

export interface ThresholdPanelProps {
  view: ModulationView;
  decision: 'ml' | 'map';
  showLabels: boolean;
  cloud: CloudPt[];
}

export function ThresholdPanel({ view, decision, showLabels, cloud }: ThresholdPanelProps) {
  const e = view.extent;
  const yJit = 1; // arbitrary vertical strip for the 1-D cloud
  return (
    <Canvas
      height={200}
      ariaLabel="One-dimensional decision axis with ML/MAP thresholds"
      deps={[view, decision, showLabels, cloud]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-yJit, yJit]);
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        // received cloud jittered vertically
        for (const p of cloud) {
          drawScatter(ctx, ax, [p.x], [p.y], p.err ? COL.cloudErr : COL.cloud, 1.6);
        }
        // thresholds
        if (view.axis1d) {
          for (const th of view.axis1d.thresholds) {
            drawVLine(ctx, ax, th.ml, -yJit, yJit, COL.ml, false, 1.5);
            if (decision === 'map') drawVLine(ctx, ax, th.map, -yJit, yJit, COL.map, true, 1.5);
          }
        }
        // ideal points + labels on the axis
        for (let k = 0; k < view.points2d.length; k++) {
          const p = view.points2d[k];
          drawScatter(ctx, ax, [p.x], [0], COL.point, 5);
          if (showLabels) drawText(ctx, ax, p.x, 0, view.labels[k], COL.label, 0, -12);
        }
      }}
    />
  );
}

export interface SerCurvePanelProps {
  view: ModulationView;
  ebN0Db: number;
  simPoints: { ebN0Db: number; ser: number }[];
  livePoint?: { ebN0Db: number; ser: number };
}

const SER_FLOOR = 1e-5;

export function SerCurvePanel({ view, ebN0Db, simPoints, livePoint }: SerCurvePanelProps) {
  const xDom: [number, number] = [0, 14];
  const yDom: [number, number] = [SER_FLOOR, 1];
  return (
    <Canvas
      height={260}
      ariaLabel="Symbol-error rate versus Eb/N0, theoretical curve and simulated markers"
      deps={[view, ebN0Db, simPoints, livePoint]}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale(xDom, [PAD.l, w - PAD.r]),
          y: logScale(yDom, [h - PAD.b, PAD.t]),
        };
        // grid: decade lines
        ctx.strokeStyle = COL.axis;
        ctx.lineWidth = 1;
        for (let d = 0; d >= -5; d--) {
          const yv = 10 ** d;
          const py = ax.y(yv);
          ctx.beginPath();
          ctx.moveTo(PAD.l, py);
          ctx.lineTo(w - PAD.r, py);
          ctx.stroke();
          drawText(ctx, { x: ax.x, y: () => py }, 0, 0, `1e${d}`, COL.label, -PAD.l + 2, 0);
        }
        // theoretical curve
        const ys = view.serCurve.pe.map((v) => Math.max(v, SER_FLOOR));
        drawLine(ctx, ax, view.serCurve.ebN0Db, ys, COL.theory, 2);
        // current operating point on the curve
        drawVLine(ctx, ax, ebN0Db, SER_FLOOR, 1, COL.marker, true, 1);
        // simulated markers
        for (const s of simPoints) {
          drawScatter(ctx, ax, [s.ebN0Db], [Math.max(s.ser, SER_FLOOR)], COL.sim, 3.5);
        }
        if (livePoint) {
          drawScatter(
            ctx,
            ax,
            [livePoint.ebN0Db],
            [Math.max(livePoint.ser, SER_FLOOR)],
            COL.live,
            4.5,
          );
        }
      }}
    />
  );
}

export interface MessagePanelProps {
  width: number;
  height: number;
  bits: { value: 0 | 1 }[] | number[]; // row-major 1-bpp
  ariaLabel: string;
}

/** Render a row-major 1-bpp bitmap as filled cells. */
export function BitmapView({
  width,
  height,
  bits,
  ariaLabel,
}: {
  width: number;
  height: number;
  bits: number[];
  ariaLabel: string;
}) {
  return (
    <Canvas
      height={128}
      ariaLabel={ariaLabel}
      deps={[width, height, bits]}
      draw={(ctx, w, h) => {
        const cw = w / width;
        const ch = h / height;
        ctx.fillStyle = '#0b0e13';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#cdd6e0';
        for (let r = 0; r < height; r++) {
          for (let col = 0; col < width; col++) {
            if (bits[r * width + col]) ctx.fillRect(col * cw, r * ch, cw + 0.5, ch + 0.5);
          }
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/modules/modulation/panels.tsx
git commit -m "feat(modulation): constellation, threshold, SER, and bitmap panels

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Module styles (`modulation.css`)

**Files:**
- Create: `src/modules/modulation/modulation.css`

- [ ] **Step 1: Create `modulation.css`**

Create `src/modules/modulation/modulation.css` (reuses the shared `.module-layout` grid defined in `sampling.css`; only module-specific additions live here):

```css
.modulation__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modulation__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.modulation__readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.modulation__plots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .modulation__plots {
    grid-template-columns: 1fr;
  }
}

.modulation__notice {
  padding: 16px;
  border: 1px dashed rgba(255, 180, 84, 0.6);
  border-radius: 8px;
  color: #cdd6e0;
  background: rgba(255, 180, 84, 0.06);
}

.modulation__legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #9aa7b4;
}

.modulation__legend span::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 5px;
  border-radius: 50%;
  vertical-align: middle;
}

.modulation__legend .lg-theory::before { background: #4aa3ff; }
.modulation__legend .lg-sim::before { background: #ffb454; }
.modulation__legend .lg-live::before { background: #46c93a; }

.modulation__message {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modulation__message textarea {
  width: 100%;
  min-height: 60px;
  font-family: ui-monospace, monospace;
  resize: vertical;
}

.modulation__rxtext {
  font-family: ui-monospace, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  background: rgba(154, 167, 180, 0.08);
  border-radius: 6px;
  padding: 8px;
  min-height: 60px;
}
```

- [ ] **Step 2: Confirm `.module-layout` exists in sampling.css**

Run: `grep -n "module-layout" src/modules/sampling/sampling.css`
Expected: a match (the shared grid). If absent, add it to `modulation.css`:

```css
.module-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 760px) {
  .module-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/modulation/modulation.css
git commit -m "feat(modulation): module styles

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: The module component + routing (`ModulationModule.tsx`, App wiring, smoke test)

**Files:**
- Create: `src/modules/modulation/ModulationModule.tsx`
- Modify: `src/App.tsx`
- Test: `tests/modules/ModulationModule.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `tests/modules/ModulationModule.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModulationModule } from '@/modules/modulation/ModulationModule';

describe('ModulationModule', () => {
  it('renders controls and the SER panel', () => {
    render(<ModulationModule />);
    expect(screen.getByLabelText(/Scheme/i)).toBeTruthy();
    expect(
      screen.getByLabelText(/Symbol-error rate versus Eb\/N0/i),
    ).toBeTruthy();
  });

  it('shows the constellation plane for a 2-D scheme (M-PSK) and a not-drawable notice for M-FSK', () => {
    render(<ModulationModule />);
    const scheme = screen.getByLabelText(/Scheme/i) as HTMLSelectElement;
    fireEvent.change(scheme, { target: { value: 'mpsk' } });
    expect(
      screen.getByLabelText(/Signal-space constellation/i),
    ).toBeTruthy();
    fireEvent.change(scheme, { target: { value: 'mfsk' } });
    fireEvent.change(screen.getByLabelText(/Order M/i), { target: { value: '4' } });
    expect(screen.getByText(/cannot be drawn in a 2-D plane/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/ModulationModule.test.tsx`
Expected: FAIL with "Cannot find module '@/modules/modulation/ModulationModule'".

- [ ] **Step 3: Implement `ModulationModule.tsx`**

Create `src/modules/modulation/ModulationModule.tsx`:

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
import { t } from '@/i18n';
import type { Scheme } from '@/lib/dsp/modulation';
import { simulateSer } from '@/lib/dsp/ser';
import { addAwgn } from '@/lib/dsp/awgn';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import { makeRng, textToBits, bitsToText } from '@/lib/sim/sources';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { buildModulationView, type Decision } from './model';
import { transmit, SMILEY } from './codec';
import {
  ConstellationPanel,
  ThresholdPanel,
  SerCurvePanel,
  BitmapView,
  type CloudPt,
} from './panels';
import './modulation.css';

const M_OPTIONS: Record<Scheme, number[]> = {
  bpsk: [2],
  bask: [2],
  bfsk: [2],
  mpsk: [2, 4, 8, 16],
  mask: [2, 4, 8],
  mqam: [4, 16, 64],
  mfsk: [2, 4, 8],
};

const CLOUD_MAX = 400;
const BATCH = 40;

export function ModulationModule() {
  const [scheme, setScheme] = useState<Scheme>('mpsk');
  const [M, setM] = useState(4);
  const [ebN0Db, setEbN0Db] = useState(8);
  const [numSymbols, setNumSymbols] = useState(2000);
  const [decision, setDecision] = useState<Decision>('ml');
  const [prior0, setPrior0] = useState(0.5);
  const [showRegions, setShowRegions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const [simPoints, setSimPoints] = useState<{ ebN0Db: number; ser: number }[]>([]);
  const [cloud, setCloud] = useState<CloudPt[]>([]);
  const [arrow, setArrow] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | undefined>();
  const [liveSer, setLiveSer] = useState<{ errors: number; total: number } | null>(null);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const cloudRef = useRef<CloudPt[]>([]);
  const rngRef = useRef(makeRng(12345));

  const handleScheme = (s: Scheme) => {
    setScheme(s);
    const opts = M_OPTIONS[s];
    if (!opts.includes(M)) setM(opts[0]);
    setSimPoints([]);
  };

  const view = useMemo(
    () => buildModulationView({ scheme, M, ebN0Db, decision, prior0 }),
    [scheme, M, ebN0Db, decision, prior0],
  );

  const project = (p: number[]): { x: number; y: number } => ({
    x: p[0] ?? 0,
    y: view.dim === 1 ? (rngRef.current() - 0.5) * 0.6 : (p[1] ?? 0),
  });

  const pickTx = (): number => {
    if (decision === 'map') {
      let acc = 0;
      const u = rngRef.current();
      for (let i = 0; i < M; i++) {
        acc += view.priors[i];
        if (u < acc) return i;
      }
      return M - 1;
    }
    return Math.min(M - 1, Math.floor(rngRef.current() * M));
  };

  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: () => {
      const c = view.constellation;
      let lastArrow: typeof arrow;
      const newCloud: CloudPt[] = [];
      for (let b = 0; b < BATCH; b++) {
        const tx = pickTx();
        const r = addAwgn(c.points[tx], view.sigma, rngRef.current);
        const rx =
          decision === 'map'
            ? detectMAP(r, c.points, view.priors, view.n0)
            : detectML(r, c.points);
        const err = rx !== tx;
        if (err) errRef.current++;
        totRef.current++;
        if (view.drawable) {
          const rp = project(r);
          newCloud.push({ x: rp.x, y: rp.y, err });
          if (b === BATCH - 1) {
            const ideal = view.points2d[tx];
            lastArrow = { from: ideal, to: rp };
          }
        }
      }
      const merged = [...cloudRef.current, ...newCloud].slice(-CLOUD_MAX);
      cloudRef.current = merged;
      setCloud(merged);
      setArrow(lastArrow);
      setLiveSer({ errors: errRef.current, total: totRef.current });
    },
    onReset: () => {
      errRef.current = 0;
      totRef.current = 0;
      cloudRef.current = [];
      setCloud([]);
      setArrow(undefined);
      setLiveSer(null);
    },
  });

  const runSweep = () => {
    const points: { ebN0Db: number; ser: number }[] = [];
    for (let db = 0; db <= 14; db += 2) {
      const r = simulateSer({
        constellation: view.constellation,
        ebN0Db: db,
        numSymbols,
        decision,
        priors: decision === 'map' ? view.priors : undefined,
        seed: 999,
      });
      points.push({ ebN0Db: db, ser: r.ser });
    }
    setSimPoints(points);
  };

  const livePoint =
    liveSer && liveSer.total > 0
      ? { ebN0Db, ser: liveSer.errors / liveSer.total }
      : undefined;

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('nav.modulation')}>
          <Select<Scheme>
            label={t('modulation.scheme')}
            value={scheme}
            onChange={handleScheme}
            options={[
              { value: 'bpsk', label: t('modulation.scheme.bpsk') },
              { value: 'bask', label: t('modulation.scheme.bask') },
              { value: 'bfsk', label: t('modulation.scheme.bfsk') },
              { value: 'mpsk', label: t('modulation.scheme.mpsk') },
              { value: 'mask', label: t('modulation.scheme.mask') },
              { value: 'mqam', label: t('modulation.scheme.mqam') },
              { value: 'mfsk', label: t('modulation.scheme.mfsk') },
            ]}
          />
          <Select<number>
            label={t('modulation.M')}
            value={M}
            onChange={(v) => {
              setM(v);
              setSimPoints([]);
            }}
            options={M_OPTIONS[scheme].map((m) => ({ value: m, label: String(m) }))}
          />
          <Slider
            label={t('modulation.ebn0')}
            value={ebN0Db}
            min={0}
            max={14}
            step={0.5}
            unit="dB"
            onChange={setEbN0Db}
          />
          <Slider
            label={t('modulation.numSymbols')}
            value={numSymbols}
            min={500}
            max={20000}
            step={500}
            onChange={setNumSymbols}
          />
          <Select<Decision>
            label={t('modulation.decision')}
            value={decision}
            onChange={setDecision}
            options={[
              { value: 'ml', label: t('modulation.decision.ml') },
              { value: 'map', label: t('modulation.decision.map') },
            ]}
          />
          {decision === 'map' && (
            <Slider
              label={t('modulation.prior0')}
              value={prior0}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={setPrior0}
            />
          )}
          <Toggle label={t('modulation.showRegions')} checked={showRegions} onChange={setShowRegions} />
          <Toggle label={t('modulation.showLabels')} checked={showLabels} onChange={setShowLabels} />
          <button type="button" onClick={runSweep}>
            {t('modulation.runSweep')}
          </button>
          <TransportControls loop={loop} />
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.readout.dim')} value={view.dim} />
          <Readout label={t('modulation.readout.bits')} value={view.bitsPerSymbol} />
          <Readout label={t('modulation.readout.dmin')} value={view.dMin.toFixed(3)} />
          <Readout label={t('modulation.readout.esavg')} value={view.EsAvg.toFixed(3)} />
          <Readout label={t('modulation.readout.sigma')} value={view.sigma.toFixed(3)} />
          <Readout label={t('modulation.readout.serTheory')} value={view.theoreticalSerNow.toExponential(2)} />
          <Readout
            label={t('modulation.readout.serLive')}
            value={livePoint ? livePoint.ser.toExponential(2) : '—'}
            tone={livePoint ? 'ok' : undefined}
          />
          <Readout
            label={t('modulation.readout.errors')}
            value={liveSer ? `${liveSer.errors} / ${liveSer.total}` : '—'}
          />
        </div>

        <div className="modulation__plots">
          <Panel
            title={
              view.dim === 1
                ? t('modulation.panel.threshold')
                : t('modulation.panel.constellation')
            }
          >
            {view.dim === 1 ? (
              <ThresholdPanel view={view} decision={decision} showLabels={showLabels} cloud={cloud} />
            ) : view.drawable ? (
              <ConstellationPanel
                view={view}
                decision={decision}
                showRegions={showRegions}
                showLabels={showLabels}
                cloud={cloud}
                arrow={arrow}
              />
            ) : (
              <p className="modulation__notice">{t('modulation.notDrawable')}</p>
            )}
          </Panel>

          <Panel title={t('modulation.panel.ser')}>
            <SerCurvePanel
              view={view}
              ebN0Db={ebN0Db}
              simPoints={simPoints}
              livePoint={livePoint}
            />
            <div className="modulation__legend">
              <span className="lg-theory">{t('modulation.legend.theory')}</span>
              <span className="lg-sim">{t('modulation.legend.sim')}</span>
              <span className="lg-live">{t('modulation.legend.live')}</span>
            </div>
          </Panel>
        </div>

        <MessageTransmission
          scheme={scheme}
          M={M}
          ebN0Db={ebN0Db}
          decision={decision}
          priors={view.priors}
          constellation={view.constellation}
        />

        <TheoryBox title={t('modulation.theory.title')}>
          <p>
            <Formula tex="\hat{s}_{\mathrm{ML}}=\arg\min_i \lVert r-s_i\rVert^2" block />
          </p>
          <p>
            <Formula tex="\hat{s}_{\mathrm{MAP}}=\arg\min_i\{\lVert r-s_i\rVert^2 - N_0\ln P(s_i)\}" block />
          </p>
          <p>
            <Formula tex="x^*=\tfrac{s_0+s_1}{2}+\dfrac{N_0\ln(p_0/p_1)}{2(s_1-s_0)}" block />
          </p>
          <p>
            <Formula tex="P_e^{\mathrm{BPSK}}=Q\!\left(\sqrt{2E_b/N_0}\right),\quad Q(x)=\tfrac12\operatorname{erfc}\!\left(\tfrac{x}{\sqrt2}\right)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}

function MessageTransmission({
  ebN0Db,
  decision,
  priors,
  constellation,
}: {
  scheme: Scheme;
  M: number;
  ebN0Db: number;
  decision: Decision;
  priors: number[];
  constellation: ReturnType<typeof buildModulationView>['constellation'];
}) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('EE413 Communication Systems');
  const [result, setResult] = useState<{
    rxText?: string;
    rxBits: number[];
    ber: number;
    symErr: number;
    totalSym: number;
  } | null>(null);

  const send = () => {
    const bits = mode === 'text' ? textToBits(text) : SMILEY;
    const r = transmit(bits, constellation, {
      ebN0Db,
      decision,
      priors: decision === 'map' ? priors : undefined,
      seed: 4242,
    });
    setResult({
      rxText: mode === 'text' ? bitsToText(r.rxBits.slice(0, bits.length)) : undefined,
      rxBits: r.rxBits,
      ber: r.totalBits ? r.bitErrors / r.totalBits : 0,
      symErr: r.symErrors,
      totalSym: r.totalSymbols,
    });
  };

  return (
    <Panel title={t('modulation.panel.message')}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <Select<'text' | 'image'>
          label={t('modulation.message.mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'text', label: t('modulation.message.text') },
            { value: 'image', label: t('modulation.message.image') },
          ]}
        />
        <button type="button" onClick={send}>
          {t('modulation.message.send')}
        </button>
      </div>

      {mode === 'text' ? (
        <div className="modulation__message">
          <div>
            <div className="muted">{t('modulation.message.original')}</div>
            <textarea
              aria-label={t('modulation.message.input')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <div className="muted">{t('modulation.message.received')}</div>
            <div className="modulation__rxtext">{result?.rxText ?? '—'}</div>
          </div>
        </div>
      ) : (
        <div className="modulation__message">
          <div>
            <div className="muted">{t('modulation.message.original')}</div>
            <BitmapView width={16} height={16} bits={SMILEY} ariaLabel="Original bitmap" />
          </div>
          <div>
            <div className="muted">{t('modulation.message.received')}</div>
            <BitmapView
              width={16}
              height={16}
              bits={result ? result.rxBits.slice(0, 256) : SMILEY.map(() => 0)}
              ariaLabel="Received bitmap"
            />
          </div>
        </div>
      )}

      {result && (
        <div className="modulation__readouts" style={{ marginTop: 10 }}>
          <Readout label={t('modulation.message.ber')} value={result.ber.toExponential(2)} />
          <Readout
            label={t('modulation.message.symErr')}
            value={`${result.symErr} / ${result.totalSym}`}
          />
        </div>
      )}
    </Panel>
  );
}
```

> Note: `Readout`'s `tone` prop accepts `'ok' | 'warn' | 'err'` (see `src/components/Readout.tsx`). If the `muted` class is not defined globally, it is harmless (unstyled). If `Select` does not support a `number` value generic, confirm against `src/components/Select.tsx` before Step 4; it is generic (`Select<T>`) as used in `SamplingModule.tsx`.

- [ ] **Step 4: Wire routing in `App.tsx`**

In `src/App.tsx`, add the import after the `SamplingModule` import (line 6):

```tsx
import { ModulationModule } from '@/modules/modulation/ModulationModule';
```

Replace the `/modulation` route (lines 48-51) — change:

```tsx
            <Route
              path="/modulation"
              element={<ModulePlaceholder title={t('nav.modulation')} />}
            />
```

to:

```tsx
            <Route path="/modulation" element={<ModulationModule />} />
```

- [ ] **Step 5: Run the smoke test to verify it passes**

Run: `npx vitest run tests/modules/ModulationModule.test.tsx`
Expected: PASS (2 tests). If a control label assertion fails, reconcile the test's `getByLabelText` strings with the actual `Slider`/`Select` label rendering (they render `<label>` wrapping the input — confirm against `SamplingModule.test.tsx`).

- [ ] **Step 6: Commit**

```bash
git add src/modules/modulation/ModulationModule.tsx src/App.tsx tests/modules/ModulationModule.test.tsx
git commit -m "feat(modulation): interactive module + live TX + message transmission, mount at /modulation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full verification + browser check

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass — prior 98 (dsp + sampling) + new draw (4) + modulation-model (7) + modulation-codec (5) + ModulationModule (2). No failures.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0, no warnings.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc --noEmit` clean, `vite build` succeeds.

- [ ] **Step 4: Browser verification** (manual — `npm run dev`, open `/#/modulation`)

Confirm each spec item:
- M-PSK (M=4/8): constellation points on a circle, shaded ML regions are angular sectors; toggling MAP with `P(s₀)` ≠ 0.5 visibly grows symbol 0's region.
- M-QAM (M=16): square grid, `d_min` annotation between two nearest points, ML regions are square Voronoi cells.
- BPSK / BASK / M-ASK: threshold panel shows the ψ₁ axis; ML midpoint line (green) and, in MAP, the shifted dashed line moves toward the lower-prior symbol.
- M-FSK (M=4/8): "cannot be drawn in a 2-D plane" notice shown; SER curve + live counting still update.
- Press play: received cloud fades in around the points, the red noise-vector arrow tracks the latest symbol, the Live SER readout converges toward the theoretical Pₑ; lowering Eb/N0 thickens the cloud and raises errors.
- "Run simulated sweep": orange markers land on the theoretical curve (log-y).
- Message: default text round-trips cleanly at Eb/N0 = 14 dB; at ~2 dB the received text shows garbling and BER > 0. Image mode shows the smiley degrading as Eb/N0 drops.

- [ ] **Step 5: Final status check**

Run: `git status -s`
Expected: clean (all changes committed across Tasks 1-7).

---

## Self-Review (spec coverage — design §6.2, Phase 2b deferred items)

- **Constellation plane (points + axes/labels, noise cloud), shaded decision regions (ML Voronoi / MAP-shifted), `d_min` annotation** → Task 5 `ConstellationPanel` + `drawRegions` grid classify reusing `detectML`/`detectMAP`; Task 3 `dMinPair`. ✓
- **1-D schemes: ψ axis with threshold line(s), MAP shift visible** → Task 3 `buildAxis1d` (ML midpoint + `mapThreshold1D`), Task 5 `ThresholdPanel`. ✓
- **SER vs Eb/N0 log-y: theoretical curve + simulated markers, multiple schemes** → Task 2 `logScale`, Task 3 `serCurve`, Task 5 `SerCurvePanel`, Task 7 `runSweep` (uses `simulateSer`). ✓
- **Controls: scheme, M, Eb/N0, #symbols, ML/MAP toggle + prior slider (MAP-only), regions on/off, Gray labels on/off** → Task 7. ✓
- **Live transmission: noise-vector arrow, fading received cloud, SER odometer converging to theory** → Task 7 sim loop + `drawArrow`, `liveSer` readout. ✓
- **Text/image transmission, original vs received** → Task 4 `codec.ts` + Task 7 `MessageTransmission` + `BitmapView`. ✓
- **M > 3 not drawable: clear note while SER curve + live counting still work** → Task 3 `drawable` flag, Task 7 notice branch (SER panel + odometer outside the `drawable` guard). ✓

**Placeholder scan:** none — every step contains complete code/commands.

**Type consistency:** `Decision` (`'ml'|'map'`), `ModulationView`, `Pt2`, `CloudPt`, `Threshold1D`, `Axis1D` used identically across `model.ts`, `panels.tsx`, `ModulationModule.tsx`. `buildModulationView` returns `constellation` consumed by `MessageTransmission`/`simulateSer`. `transmit`/`bitsToSymbols`/`symbolsToBits`/`SMILEY` signatures match between `codec.ts` and its test/consumer. New `draw.ts` exports (`logScale`, `regionColors`, `drawArrow`, `drawText`, `drawRegions`) match their panel call sites.

**Open assumptions to verify during execution (do not block):** (1) `Select<T>` generic accepts `number` values — confirmed pattern in `SamplingModule.tsx` uses string generics; if numeric option `value` is coerced to string by the underlying `<select>`, map options to string and parse back in `onChange`. (2) `Readout` `tone` prop name — confirm in `src/components/Readout.tsx` (sampling uses `tone={REGIME_TONE[...]}`). (3) `.module-layout` lives in `sampling.css` and is imported app-wide; Task 6 Step 2 guards this.
```
