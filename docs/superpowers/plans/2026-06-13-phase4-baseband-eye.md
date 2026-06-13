# Phase 4 — Baseband & Eye Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tabbed `/baseband` module (course CH8) covering pulse shaping (raised cosine + roll-off α +
Nyquist zero-ISI), the optimum receiver (matched filter ↔ correlation receiver + RRC split), and the eye
diagram (quantitative margins, 2-/4-PAM) with ISI + ZF/MMSE equalization.

**Architecture:** Pure unit-tested DSP in `src/lib/dsp/{pulse,matchedfilter,eye,equalizer}.ts` (strict TDD).
A single tabbed React module `src/modules/baseband/` (mirrors `src/modules/infotheory/`) with one Section per
tab, a pure `model.ts` for derived data, and `panels.tsx` Canvas wrappers — verified by smoke test + build
(project convention: DSP is strict-TDD, UI is smoke+build). All math via KaTeX `<Formula>`, all strings via `t()`.

**Tech Stack:** React 18 + TypeScript (strict), Vite, Vitest (+ RTL/jsdom), Canvas 2D, KaTeX, `react-router-dom`
HashRouter. `@` alias → `src/`. Tests `npm test -- <path>`, lint `npm run lint`, build `npm run build`.
Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Spec:** `docs/superpowers/specs/2026-06-13-baseband-eye-diagram-design.md`.
**Book:** Proakis & Salehi §7.5 (optimum receiver), §8.3 (Nyquist/raised cosine, eye), §8.6.2 (equalization).

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/dsp/pulse.ts` | Raised-cosine / RRC / sinc pulses, RC spectrum, bandwidth, Nyquist off-center samples |
| `src/lib/dsp/matchedfilter.ts` | `convolve`, `matchedFilter`, `matchedFilterOutput`, `correlate`, `pulseEnergy`, `peakSnr` |
| `src/lib/dsp/eye.ts` | `eyeTraces`, `eyeMetrics` (eye height / noise margin / timing margin) |
| `src/lib/dsp/equalizer.ts` | `zeroForcingTaps`, `mmseTaps`, `applyFilter`, `residualIsi` (+ local `solveLinear`) |
| `src/modules/baseband/model.ts` | Pure derived-data builders for each tab (calls the DSP; no React) |
| `src/modules/baseband/panels.tsx` | Canvas panel components (pulse, spectrum, MF output, eye, taps) |
| `src/modules/baseband/PulseShapingSection.tsx` | Tab 1 |
| `src/modules/baseband/ReceiverSection.tsx` | Tab 2 |
| `src/modules/baseband/EyeEqualizationSection.tsx` | Tab 3 |
| `src/modules/baseband/BasebandModule.tsx` | Tab host |
| `src/modules/baseband/baseband.css` | Tokenized styles (mirrors `infotheory.css`) |
| `src/App.tsx` | Replace `/baseband` placeholder route element with `<BasebandModule />` |
| `src/i18n/en.ts` | Add `baseband.*` keys |
| `tests/dsp/{pulse,matchedfilter,eye,equalizer}.test.ts` | DSP unit tests |
| `tests/modules/BasebandModule.test.tsx` | Render + tab-switch smoke test |

**Reuse (exact signatures confirmed in repo):** `sinc`/`clamp`/`linspace`/`qfunc` (`@/lib/dsp/math`),
`addAwgn(point,sigma,rng)`/`sigmaFromN0(n0)` (`@/lib/dsp/awgn`), `makeRng`/`randomBitSource`/`Bit`
(`@/lib/sim/sources`), `useSimulationLoop({ticksPerSecond,onTick,onReset})` (`@/lib/sim/useSimulationLoop`),
`Canvas` + draw prims `drawLine/drawStems/drawScatter/drawVLine/drawAxes/drawText/linScale` with
`Axes={x:Scale;y:Scale}` and signature `fn(ctx, ax, …)` (`@/lib/plot/...`), and controls
`Panel/Slider/Select/Toggle/Readout/TheoryBox/Formula/TransportControls/NumberInput` (`@/components`).

---

# Milestone 1 — `pulse.ts` + Tab 1 (Pulse Shaping & Nyquist)

## Task 1: `pulse.ts` — raised cosine, RRC, sinc, spectrum, bandwidth, Nyquist samples

**Files:**
- Create: `src/lib/dsp/pulse.ts`
- Test: `tests/dsp/pulse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/pulse.test.ts
import { describe, it, expect } from 'vitest';
import {
  raisedCosine,
  rootRaisedCosine,
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
} from '@/lib/dsp/pulse';
import { convolve } from '@/lib/dsp/matchedfilter';

describe('raisedCosine', () => {
  it('is normalized to 1 at t=0', () => {
    expect(raisedCosine(0, 0.5, 1)).toBeCloseTo(1, 12);
    expect(raisedCosine(0, 0, 1)).toBeCloseTo(1, 12);
  });
  it('is zero at non-zero integer multiples of T (zero ISI)', () => {
    for (const alpha of [0, 0.25, 0.5, 1]) {
      for (const n of [1, 2, 3]) {
        expect(Math.abs(raisedCosine(n, alpha, 1))).toBeLessThan(1e-9);
      }
    }
  });
  it('reduces to a sinc when alpha = 0', () => {
    expect(raisedCosine(0.5, 0, 1)).toBeCloseTo(2 / Math.PI, 6); // sinc(0.5)=2/π
    expect(raisedCosine(1.5, 0, 1)).toBeCloseTo(-2 / (3 * Math.PI), 6);
  });
  it('handles the t = T/(2α) singularity without NaN', () => {
    expect(Number.isFinite(raisedCosine(1, 0.5, 1))).toBe(true); // 2αt/T = 1 → denom 0
  });
});

describe('raisedCosineBandwidth', () => {
  it('is the Nyquist bandwidth 1/2T at alpha=0', () => {
    expect(raisedCosineBandwidth(0, 1)).toBeCloseTo(0.5, 12);
    expect(raisedCosineBandwidth(0, 2)).toBeCloseTo(0.25, 12);
  });
  it('is 1/T at alpha=1 (100% excess bandwidth)', () => {
    expect(raisedCosineBandwidth(1, 1)).toBeCloseTo(1, 12);
  });
});

describe('raisedCosineSpectrum', () => {
  it('is 1 (flat) at f=0', () => {
    expect(raisedCosineSpectrum(0, 0.5, 1)).toBeCloseTo(1, 12);
  });
  it('is 0.5 at the Nyquist frequency 1/2T for any alpha (−6 dB point)', () => {
    for (const alpha of [0.1, 0.5, 1]) {
      expect(raisedCosineSpectrum(0.5, alpha, 1)).toBeCloseTo(0.5, 9);
    }
  });
  it('is 0 beyond (1+alpha)/2T', () => {
    expect(raisedCosineSpectrum(0.9, 0.5, 1)).toBeCloseTo(0, 12); // (1+0.5)/2 = 0.75
  });
  it('is flat (=1) below (1-alpha)/2T', () => {
    expect(raisedCosineSpectrum(0.2, 0.5, 1)).toBeCloseTo(1, 12); // (1-0.5)/2 = 0.25
  });
});

describe('pulseWaveform + nyquistOffCenterSamples', () => {
  it('returns a centered, odd-length sampled pulse with peak 1 at the center', () => {
    const p = pulseWaveform('rc', 0.5, 8, 4); // sps=8, span=4
    expect(p.length).toBe(2 * 4 * 8 + 1);
    expect(p[4 * 8]).toBeCloseTo(1, 12); // center sample
  });
  it('has ~zero raised-cosine samples at every off-center symbol instant', () => {
    const p = pulseWaveform('rc', 0.35, 16, 5);
    for (const v of nyquistOffCenterSamples(p, 16)) {
      expect(Math.abs(v)).toBeLessThan(1e-9);
    }
  });
});

describe('rootRaisedCosine (RRC split = RC ⇒ zero ISI, concept C)', () => {
  it('has the known peak value 1 − α + 4α/π at t=0', () => {
    const alpha = 0.5;
    expect(rootRaisedCosine(0, alpha, 1)).toBeCloseTo(1 - alpha + (4 * alpha) / Math.PI, 9);
  });
  it('cascade of two RRC pulses is a Nyquist pulse: off-center symbol samples → ~0', () => {
    const sps = 16;
    const span = 6;
    const g = pulseWaveform('rrc', 0.5, sps, span);
    const casc = convolve(g, g);
    // center of the cascade:
    const mid = (casc.length - 1) / 2;
    const peak = casc[mid];
    for (const k of [1, 2, 3]) {
      const off = casc[mid + k * sps];
      expect(Math.abs(off / peak)).toBeLessThan(0.03); // truncation-limited zero ISI
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dsp/pulse.test.ts`
Expected: FAIL — `pulse.ts` / its exports do not exist (and `matchedfilter`'s `convolve` is added in Milestone 2;
**for this milestone, temporarily inline a local `convolve` in the test OR implement Task 5's `convolve` first**;
the chosen approach below is: implement `convolve` now as part of `pulse.ts`-adjacent work is NOT done — instead
**re-order: do Task 5 Step "convolve" before this cascade test**. To keep Milestone 1 self-contained, the cascade
test imports `convolve` from `matchedfilter`; create a one-line `matchedfilter.ts` stub exporting `convolve`
first. See Step 3.)

- [ ] **Step 3: Write minimal implementation**

First create the shared `convolve` (also used by Tasks in M2/M3) so the cascade test can import it:

```ts
// src/lib/dsp/matchedfilter.ts  (convolve only for now; rest added in Milestone 2)
/** Full linear convolution; length = x.length + h.length − 1. */
export function convolve(x: number[], h: number[]): number[] {
  if (x.length === 0 || h.length === 0) return [];
  const out = new Array(x.length + h.length - 1).fill(0);
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < h.length; j++) out[i + j] += x[i] * h[j];
  }
  return out;
}
```

Then `pulse.ts`:

```ts
// src/lib/dsp/pulse.ts — baseband pulse shaping. Proakis §8.3 (Nyquist pulse-shaping, raised cosine).
import { sinc } from './math';

export type PulseKind = 'rc' | 'rrc' | 'sinc';

/**
 * Raised-cosine time-domain pulse, normalized so x(0)=1 (Proakis §8.3):
 *   x(t) = sinc(t/T) · cos(π α t/T) / (1 − (2 α t/T)²)
 * α=0 → sinc(t/T). Has exact zeros at every non-zero integer multiple of T (zero ISI).
 */
export function raisedCosine(t: number, alpha: number, T: number): number {
  const x = t / T;
  if (alpha <= 0) return sinc(x);
  const denom = 1 - (2 * alpha * x) ** 2;
  if (Math.abs(denom) < 1e-9) {
    // L'Hôpital limit at t = ±T/(2α):  x(t) = (π/4)·sinc(1/(2α))
    return (Math.PI / 4) * sinc(1 / (2 * alpha));
  }
  return (sinc(x) * Math.cos(Math.PI * alpha * x)) / denom;
}

/**
 * Root-raised-cosine (square-root RC) time-domain pulse, normalized to h(0)=1−α+4α/π.
 * Two RRC pulses convolved = a raised-cosine (Nyquist) pulse ⇒ matched filter that is also zero-ISI.
 */
export function rootRaisedCosine(t: number, alpha: number, T: number): number {
  const tau = t / T;
  if (Math.abs(tau) < 1e-12) return 1 - alpha + (4 * alpha) / Math.PI;
  if (alpha > 0 && Math.abs(Math.abs(4 * alpha * tau) - 1) < 1e-9) {
    // limit at t = ±T/(4α)
    const a = (1 + 2 / Math.PI) * Math.sin(Math.PI / (4 * alpha));
    const b = (1 - 2 / Math.PI) * Math.cos(Math.PI / (4 * alpha));
    return (alpha / Math.SQRT2) * (a + b);
  }
  const num =
    Math.sin(Math.PI * tau * (1 - alpha)) +
    4 * alpha * tau * Math.cos(Math.PI * tau * (1 + alpha));
  const den = Math.PI * tau * (1 - (4 * alpha * tau) ** 2);
  return num / den;
}

/** Sampled pulse over t ∈ [−span·T, span·T] at `sps` samples per symbol (T=1). Length 2·span·sps+1. */
export function pulseWaveform(kind: PulseKind, alpha: number, sps: number, span: number): number[] {
  const T = 1;
  const out: number[] = [];
  for (let i = -span * sps; i <= span * sps; i++) {
    const t = i / sps;
    out.push(
      kind === 'rrc' ? rootRaisedCosine(t, alpha, T) : kind === 'sinc' ? sinc(t / T) : raisedCosine(t, alpha, T),
    );
  }
  return out;
}

/**
 * Raised-cosine magnitude spectrum, normalized to 1 at f=0 (Proakis §8.3):
 *   |f| ≤ (1−α)/2T            : 1
 *   (1−α)/2T < |f| ≤ (1+α)/2T : ½[1 + cos( πT/α · (|f| − (1−α)/2T) )]
 *   |f| > (1+α)/2T            : 0
 */
export function raisedCosineSpectrum(f: number, alpha: number, T: number): number {
  const af = Math.abs(f);
  const f1 = (1 - alpha) / (2 * T);
  const f2 = (1 + alpha) / (2 * T);
  if (af <= f1) return 1;
  if (af > f2) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * T / alpha) * (af - f1)));
}

/** Raised-cosine first-null / absolute bandwidth W = (1+α)/(2T). */
export function raisedCosineBandwidth(alpha: number, T: number): number {
  return (1 + alpha) / (2 * T);
}

/** Sample values at t = nT for n≠0 (the off-center symbol instants); ~0 ⇒ zero ISI. */
export function nyquistOffCenterSamples(pulse: number[], sps: number): number[] {
  const center = (pulse.length - 1) / 2;
  const out: number[] = [];
  for (let k = 1; center + k * sps < pulse.length; k++) {
    out.push(pulse[center + k * sps]);
    out.push(pulse[center - k * sps]);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dsp/pulse.test.ts`
Expected: PASS (all `pulse` describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/pulse.ts src/lib/dsp/matchedfilter.ts tests/dsp/pulse.test.ts
git commit -m "feat(baseband): raised-cosine/RRC pulse DSP + Nyquist zero-ISI (Proakis §8.3)"
```

## Task 2: `model.ts` — Tab 1 derived data + the Baseband module shell + Tab 1 UI

**Files:**
- Create: `src/modules/baseband/model.ts`, `src/modules/baseband/panels.tsx`,
  `src/modules/baseband/PulseShapingSection.tsx`, `src/modules/baseband/BasebandModule.tsx`,
  `src/modules/baseband/baseband.css`
- Modify: `src/App.tsx` (replace `/baseband` placeholder), `src/i18n/en.ts` (add keys)
- Test: `tests/modules/BasebandModule.test.tsx`

- [ ] **Step 1: Add i18n keys** (append inside the `en` object in `src/i18n/en.ts`)

```ts
  // --- Baseband module ---
  'baseband.tab.pulse': 'Pulse Shaping & Nyquist',
  'baseband.tab.receiver': 'Optimum Receiver',
  'baseband.tab.eye': 'Eye, ISI & Equalization',
  'baseband.pulse.kind': 'Pulse shape',
  'baseband.pulse.rc': 'Raised cosine',
  'baseband.pulse.rrc': 'Root raised cosine',
  'baseband.pulse.sinc': 'Sinc (α=0)',
  'baseband.pulse.alpha': 'Roll-off α',
  'baseband.pulse.sps': 'Samples / symbol',
  'baseband.panel.pulseTime': 'Pulse p(t) — zero crossings at nT',
  'baseband.panel.spectrum': 'Spectrum |X(f)| — bandwidth markers',
  'baseband.panel.superpose': 'Shaped symbols — ISI-free superposition',
  'baseband.readout.bandwidth': 'Bandwidth W',
  'baseband.readout.excess': 'Excess bandwidth',
  'baseband.readout.nyquist': 'Nyquist bandwidth 1/2T',
  'baseband.theory.pulse': 'Pulse shaping & the Nyquist criterion',
  // receiver
  'baseband.rx.noise': 'Noise',
  'baseband.rx.n0': 'Noise PSD N₀',
  'baseband.rx.suboptimal': 'Compare sub-optimal filter',
  'baseband.panel.matchedFilter': 'Pulse p(t) and matched filter h(t)=p(T−t)',
  'baseband.panel.mfOutput': 'Matched-filter output — peaks to E at t=T',
  'baseband.panel.correlator': 'Correlator ∫r·p vs matched-filter sample',
  'baseband.panel.rrcSplit': 'RRC split: TX √RC × RX √RC = RC',
  'baseband.readout.energy': 'Pulse energy E',
  'baseband.readout.peakSnr': 'Peak SNR 2E/N₀',
  'baseband.theory.receiver': 'Matched filter & correlation receiver',
  // eye / equalization
  'baseband.eye.M': 'PAM levels M',
  'baseband.eye.channel': 'ISI channel taps',
  'baseband.eye.equalizer': 'Equalizer',
  'baseband.eq.off': 'Off',
  'baseband.eq.zf': 'Zero-forcing',
  'baseband.eq.mmse': 'MMSE',
  'baseband.eye.taps': 'Equalizer taps',
  'baseband.panel.eye': 'Eye diagram',
  'baseband.panel.eyeAfter': 'Eye after equalization',
  'baseband.panel.combined': 'Channel ⋆ equalizer response',
  'baseband.panel.eqTaps': 'Equalizer tap weights',
  'baseband.readout.eyeHeight': 'Eye height',
  'baseband.readout.residualIsi': 'Residual ISI',
  'baseband.readout.noiseMargin': 'Noise margin',
  'baseband.theory.eye': 'Eye diagram, ISI & equalization',
```

- [ ] **Step 2: Write `model.ts` (Tab 1 portion)**

```ts
// src/modules/baseband/model.ts — pure derived-data builders for the Baseband tabs (no React).
import { linspace } from '@/lib/dsp/math';
import {
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
  type PulseKind,
} from '@/lib/dsp/pulse';

export interface PulseParams {
  kind: PulseKind;
  alpha: number;
  sps: number;
  span: number;
}

export interface PulseView {
  t: number[]; // sample times (symbols)
  p: number[]; // pulse samples
  offCenter: number[]; // values at nT (n≠0) — should be ~0 for rc
  freqs: number[];
  spectrum: number[]; // |X(f)| normalized to 1
  bandwidth: number; // W = (1+α)/2T
  nyquist: number; // 1/2T
  excess: number; // α (fraction)
}

export function buildPulseView(p: PulseParams): PulseView {
  const T = 1;
  const wave = pulseWaveform(p.kind, p.alpha, p.sps, p.span);
  const center = (wave.length - 1) / 2;
  const t = wave.map((_, i) => (i - center) / p.sps);
  const alpha = p.kind === 'sinc' ? 0 : p.alpha;
  const freqs = linspace(-1, 1, 401);
  const spectrum = freqs.map((f) => raisedCosineSpectrum(f, alpha, T));
  return {
    t,
    p: wave,
    offCenter: nyquistOffCenterSamples(wave, p.sps),
    freqs,
    spectrum,
    bandwidth: raisedCosineBandwidth(alpha, T),
    nyquist: 1 / (2 * T),
    excess: alpha,
  };
}
```

- [ ] **Step 3: Write `panels.tsx` (Tab 1 panels)** — `PulseTimePanel`, `SpectrumPanel`

```tsx
// src/modules/baseband/panels.tsx
import { Canvas } from '@/lib/plot/Canvas';
import { drawAxes, drawLine, drawStems, drawVLine, drawText, linScale } from '@/lib/plot/draw';
import type { PulseView } from './model';

const COL_P = 'var(--color-x)'; // green input
const COL_H = 'var(--color-h)'; // orange system
const COL_Y = 'var(--color-y)'; // blue output
const COL_MARK = 'var(--color-marker)';

export function PulseTimePanel({ view }: { view: PulseView }) {
  const yMax = 1.2;
  return (
    <Canvas
      height={220}
      ariaLabel="Pulse p(t) with zero crossings at integer symbol times"
      deps={[view]}
      draw={(ctx, w, h) => {
        const tMax = view.t[view.t.length - 1];
        const ax = { x: linScale([-tMax, tMax], [34, w - 10]), y: linScale([-0.4, yMax], [h - 18, 10]) };
        drawAxes(ctx, ax, [-tMax, tMax]);
        drawLine(ctx, ax, view.t, view.p, COL_P, 2);
        // zero-crossing markers at every integer n (sampling instants)
        for (let n = -Math.floor(tMax); n <= Math.floor(tMax); n++) {
          drawVLine(ctx, ax, n, -0.4, yMax, 'rgba(154,167,180,0.25)', true, 1);
        }
        drawStems(ctx, ax, view.t.filter((_, i) => i % view.t.length === 0), [], COL_MARK, 0);
      }}
    />
  );
}

export function SpectrumPanel({ view }: { view: PulseView }) {
  return (
    <Canvas
      height={200}
      ariaLabel="Raised cosine spectrum with bandwidth and Nyquist markers"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([-1, 1], [34, w - 10]), y: linScale([0, 1.15], [h - 18, 10]) };
        drawAxes(ctx, ax, [-1, 1]);
        drawLine(ctx, ax, view.freqs, view.spectrum, COL_Y, 2);
        drawVLine(ctx, ax, view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, -view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, view.nyquist, 0, 1.15, 'rgba(154,167,180,0.6)', true, 1);
        drawVLine(ctx, ax, -view.nyquist, 0, 1.15, 'rgba(154,167,180,0.6)', true, 1);
        drawText(ctx, ax, view.bandwidth, 1.05, 'W', COL_H, 4, -4);
        drawText(ctx, ax, view.nyquist, 0.5, '1/2T', '#9aa7b4', 4, -4);
      }}
    />
  );
}
```

- [ ] **Step 4: Write `PulseShapingSection.tsx` (Tab 1)**

```tsx
// src/modules/baseband/PulseShapingSection.tsx
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildPulseView, type PulseParams } from './model';
import { PulseTimePanel, SpectrumPanel } from './panels';
import type { PulseKind } from '@/lib/dsp/pulse';

export function PulseShapingSection() {
  const [kind, setKind] = useState<PulseKind>('rc');
  const [alpha, setAlpha] = useState(0.35);
  const [sps, setSps] = useState(16);
  const params: PulseParams = { kind, alpha, sps, span: 5 };
  const view = useMemo(() => buildPulseView(params), [kind, alpha, sps]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.pulse.kind')}>
          <Select
            label={t('baseband.pulse.kind')}
            value={kind}
            options={[
              { value: 'rc', label: t('baseband.pulse.rc') },
              { value: 'rrc', label: t('baseband.pulse.rrc') },
              { value: 'sinc', label: t('baseband.pulse.sinc') },
            ]}
            onChange={(v) => setKind(v as PulseKind)}
          />
          {kind !== 'sinc' && (
            <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          )}
          <Slider label={t('baseband.pulse.sps')} value={sps} min={8} max={32} step={4} onChange={setSps} />
        </Panel>
      </aside>

      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.bandwidth')} value={view.bandwidth.toFixed(3)} unit="1/T" />
          <Readout label={t('baseband.readout.excess')} value={view.excess.toFixed(2)} />
          <Readout label={t('baseband.readout.nyquist')} value={view.nyquist.toFixed(3)} unit="1/T" />
        </div>
        <Panel title={t('baseband.panel.pulseTime')}>
          <PulseTimePanel view={view} />
        </Panel>
        <Panel title={t('baseband.panel.spectrum')}>
          <SpectrumPanel view={view} />
        </Panel>
        <TheoryBox title={t('baseband.theory.pulse')}>
          <p>
            <Formula tex="x(t)=\operatorname{sinc}\!\left(\tfrac{t}{T}\right)\frac{\cos(\pi\alpha t/T)}{1-(2\alpha t/T)^2}" block />
          </p>
          <p>
            <Formula tex="\sum_{m=-\infty}^{\infty} X\!\left(f+\tfrac{m}{T}\right)=T\quad\Rightarrow\quad x(nT)=\delta[n]" block />
          </p>
          <p>
            <Formula tex="W=\frac{1+\alpha}{2T}" />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `BasebandModule.tsx` (tab host, Tabs 2 & 3 stubbed for now)**

```tsx
// src/modules/baseband/BasebandModule.tsx
import { useState } from 'react';
import { t } from '@/i18n';
import { PulseShapingSection } from './PulseShapingSection';
import './baseband.css';

type Tab = 'pulse' | 'receiver' | 'eye';
const TABS: { id: Tab; key: string }[] = [
  { id: 'pulse', key: 'baseband.tab.pulse' },
  { id: 'receiver', key: 'baseband.tab.receiver' },
  { id: 'eye', key: 'baseband.tab.eye' },
];

export function BasebandModule() {
  const [tab, setTab] = useState<Tab>('pulse');
  return (
    <div className="bb-module">
      <nav className="bb-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={tab === tb.id ? 'bb-tab bb-tab--active' : 'bb-tab'}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.key)}
          </button>
        ))}
      </nav>
      {tab === 'pulse' && <PulseShapingSection />}
      {tab === 'receiver' && <div className="bb-section" />}
      {tab === 'eye' && <div className="bb-section" />}
    </div>
  );
}
```

- [ ] **Step 6: Write `baseband.css`** (mirror `infotheory.css`, tokenized)

```css
/* src/modules/baseband/baseband.css */
.bb-module { display: flex; flex-direction: column; gap: 16px; }
.bb-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bb-tab {
  background: transparent; border: none; color: var(--text-dim);
  font-family: var(--font); font-size: 0.95rem;
  padding: 8px 14px; cursor: pointer; border-bottom: 2px solid transparent;
  transition: color var(--transition), border-color var(--transition);
}
.bb-tab:hover { color: var(--text); }
.bb-tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.bb-section { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
.bb-controls { display: flex; flex-direction: column; gap: 12px; }
.bb-content { display: flex; flex-direction: column; gap: 16px; }
.bb-readouts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
@media (max-width: 720px) { .bb-section { grid-template-columns: 1fr; } }
```

- [ ] **Step 7: Wire the route in `src/App.tsx`**

Find the existing placeholder line (around `App.tsx:51`):
```tsx
<Route path="/baseband" element={<ModulePlaceholder title={t('nav.baseband')} />} />
```
Replace with:
```tsx
<Route path="/baseband" element={<BasebandModule />} />
```
And add the import near the other module imports:
```tsx
import { BasebandModule } from '@/modules/baseband/BasebandModule';
```
(If `ModulePlaceholder` becomes unused after Milestone 1, leave it — other placeholder routes may still use it.
Verify with the build in Step 9.)

- [ ] **Step 8: Write the smoke test**

```tsx
// tests/modules/BasebandModule.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BasebandModule } from '@/modules/baseband/BasebandModule';

describe('BasebandModule', () => {
  it('renders the three tabs and shows pulse shaping by default', () => {
    render(<BasebandModule />);
    expect(screen.getByRole('button', { name: /Pulse Shaping & Nyquist/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Optimum Receiver/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Eye, ISI & Equalization/i })).toBeTruthy();
    expect(screen.getByLabelText(/Pulse p\(t\) with zero crossings/i)).toBeTruthy();
  });
  it('switches tabs when clicked', () => {
    render(<BasebandModule />);
    fireEvent.click(screen.getByRole('button', { name: /Optimum Receiver/i }));
    // receiver tab content added in Milestone 2; here we only assert no crash + tab active class
    expect(screen.getByRole('button', { name: /Optimum Receiver/i }).className).toMatch(/--active/);
  });
});
```

- [ ] **Step 9: Run tests, lint, build**

Run: `npm test -- tests/modules/BasebandModule.test.tsx && npm run lint && npm run build`
Expected: smoke test PASS; lint exit 0; build (tsc --noEmit + vite) clean.

- [ ] **Step 10: Commit**

```bash
git add src/modules/baseband src/App.tsx src/i18n/en.ts tests/modules/BasebandModule.test.tsx
git commit -m "feat(baseband): Tab 1 Pulse Shaping & Nyquist + tabbed module shell + /baseband route"
```

---

# Milestone 2 — `matchedfilter.ts` + Tab 2 (Optimum Receiver)

## Task 3: complete `matchedfilter.ts`

**Files:**
- Modify: `src/lib/dsp/matchedfilter.ts` (add to the `convolve` created in Milestone 1)
- Test: `tests/dsp/matchedfilter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/matchedfilter.test.ts
import { describe, it, expect } from 'vitest';
import {
  convolve,
  matchedFilter,
  matchedFilterOutput,
  correlate,
  pulseEnergy,
  peakSnr,
} from '@/lib/dsp/matchedfilter';

describe('convolve', () => {
  it('does full linear convolution', () => {
    expect(convolve([1, 2], [1, 1])).toEqual([1, 3, 2]);
  });
});

describe('matchedFilter', () => {
  it('time-reverses the pulse: h[n]=p[N-1-n]', () => {
    expect(matchedFilter([1, 2, 3])).toEqual([3, 2, 1]);
  });
});

describe('matchedFilterOutput', () => {
  it('peaks at the center sample with value E for p ⋆ matched(p)', () => {
    const p = [1, 1, 1];
    const out = matchedFilterOutput(p, p); // [1,2,3,2,1]
    const peak = Math.max(...out);
    expect(peak).toBeCloseTo(pulseEnergy(p), 12); // = E = 3
    expect(out[(out.length - 1) / 2]).toBeCloseTo(3, 12);
  });
});

describe('correlate ≡ matched filter at t=T (correlation receiver equivalence)', () => {
  it('correlate(r,p) equals the matched-filter output sampled when fully overlapped', () => {
    const p = [0.4, 0.8, -0.2, 0.6];
    const r = [0.5, 0.7, -0.1, 0.9];
    const mf = matchedFilterOutput(r, p);
    expect(correlate(r, p)).toBeCloseTo(mf[p.length - 1], 12); // index N-1 = full overlap = Σ r·p
  });
});

describe('pulseEnergy & peakSnr', () => {
  it('energy is the sum of squares', () => {
    expect(pulseEnergy([1, 1, 1])).toBeCloseTo(3, 12);
  });
  it('peak SNR is 2E/N0', () => {
    expect(peakSnr(3, 2)).toBeCloseTo(3, 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dsp/matchedfilter.test.ts`
Expected: FAIL — `matchedFilter`/`matchedFilterOutput`/`correlate`/`pulseEnergy`/`peakSnr` not exported yet.

- [ ] **Step 3: Append implementation to `src/lib/dsp/matchedfilter.ts`**

```ts
// (convolve already present from Milestone 1)

/** Matched filter for a pulse: time-reversed, h[n] = p[N−1−n] (Proakis §7.5.2). */
export function matchedFilter(pulse: number[]): number[] {
  return [...pulse].reverse();
}

/** Energy of a (real) pulse, E = Σ p². */
export function pulseEnergy(pulse: number[]): number {
  return pulse.reduce((s, v) => s + v * v, 0);
}

/** Output of the matched filter: convolve(received, matchedFilter(pulse)). Peaks to E at full overlap. */
export function matchedFilterOutput(received: number[], pulse: number[]): number[] {
  return convolve(received, matchedFilter(pulse));
}

/** Correlation-receiver decision statistic, Σ r[n]·p[n] over the overlap (Proakis §7.5.1). */
export function correlate(received: number[], pulse: number[]): number {
  const n = Math.min(received.length, pulse.length);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += received[i] * pulse[i];
  return acc;
}

/** Peak SNR of the matched-filter output, 2E/N₀ (Proakis §7.5.2). */
export function peakSnr(pulseEnergyValue: number, n0: number): number {
  return (2 * pulseEnergyValue) / n0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dsp/matchedfilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/matchedfilter.ts tests/dsp/matchedfilter.test.ts
git commit -m "feat(baseband): matched filter + correlation receiver DSP (Proakis §7.5)"
```

## Task 4: Tab 2 UI — Optimum Receiver (matched filter, correlator equivalence, RRC split)

**Files:**
- Modify: `src/modules/baseband/model.ts` (add `buildReceiverView`), `src/modules/baseband/panels.tsx`
  (add receiver panels), `src/modules/baseband/BasebandModule.tsx` (mount `ReceiverSection`)
- Create: `src/modules/baseband/ReceiverSection.tsx`
- Test: extend `tests/modules/BasebandModule.test.tsx`

- [ ] **Step 1: Add `buildReceiverView` to `model.ts`**

```ts
// append to src/modules/baseband/model.ts
import { pulseWaveform as _pw } from '@/lib/dsp/pulse'; // (already imported above; reuse existing import)
import {
  matchedFilter,
  matchedFilterOutput,
  correlate,
  pulseEnergy,
  peakSnr,
  convolve,
} from '@/lib/dsp/matchedfilter';
import { sigmaFromN0 } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

export interface ReceiverParams {
  alpha: number;
  sps: number;
  span: number;
  noise: boolean;
  n0: number;
}

export interface ReceiverView {
  t: number[];
  pulse: number[];
  matched: number[];
  mfOutput: number[];
  mfPeakIndex: number;
  energy: number;
  peakSnr: number;
  correlatorValue: number;
  mfAtT: number;
  rrcCascade: number[]; // two √RC convolved → RC (zero ISI)
}

export function buildReceiverView(p: ReceiverParams): ReceiverView {
  const pulse = pulseWaveform('rc', p.alpha, p.sps, p.span);
  const matched = matchedFilter(pulse);
  // received = pulse (optionally + noise), reusing a fixed-seed rng for a stable display
  let received = pulse.slice();
  if (p.noise) {
    const sigma = sigmaFromN0(p.n0);
    const rng = makeRng(7);
    received = received.map((v) => v + sigma * (rng() - 0.5) * 2);
  }
  const mfOutput = matchedFilterOutput(received, pulse);
  const energy = pulseEnergy(pulse);
  const rrc = pulseWaveform('rrc', p.alpha, p.sps, p.span);
  return {
    t: pulse.map((_, i) => (i - (pulse.length - 1) / 2) / p.sps),
    pulse,
    matched,
    mfOutput,
    mfPeakIndex: mfOutput.indexOf(Math.max(...mfOutput)),
    energy,
    peakSnr: peakSnr(energy, p.n0),
    correlatorValue: correlate(received, pulse),
    mfAtT: mfOutput[pulse.length - 1],
    rrcCascade: convolve(rrc, rrc),
  };
}
```
(Note: remove the duplicate `_pw` import line — `pulseWaveform` is already imported at the top of `model.ts`
from Task 2. This snippet lists imports for clarity; merge them into the existing import block.)

- [ ] **Step 2: Add receiver panels to `panels.tsx`**

```tsx
// append to src/modules/baseband/panels.tsx
import type { ReceiverView } from './model';

export function MatchedFilterPanel({ view }: { view: ReceiverView }) {
  return (
    <Canvas
      height={200}
      ariaLabel="Transmit pulse and its matched filter"
      deps={[view]}
      draw={(ctx, w, h) => {
        const tMax = view.t[view.t.length - 1];
        const ax = { x: linScale([-tMax, tMax], [34, w - 10]), y: linScale([-0.5, 1.2], [h - 18, 10]) };
        drawAxes(ctx, ax, [-tMax, tMax]);
        drawLine(ctx, ax, view.t, view.pulse, COL_P, 2);
        drawLine(ctx, ax, view.t, view.matched, COL_H, 2, true);
      }}
    />
  );
}

export function MfOutputPanel({ view }: { view: ReceiverView }) {
  return (
    <Canvas
      height={200}
      ariaLabel="Matched filter output peaking to the pulse energy at t equals T"
      deps={[view]}
      draw={(ctx, w, h) => {
        const xs = view.mfOutput.map((_, i) => i);
        const yMax = Math.max(...view.mfOutput) * 1.15;
        const ax = { x: linScale([0, xs.length - 1], [34, w - 10]), y: linScale([-yMax * 0.3, yMax], [h - 18, 10]) };
        drawAxes(ctx, ax, [0, xs.length - 1]);
        drawLine(ctx, ax, xs, view.mfOutput, COL_Y, 2);
        drawVLine(ctx, ax, view.mfPeakIndex, -yMax * 0.3, yMax, COL_MARK, false, 1.5);
        drawText(ctx, ax, view.mfPeakIndex, view.energy, `E=${view.energy.toFixed(2)}`, COL_MARK, 6, -6);
      }}
    />
  );
}

export function RrcSplitPanel({ view }: { view: ReceiverView }) {
  return (
    <Canvas
      height={180}
      ariaLabel="Two root raised cosine pulses convolve to a zero ISI raised cosine"
      deps={[view]}
      draw={(ctx, w, h) => {
        const c = view.rrcCascade;
        const xs = c.map((_, i) => i);
        const peak = Math.max(...c);
        const ax = { x: linScale([0, xs.length - 1], [34, w - 10]), y: linScale([-peak * 0.3, peak * 1.1], [h - 18, 10]) };
        drawAxes(ctx, ax, [0, xs.length - 1]);
        drawLine(ctx, ax, xs, c, COL_Y, 2);
      }}
    />
  );
}
```

- [ ] **Step 3: Create `ReceiverSection.tsx`**

```tsx
// src/modules/baseband/ReceiverSection.tsx
import { useState, useMemo } from 'react';
import { Panel, Slider, Toggle, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildReceiverView, type ReceiverParams } from './model';
import { MatchedFilterPanel, MfOutputPanel, RrcSplitPanel } from './panels';

export function ReceiverSection() {
  const [alpha, setAlpha] = useState(0.35);
  const [noise, setNoise] = useState(false);
  const [n0, setN0] = useState(0.1);
  const params: ReceiverParams = { alpha, sps: 16, span: 4, noise, n0 };
  const view = useMemo(() => buildReceiverView(params), [alpha, noise, n0]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.tab.receiver')}>
          <Slider label={t('baseband.pulse.alpha')} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          <Toggle label={t('baseband.rx.noise')} checked={noise} onChange={setNoise} />
          {noise && <Slider label={t('baseband.rx.n0')} value={n0} min={0.01} max={1} step={0.01} onChange={setN0} />}
        </Panel>
      </aside>
      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.energy')} value={view.energy.toFixed(3)} />
          <Readout label={t('baseband.readout.peakSnr')} value={view.peakSnr.toFixed(2)} />
          <Readout label={t('baseband.panel.correlator')} value={view.correlatorValue.toFixed(3)} />
        </div>
        <Panel title={t('baseband.panel.matchedFilter')}><MatchedFilterPanel view={view} /></Panel>
        <Panel title={t('baseband.panel.mfOutput')}><MfOutputPanel view={view} /></Panel>
        <Panel title={t('baseband.panel.rrcSplit')}><RrcSplitPanel view={view} /></Panel>
        <TheoryBox title={t('baseband.theory.receiver')}>
          <p><Formula tex="h(t)=p(T-t)\qquad y(T)=\int r(t)\,p(t)\,dt=\textstyle\sum_n r_n p_n" block /></p>
          <p><Formula tex="\left(\tfrac{S}{N}\right)_{\max}=\frac{2E}{N_0}" /></p>
          <p><Formula tex="\sqrt{X_{rc}(f)}\cdot\sqrt{X_{rc}(f)}=X_{rc}(f)\ \Rightarrow\ \text{matched \& zero-ISI}" block /></p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount `ReceiverSection` in `BasebandModule.tsx`**

Replace `{tab === 'receiver' && <div className="bb-section" />}` with:
```tsx
{tab === 'receiver' && <ReceiverSection />}
```
And add the import:
```tsx
import { ReceiverSection } from './ReceiverSection';
```

- [ ] **Step 5: Extend the smoke test** (replace the second `it` in `tests/modules/BasebandModule.test.tsx`)

```tsx
  it('switches to the receiver tab and shows the matched-filter panel', () => {
    render(<BasebandModule />);
    fireEvent.click(screen.getByRole('button', { name: /Optimum Receiver/i }));
    expect(screen.getByLabelText(/Transmit pulse and its matched filter/i)).toBeTruthy();
  });
```

- [ ] **Step 6: Run tests, lint, build**

Run: `npm test -- tests/modules/BasebandModule.test.tsx && npm run lint && npm run build`
Expected: PASS; lint 0; build clean.

- [ ] **Step 7: Commit**

```bash
git add src/modules/baseband tests/modules/BasebandModule.test.tsx
git commit -m "feat(baseband): Tab 2 Optimum Receiver — matched filter, correlator equivalence, RRC split"
```

---

# Milestone 3 — `eye.ts` + `equalizer.ts` + Tab 3 (Eye, ISI & Equalization)

## Task 5: `eye.ts` — eye traces + metrics

**Files:**
- Create: `src/lib/dsp/eye.ts`
- Test: `tests/dsp/eye.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/eye.test.ts
import { describe, it, expect } from 'vitest';
import { eyeTraces, eyeMetrics } from '@/lib/dsp/eye';
import { convolve } from '@/lib/dsp/matchedfilter';

// A clean 2-PAM signal: symbols ±1 held for sps samples each.
function heldSignal(levels: number[], sps: number): number[] {
  const out: number[] = [];
  for (const a of levels) for (let i = 0; i < sps; i++) out.push(a);
  return out;
}

describe('eyeTraces', () => {
  it('slices the signal into overlapping symbol-spaced windows', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1], 4);
    const traces = eyeTraces(sig, 4, 2); // window = 8 samples
    expect(traces.length).toBeGreaterThan(1);
    expect(traces[0].samples.length).toBe(8);
  });
});

describe('eyeMetrics', () => {
  it('measures a wide-open eye (~2) for a clean ±1 signal', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1, 1, -1], 4);
    const m = eyeMetrics(eyeTraces(sig, 4, 2), 4);
    expect(m.eyeHeight).toBeCloseTo(2, 6);
    expect(m.noiseMargin).toBeCloseTo(1, 6);
  });
  it('reports a smaller eye height once an ISI channel smears the signal', () => {
    const sig = heldSignal([1, -1, 1, -1, 1, -1, 1, -1], 4);
    const clean = eyeMetrics(eyeTraces(sig, 4, 2), 4).eyeHeight;
    const isi = convolve(sig, [1, 0.6]); // controlled ISI
    const isiHeight = eyeMetrics(eyeTraces(isi, 4, 2), 4).eyeHeight;
    expect(isiHeight).toBeLessThan(clean);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dsp/eye.test.ts`
Expected: FAIL — `eye.ts` does not exist.

- [ ] **Step 3: Write `src/lib/dsp/eye.ts`**

```ts
// src/lib/dsp/eye.ts — eye-diagram traces and quantitative margins (Proakis §8.3, Fig 8.7).

export interface EyeTrace {
  samples: number[];
}

/** Slice a sampled baseband signal into overlapping windows of `spanSymbols` symbols (step = sps). */
export function eyeTraces(signal: number[], sps: number, spanSymbols: number): EyeTrace[] {
  const win = spanSymbols * sps;
  const traces: EyeTrace[] = [];
  for (let start = 0; start + win <= signal.length; start += sps) {
    traces.push({ samples: signal.slice(start, start + win) });
  }
  return traces;
}

export interface EyeMetrics {
  eyeHeight: number; // vertical opening at the optimal sampling instant
  noiseMargin: number; // eyeHeight / 2
  timingMargin: number; // fraction of the symbol period the eye stays open (0..1)
}

/** Vertical opening at the center column, and how wide (in time) the eye stays open. */
export function eyeMetrics(traces: EyeTrace[], sps: number): EyeMetrics {
  if (traces.length === 0) return { eyeHeight: 0, noiseMargin: 0, timingMargin: 0 };
  const cols = traces[0].samples.length;
  const mid = Math.floor(cols / 2);

  const openingAt = (col: number): number => {
    let minUpper = Infinity;
    let maxLower = -Infinity;
    let sawUpper = false;
    let sawLower = false;
    for (const tr of traces) {
      const v = tr.samples[col];
      if (v >= 0) {
        sawUpper = true;
        if (v < minUpper) minUpper = v;
      } else {
        sawLower = true;
        if (v > maxLower) maxLower = v;
      }
    }
    if (!sawUpper || !sawLower) return 0;
    return minUpper - maxLower;
  };

  const eyeHeight = Math.max(0, openingAt(mid));
  // horizontal: count columns around mid where the eye is still open
  let open = 0;
  for (let c = 0; c < cols; c++) if (openingAt(c) > 0) open++;
  return { eyeHeight, noiseMargin: eyeHeight / 2, timingMargin: Math.min(1, open / sps) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dsp/eye.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/eye.ts tests/dsp/eye.test.ts
git commit -m "feat(baseband): eye-diagram traces + margins DSP (Proakis §8.3)"
```

## Task 6: `equalizer.ts` — ZF / MMSE / residual ISI

**Files:**
- Create: `src/lib/dsp/equalizer.ts`
- Test: `tests/dsp/equalizer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/equalizer.test.ts
import { describe, it, expect } from 'vitest';
import { zeroForcingTaps, mmseTaps, applyFilter, residualIsi } from '@/lib/dsp/equalizer';

describe('zeroForcingTaps', () => {
  it('is the truncated geometric inverse of 1 + 0.5 z⁻¹', () => {
    const w = zeroForcingTaps([1, 0.5], 4);
    expect(w[0]).toBeCloseTo(1, 12);
    expect(w[1]).toBeCloseTo(-0.5, 12);
    expect(w[2]).toBeCloseTo(0.25, 12);
    expect(w[3]).toBeCloseTo(-0.125, 12);
  });
  it('forces the first nTaps−1 off-center samples to zero', () => {
    const ch = [1, 0.5];
    const eq = applyFilter(ch, zeroForcingTaps(ch, 4)); // = convolve
    expect(eq[0]).toBeCloseTo(1, 12);
    expect(Math.abs(eq[1])).toBeLessThan(1e-9);
    expect(Math.abs(eq[2])).toBeLessThan(1e-9);
    expect(Math.abs(eq[3])).toBeLessThan(1e-9);
  });
});

describe('residualIsi', () => {
  it('shrinks toward zero as the tap count grows', () => {
    const ch = [1, 0.5];
    const r4 = residualIsi(ch, zeroForcingTaps(ch, 4));
    const r12 = residualIsi(ch, zeroForcingTaps(ch, 12));
    expect(r12).toBeLessThan(r4);
    expect(r12).toBeLessThan(1e-3);
  });
});

describe('mmseTaps', () => {
  it('reduces to the zero-forcing solution as noise variance → 0', () => {
    const ch = [1, 0.5];
    const zf = zeroForcingTaps(ch, 4);
    const mmse = mmseTaps(ch, 0, 4);
    for (let i = 0; i < zf.length; i++) expect(mmse[i]).toBeCloseTo(zf[i], 6);
  });
  it('shrinks the taps (less noise enhancement) as noise variance grows', () => {
    const ch = [1, 0.5];
    const norm = (w: number[]) => Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    expect(norm(mmseTaps(ch, 1, 4))).toBeLessThan(norm(zeroForcingTaps(ch, 4)));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dsp/equalizer.test.ts`
Expected: FAIL — `equalizer.ts` does not exist.

- [ ] **Step 3: Write `src/lib/dsp/equalizer.ts`**

```ts
// src/lib/dsp/equalizer.ts — linear ZF / MMSE equalizers (Proakis §8.6.2).
import { convolve } from './matchedfilter';

/** Apply an FIR equalizer (or channel) to a signal — alias of convolve. */
export function applyFilter(signal: number[], taps: number[]): number[] {
  return convolve(signal, taps);
}

/** Square N×N lower-triangular Toeplitz convolution matrix of the channel (T[i][j]=channel[i−j]). */
function toeplitz(channel: number[], n: number): number[][] {
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const k = i - j;
      if (k < channel.length) A[i][j] = channel[k];
    }
  }
  return A;
}

/** Solve A x = b by Gaussian elimination with partial pivoting (small N). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / (M[i][i] || 1e-12));
}

/**
 * Zero-forcing equalizer taps: solve T·w = e₀ where T is the square lower-triangular Toeplitz
 * of the channel (recursive deconvolution). Forces ISI to zero at the first nTaps−1 sample instants.
 */
export function zeroForcingTaps(channel: number[], nTaps: number): number[] {
  const w = new Array(nTaps).fill(0);
  const c0 = channel[0] || 1e-12;
  w[0] = 1 / c0;
  for (let n = 1; n < nTaps; n++) {
    let acc = 0;
    for (let k = 1; k <= n && k < channel.length; k++) acc += channel[k] * w[n - k];
    w[n] = -acc / c0;
  }
  return w;
}

/**
 * MMSE equalizer taps: solve (TᵀT + σ²I)·w = Tᵀe₀ on the same square Toeplitz T as ZF.
 * Since T is square-invertible, σ²=0 gives w = T⁻¹e₀ = the zero-forcing solution exactly;
 * larger σ² regularizes (shrinks) the taps → less noise enhancement.
 */
export function mmseTaps(channel: number[], noiseVar: number, nTaps: number): number[] {
  const T = toeplitz(channel, nTaps);
  // A = TᵀT + σ²I
  const A: number[][] = Array.from({ length: nTaps }, () => new Array(nTaps).fill(0));
  for (let i = 0; i < nTaps; i++) {
    for (let j = 0; j < nTaps; j++) {
      let s = 0;
      for (let k = 0; k < nTaps; k++) s += T[k][i] * T[k][j];
      A[i][j] = s + (i === j ? noiseVar : 0);
    }
  }
  // b = Tᵀe₀ = first column of Tᵀ = first row of T = [channel[0], 0, …]
  const b = new Array(nTaps).fill(0);
  b[0] = T[0][0];
  return solveLinear(A, b);
}

/** Residual ISI = Σ |(channel ⋆ taps)[k]| over every index except the main (peak) tap. */
export function residualIsi(channel: number[], taps: number[]): number {
  const c = convolve(channel, taps);
  let peakIdx = 0;
  for (let i = 1; i < c.length; i++) if (Math.abs(c[i]) > Math.abs(c[peakIdx])) peakIdx = i;
  let acc = 0;
  for (let i = 0; i < c.length; i++) if (i !== peakIdx) acc += Math.abs(c[i]);
  return acc;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dsp/equalizer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/equalizer.ts tests/dsp/equalizer.test.ts
git commit -m "feat(baseband): ZF/MMSE linear equalizer DSP (Proakis §8.6.2)"
```

## Task 7: Tab 3 UI — Eye, ISI & Equalization

**Files:**
- Modify: `src/modules/baseband/model.ts` (`buildEyeView`), `src/modules/baseband/panels.tsx` (eye + tap panels),
  `src/modules/baseband/BasebandModule.tsx` (mount `EyeEqualizationSection`)
- Create: `src/modules/baseband/EyeEqualizationSection.tsx`
- Test: extend `tests/modules/BasebandModule.test.tsx`

- [ ] **Step 1: Add `buildEyeView` to `model.ts`**

```ts
// append to src/modules/baseband/model.ts
import { pulseWaveform as pulseWave } from '@/lib/dsp/pulse'; // already imported; reuse
import { eyeTraces, eyeMetrics, type EyeTrace } from '@/lib/dsp/eye';
import { zeroForcingTaps, mmseTaps, residualIsi } from '@/lib/dsp/equalizer';
import { randomBitSource, type Bit } from '@/lib/sim/sources';

export type EqualizerKind = 'off' | 'zf' | 'mmse';

export interface EyeParams {
  M: 2 | 4;
  channel: number[]; // ISI taps, channel[0] = 1
  equalizer: EqualizerKind;
  nTaps: number;
  noiseVar: number;
  alpha: number;
  sps: number;
}

export interface EyeView {
  tracesBefore: EyeTrace[];
  tracesAfter: EyeTrace[];
  eqTaps: number[];
  combined: number[]; // channel ⋆ equalizer
  eyeHeightBefore: number;
  eyeHeightAfter: number;
  residualIsi: number;
  sps: number;
}

function pamLevels(bits: Bit[], M: 2 | 4): number[] {
  if (M === 2) return bits.map((b) => (b ? 1 : -1));
  const out: number[] = [];
  for (let i = 0; i + 1 < bits.length; i += 2) {
    const idx = (bits[i] << 1) | bits[i + 1]; // 0..3 → Gray-ish ±1,±3
    out.push([-3, -1, 3, 1][idx]);
  }
  return out;
}

function shape(levels: number[], pulse: number[], sps: number): number[] {
  // upsample by sps then convolve with the pulse (baseband PAM waveform)
  const up = new Array(levels.length * sps).fill(0);
  for (let i = 0; i < levels.length; i++) up[i * sps] = levels[i];
  // simple held-line shaping for a crisp eye (rectangular), pulse used for spectral context only
  const held: number[] = [];
  for (const a of levels) for (let i = 0; i < sps; i++) held.push(a);
  return held;
}

export function buildEyeView(p: EyeParams): EyeView {
  const gen = randomBitSource(2024);
  const bits: Bit[] = Array.from({ length: 256 }, () => gen());
  const levels = pamLevels(bits, p.M);
  const pulse = pulseWave('rc', p.alpha, p.sps, 3);
  const clean = shape(levels, pulse, p.sps);
  const { convolve } = require('@/lib/dsp/matchedfilter'); // (use a top import instead; see note)
  const rx = convolve(clean, p.channel);
  const eqTaps = p.equalizer === 'zf' ? zeroForcingTaps(p.channel, p.nTaps)
    : p.equalizer === 'mmse' ? mmseTaps(p.channel, p.noiseVar, p.nTaps)
    : [1];
  const equalized = convolve(rx, eqTaps);
  const tracesBefore = eyeTraces(rx, p.sps, 2);
  const tracesAfter = eyeTraces(equalized, p.sps, 2);
  return {
    tracesBefore,
    tracesAfter,
    eqTaps,
    combined: convolve(p.channel, eqTaps),
    eyeHeightBefore: eyeMetrics(tracesBefore, p.sps).eyeHeight,
    eyeHeightAfter: eyeMetrics(tracesAfter, p.sps).eyeHeight,
    residualIsi: residualIsi(p.channel, eqTaps),
    sps: p.sps,
  };
}
```
**Note:** do NOT use `require`. Add `convolve` to the existing top-of-file import from `@/lib/dsp/matchedfilter`
(it is already imported in Task 4's `buildReceiverView` block). The `require` line above is illustrative only —
replace its use with the imported `convolve`. Also remove the unused `pulse`/`shape` spectral params if lint flags them.

- [ ] **Step 2: Add eye + tap panels to `panels.tsx`**

```tsx
// append to src/modules/baseband/panels.tsx
import type { EyeView } from './model';
import type { EyeTrace } from '@/lib/dsp/eye';

function drawEye(ctx: CanvasRenderingContext2D, w: number, h: number, traces: EyeTrace[], sps: number) {
  const cols = traces[0]?.samples.length ?? 2 * sps;
  const ax = { x: linScale([0, cols - 1], [34, w - 10]), y: linScale([-4, 4], [h - 18, 10]) };
  drawAxes(ctx, ax, [0, cols - 1]);
  const xs = Array.from({ length: cols }, (_, i) => i);
  for (const tr of traces) drawLine(ctx, ax, xs, tr.samples, 'rgba(74,163,255,0.35)', 1);
  drawVLine(ctx, ax, Math.floor(cols / 2), -4, 4, COL_MARK, true, 1.5); // sampling instant
}

export function EyePanel({ traces, sps, label }: { traces: EyeTrace[]; sps: number; label: string }) {
  return (
    <Canvas height={220} ariaLabel={label} deps={[traces]} draw={(ctx, w, h) => drawEye(ctx, w, h, traces, sps)} />
  );
}

export function TapStemPanel({ view }: { view: EyeView }) {
  return (
    <Canvas
      height={170}
      ariaLabel="Equalizer tap weights"
      deps={[view]}
      draw={(ctx, w, h) => {
        const xs = view.eqTaps.map((_, i) => i);
        const m = Math.max(1, ...view.eqTaps.map(Math.abs)) * 1.2;
        const ax = { x: linScale([-0.5, view.eqTaps.length - 0.5], [34, w - 10]), y: linScale([-m, m], [h - 18, 10]) };
        drawAxes(ctx, ax, [-0.5, view.eqTaps.length - 0.5]);
        drawStems(ctx, ax, xs, view.eqTaps, COL_H, 3);
      }}
    />
  );
}

export function CombinedPanel({ view }: { view: EyeView }) {
  return (
    <Canvas
      height={170}
      ariaLabel="Combined channel and equalizer response approaches an impulse"
      deps={[view]}
      draw={(ctx, w, h) => {
        const xs = view.combined.map((_, i) => i);
        const m = Math.max(1, ...view.combined.map(Math.abs)) * 1.2;
        const ax = { x: linScale([-0.5, view.combined.length - 0.5], [34, w - 10]), y: linScale([-m, m], [h - 18, 10]) };
        drawAxes(ctx, ax, [-0.5, view.combined.length - 0.5]);
        drawStems(ctx, ax, xs, view.combined, COL_Y, 3);
      }}
    />
  );
}
```

- [ ] **Step 3: Create `EyeEqualizationSection.tsx`**

```tsx
// src/modules/baseband/EyeEqualizationSection.tsx
import { useState, useMemo } from 'react';
import { Panel, Select, Slider, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { buildEyeView, type EyeParams, type EqualizerKind } from './model';
import { EyePanel, TapStemPanel, CombinedPanel } from './panels';

export function EyeEqualizationSection() {
  const [M, setM] = useState<2 | 4>(2);
  const [c1, setC1] = useState(0.5);
  const [equalizer, setEqualizer] = useState<EqualizerKind>('off');
  const [nTaps, setNTaps] = useState(6);
  const [noiseVar, setNoiseVar] = useState(0.05);
  const params: EyeParams = { M, channel: [1, c1], equalizer, nTaps, noiseVar, alpha: 0.35, sps: 16 };
  const view = useMemo(() => buildEyeView(params), [M, c1, equalizer, nTaps, noiseVar]);

  return (
    <div className="bb-section">
      <aside className="bb-controls">
        <Panel title={t('baseband.tab.eye')}>
          <Select
            label={t('baseband.eye.M')}
            value={String(M)}
            options={[{ value: '2', label: '2-PAM' }, { value: '4', label: '4-PAM' }]}
            onChange={(v) => setM(Number(v) as 2 | 4)}
          />
          <Slider label={t('baseband.eye.channel')} value={c1} min={0} max={0.9} step={0.05} onChange={setC1} />
          <Select
            label={t('baseband.eye.equalizer')}
            value={equalizer}
            options={[
              { value: 'off', label: t('baseband.eq.off') },
              { value: 'zf', label: t('baseband.eq.zf') },
              { value: 'mmse', label: t('baseband.eq.mmse') },
            ]}
            onChange={(v) => setEqualizer(v as EqualizerKind)}
          />
          {equalizer !== 'off' && (
            <Slider label={t('baseband.eye.taps')} value={nTaps} min={3} max={12} step={1} onChange={setNTaps} />
          )}
          {equalizer === 'mmse' && (
            <Slider label={t('baseband.rx.n0')} value={noiseVar} min={0} max={0.5} step={0.01} onChange={setNoiseVar} />
          )}
        </Panel>
      </aside>
      <div className="bb-content">
        <div className="bb-readouts">
          <Readout label={t('baseband.readout.eyeHeight')} value={view.eyeHeightBefore.toFixed(2)} />
          <Readout label={`${t('baseband.readout.eyeHeight')} (eq)`} value={view.eyeHeightAfter.toFixed(2)}
            tone={view.eyeHeightAfter > view.eyeHeightBefore ? 'ok' : 'default'} />
          <Readout label={t('baseband.readout.residualIsi')} value={view.residualIsi.toFixed(4)} />
        </div>
        <Panel title={t('baseband.panel.eye')}><EyePanel traces={view.tracesBefore} sps={view.sps} label="Eye diagram before equalization" /></Panel>
        {equalizer !== 'off' && (
          <Panel title={t('baseband.panel.eyeAfter')}><EyePanel traces={view.tracesAfter} sps={view.sps} label="Eye diagram after equalization" /></Panel>
        )}
        <Panel title={t('baseband.panel.eqTaps')}><TapStemPanel view={view} /></Panel>
        <Panel title={t('baseband.panel.combined')}><CombinedPanel view={view} /></Panel>
        <TheoryBox title={t('baseband.theory.eye')}>
          <p><Formula tex="y_m=x_0 a_m+\sum_{n\neq m} a_n x_{m-n}+\nu_m\quad(\text{ISI})" block /></p>
          <p><Formula tex="W_{ZF}(z)=\frac{1}{H(z)}\qquad W_{MMSE}=\arg\min_w E|w*r-a|^2" block /></p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount `EyeEqualizationSection` in `BasebandModule.tsx`**

Replace `{tab === 'eye' && <div className="bb-section" />}` with:
```tsx
{tab === 'eye' && <EyeEqualizationSection />}
```
And add the import:
```tsx
import { EyeEqualizationSection } from './EyeEqualizationSection';
```

- [ ] **Step 5: Extend the smoke test** (add a third `it`)

```tsx
  it('switches to the eye tab and shows the eye diagram', () => {
    render(<BasebandModule />);
    fireEvent.click(screen.getByRole('button', { name: /Eye, ISI & Equalization/i }));
    expect(screen.getByLabelText(/Eye diagram before equalization/i)).toBeTruthy();
  });
```

- [ ] **Step 6: Run the full suite, lint, build**

Run: `npm test && npm run lint && npm run build`
Expected: all tests PASS (154 baseline + new dsp + smoke); lint 0; build clean.

- [ ] **Step 7: Commit**

```bash
git add src/modules/baseband tests/modules/BasebandModule.test.tsx
git commit -m "feat(baseband): Tab 3 Eye diagram + ISI + ZF/MMSE equalization (open the closed eye)"
```

---

## Final verification (after Milestone 3)

- [ ] `npm test` → all green (DSP suites + module smoke).
- [ ] `npm run lint` → exit 0.
- [ ] `npm run build` → tsc --noEmit + vite clean.
- [ ] Manual/browser (optional, via `npm run dev`): `/baseband` renders; lowering α widens the spectrum and the
  pulse zero-crossings stay at nT; the MF output peaks to E at t=T and the correlator readout matches; raising
  the ISI tap closes the eye and selecting ZF/MMSE reopens it with residual ISI → small.

---

## Self-review (against the spec)

**1. Spec coverage.**
- Pulse shaping + roll-off α + Nyquist zero-ISI (A,B) → Task 1 + Task 2 (Tab 1). ✓
- Matched filter, correlation receiver, peak SNR, **RRC split** (C) → Task 3 + Task 4 (Tab 2). ✓
- Eye diagram + quantitative margins + 2/4-PAM (D) → Task 5 + Task 7 (Tab 3). ✓
- ISI + ZF/MMSE equalization → Task 6 + Task 7. ✓
- Tabbed module, `/baseband` route, Home card (already present), i18n → Task 2. ✓
- Optional readout (E) M-PAM BER: **intentionally deferred** (spec marks it optional, not an acceptance item).
  Not implemented as a task; can be added later as a single readout in `EyeEqualizationSection`.

**2. Placeholder scan.** All DSP steps carry full code + worked expected values. UI tasks carry full component
code (project convention: UI verified by smoke+build, not strict TDD). Two illustrative notes are explicitly
flagged to fix at execution time: (a) the duplicate `pulseWaveform`/`convolve` imports in `model.ts` must be
merged into one import block; (b) the `require('@/lib/dsp/matchedfilter')` line in `buildEyeView` MUST be
replaced by the top-level `convolve` import. These are called out, not left silent.

**3. Type consistency.** `PulseKind` (`'rc'|'rrc'|'sinc'`), `EqualizerKind` (`'off'|'zf'|'mmse'`), `EyeTrace`,
`PulseView`/`ReceiverView`/`EyeView`, and the DSP signatures (`convolve`, `matchedFilter`, `correlate`,
`zeroForcingTaps`, `mmseTaps`, `residualIsi`, `eyeTraces`, `eyeMetrics`) are used identically across tasks.
`convolve` is created once in Milestone 1 and reused by `matchedfilter`/`equalizer`/`model`.

**4. Ordering caveat (flagged).** The Task 1 cascade test imports `convolve` from `matchedfilter`; therefore the
one-line `convolve` is created in Task 1 Step 3 before that test runs. The rest of `matchedfilter.ts` is filled
in Task 3. This is intentional and stated.
