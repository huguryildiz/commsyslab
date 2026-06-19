import { useMemo } from 'react';
import { Panel, Select, Slider, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { generateEnsemble } from '@/lib/dsp/random';
import { t } from '@/i18n';
import type { Derived, ProcessParams, ProcessKind } from './model';

const PAD = { l: 48, r: 20, t: 18, b: 44 };

const KIND_OPTIONS: { value: ProcessKind; labelKey: string }[] = [
  { value: 'randphase-sine', labelKey: 'rp.gen.kind.sine' },
  { value: 'white-gaussian', labelKey: 'rp.gen.kind.white' },
  { value: 'colored', labelKey: 'rp.gen.kind.colored' },
  { value: 'binary-nrz', labelKey: 'rp.gen.kind.nrz' },
];

const RefreshIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21.5 2v6h-6" />
    <path d="M2.5 22v-6h6" />
    <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
    <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
  </svg>
);

/** Small KaTeX-aware plot title (rp namespace mirror of .analog__plot-title). */
function PlotTitle({ textKey }: { textKey: string }) {
  return (
    <div className="rp__plot-title">
      <HintText text={t(textKey)} />
    </div>
  );
}

// ─── Control panels (left sidebars) ───────────────────────────────────────────

interface ControlProps {
  params: ProcessParams;
  set: (patch: Partial<ProcessParams>) => void;
  resample: () => void;
  reset: () => void;
}

/** §5.2 process generator — selects the process kind and its parameters. */
export function ProcessControls({ params, set, resample, reset }: ControlProps) {
  const isSine = params.kind === 'randphase-sine';
  const isNrz = params.kind === 'binary-nrz';
  const isNoise = params.kind === 'white-gaussian' || params.kind === 'colored';
  const isColored = params.kind === 'colored';

  return (
    <Panel title={t('rp.gen.title')}>
      <Select
        label={t('rp.gen.kind')}
        value={params.kind}
        options={KIND_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        onChange={(v) => set({ kind: v as ProcessKind })}
      />
      <Slider
        label={<HintText text="$A$" />}
        min={0.2}
        max={3}
        step={0.1}
        value={params.amplitude}
        onChange={(v) => set({ amplitude: v })}
      />
      {(isSine || isNrz) && (
        <Slider
          label={<HintText text="$f_0$" />}
          min={1}
          max={40}
          step={1}
          unit="Hz"
          value={params.f0}
          onChange={(v) => set({ f0: v })}
        />
      )}
      {isNoise && (
        <Slider
          label={<HintText text="$N_0$" />}
          min={0.1}
          max={4}
          step={0.1}
          value={params.n0}
          onChange={(v) => set({ n0: v })}
        />
      )}
      {isColored && (
        <Slider
          label={<HintText text="$f_c$" />}
          min={2}
          max={80}
          step={1}
          unit="Hz"
          value={params.cutoff}
          onChange={(v) => set({ cutoff: v })}
        />
      )}
      <Slider
        label={<HintText text={t('rp.gen.realizations')} />}
        min={20}
        max={600}
        step={20}
        value={params.M}
        onChange={(v) => set({ M: v })}
      />
      <div className="rp__reset">
        <button type="button" onClick={resample}>
          {t('rp.gen.resample')}
        </button>
        <button type="button" onClick={reset}>
          <RefreshIcon />
          {t('rp.gen.reset')}
        </button>
      </div>
    </Panel>
  );
}

/** §5.3 filtered-noise generator — white-noise level + filter shape/cutoff. */
export function GaussianControls({ params, set, resample, reset }: ControlProps) {
  return (
    <Panel title={t('rp.filt.title')}>
      <Slider
        label={<HintText text="$N_0$" />}
        min={0.1}
        max={4}
        step={0.1}
        value={params.n0}
        onChange={(v) => set({ n0: v })}
      />
      <Select
        label={t('rp.filt.kind')}
        value={params.filterKind}
        options={[
          { value: 'rc', label: t('rp.filt.kind.rc') },
          { value: 'ideal-lpf', label: t('rp.filt.kind.ideal') },
        ]}
        onChange={(v) => set({ filterKind: v as ProcessParams['filterKind'] })}
      />
      <Slider
        label={<HintText text="$f_c$" />}
        min={2}
        max={80}
        step={1}
        unit="Hz"
        value={params.cutoff}
        onChange={(v) => set({ cutoff: v })}
      />
      <Slider
        label={<HintText text={t('rp.gen.realizations')} />}
        min={20}
        max={600}
        step={20}
        value={params.M}
        onChange={(v) => set({ M: v })}
      />
      <div className="rp__reset">
        <button type="button" onClick={resample}>
          {t('rp.gen.resample')}
        </button>
        <button type="button" onClick={reset}>
          <RefreshIcon />
          {t('rp.gen.reset')}
        </button>
      </div>
    </Panel>
  );
}

// ─── Plot panels (each owns a useZoom instance over its own axis) ─────────────

/** §5.2.1 — ensemble of sample functions + the ensemble mean m_X(t). */
export function EnsemblePanel({ d, params }: { d: Derived; params: ProcessParams }) {
  const N = params.N;
  const t1 = (N - 1) / params.fs;
  const [lo, hi, onWheel, , onPan] = useZoom(0, t1, {
    minSpan: t1 / 8,
    maxSpan: t1,
    clampMin: 0,
    clampMax: t1,
  });
  const ts = useMemo(() => Array.from({ length: N }, (_, n) => n / params.fs), [N, params.fs]);
  const yMax = useMemo(
    () =>
      Math.max(1e-6, ...d.ensemble.slice(0, 30).flatMap((x) => Array.from(x).map(Math.abs))) * 1.1,
    [d.ensemble],
  );

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-yMax, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$X(t)$',
      domainY: [-yMax, yMax],
    });
    for (let m = 0; m < Math.min(20, d.ensemble.length); m++) {
      drawLine(ctx, ax, ts, Array.from(d.ensemble[m]), alpha(CHART.green, 0.16), 1);
    }
    drawLine(ctx, ax, ts, Array.from(d.ensemble[0]), CHART.green, 1.6);
    drawLine(ctx, ax, ts, Array.from(d.mean), CHART.orange, 2.2);
  };

  return (
    <div>
      <PlotTitle textKey="rp.plot.ensemble" />
      <Canvas
        height={240}
        draw={draw}
        deps={[d, lo, hi, yMax]}
        ariaLabel="Ensemble of sample functions with ensemble mean"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="rp__legend">
        <span className="rp__legend__item" style={{ color: CHART.green }}>
          <span className="rp__legend__swatch" />
          <HintText text="$X(t)$" />
        </span>
        <span className="rp__legend__item" style={{ color: CHART.orange }}>
          <span className="rp__legend__swatch" />
          <HintText text="$m_X(t)$" />
        </span>
      </div>
    </div>
  );
}

/** §5.2.2 — autocorrelation: theory vs time average vs ensemble average. */
export function AutocorrPanel({ d }: { d: Derived }) {
  const tauMax = d.lags[d.lags.length - 1];
  const [lo, hi, onWheel, , onPan] = useZoom(0, tauMax, {
    minSpan: tauMax / 8,
    maxSpan: tauMax,
    clampMin: 0,
    clampMax: tauMax,
  });
  const lags = useMemo(() => Array.from(d.lags), [d.lags]);
  const yMax = useMemo(
    () => Math.max(1e-6, ...[...d.rEnsemble, ...d.rTime, ...d.rTheory].map(Math.abs)) * 1.1,
    [d.rEnsemble, d.rTime, d.rTheory],
  );

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-yMax, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$\\tau\\,(\\mathrm{s})$',
      yLabel: '$R_X(\\tau)$',
      domainY: [-yMax, yMax],
    });
    drawLine(ctx, ax, lags, Array.from(d.rTheory), CHART.dim, 2, true);
    drawLine(ctx, ax, lags, Array.from(d.rTime), CHART.green, 1.6);
    drawLine(ctx, ax, lags, Array.from(d.rEnsemble), CHART.blue, 2);
  };

  return (
    <div>
      <PlotTitle textKey="rp.plot.autocorr" />
      <Canvas
        height={220}
        draw={draw}
        deps={[d, lo, hi, yMax]}
        ariaLabel="Autocorrelation: theory vs time average vs ensemble average"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="rp__legend">
        <span className="rp__legend__item" style={{ color: CHART.dim }}>
          <span className="rp__legend__swatch rp__legend__swatch--dashed" />
          {t('rp.trace.theory')}
        </span>
        <span className="rp__legend__item" style={{ color: CHART.green }}>
          <span className="rp__legend__swatch" />
          {t('rp.trace.timeAvg')}
        </span>
        <span className="rp__legend__item" style={{ color: CHART.blue }}>
          <span className="rp__legend__swatch" />
          {t('rp.trace.ensemble')}
        </span>
      </div>
    </div>
  );
}

/** §5.2.5 — power spectral density: averaged periodogram vs theory (normalized). */
export function PsdPanel({ d, params }: { d: Derived; params: ProcessParams }) {
  const fMax = params.fs / 2;
  const [lo, hi, onWheel, , onPan] = useZoom(0, fMax, {
    minSpan: fMax / 12,
    maxSpan: fMax,
    clampMin: 0,
    clampMax: fMax,
  });
  const freqs = useMemo(() => Array.from(d.freqs), [d.freqs]);
  const showTheory =
    params.kind === 'white-gaussian' || params.kind === 'colored' || params.kind === 'binary-nrz';

  const { estNorm, thNorm } = useMemo(() => {
    const est = Array.from(d.psdEstimate);
    const estMax = Math.max(1e-6, ...est);
    const theory = Array.from(d.psdTheory);
    const thMax = Math.max(1e-6, ...theory);
    return { estNorm: est.map((v) => v / estMax), thNorm: theory.map((v) => v / thMax) };
  }, [d.psdEstimate, d.psdTheory]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.12], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$S_X(f)$ (norm.)',
      domainY: [0, 1.12],
    });
    drawLine(ctx, ax, freqs, estNorm, CHART.blue, 1.6);
    if (showTheory) drawLine(ctx, ax, freqs, thNorm, CHART.orange, 2, true);
  };

  return (
    <div>
      <PlotTitle textKey="rp.plot.psd" />
      <Canvas
        height={220}
        draw={draw}
        deps={[d, lo, hi, showTheory]}
        ariaLabel="Power spectral density: estimate vs theory"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="rp__legend">
        <span className="rp__legend__item" style={{ color: CHART.blue }}>
          <span className="rp__legend__swatch" />
          {t('rp.trace.estimate')}
        </span>
        {showTheory && (
          <span className="rp__legend__item" style={{ color: CHART.orange }}>
            <span className="rp__legend__swatch rp__legend__swatch--dashed" />
            {t('rp.trace.theory')}
          </span>
        )}
      </div>
    </div>
  );
}

/** §5.2.4 — squared magnitude response |H(f)|² of the colored-process filter. */
export function FilterMagPanel({ d, params }: { d: Derived; params: ProcessParams }) {
  const fMax = params.fs / 2;
  const [lo, hi, onWheel, , onPan] = useZoom(0, fMax, {
    minSpan: fMax / 12,
    maxSpan: fMax,
    clampMin: 0,
    clampMax: fMax,
  });
  const freqs = useMemo(() => Array.from(d.freqs), [d.freqs]);
  const magSq = useMemo(() => Array.from(d.filterMag), [d.filterMag]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.12], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$|H(f)|^2$',
      domainY: [0, 1.12],
    });
    drawLine(ctx, ax, freqs, magSq, CHART.orange, 2);
  };

  return (
    <div>
      <PlotTitle textKey="rp.filtermag.title" />
      <Canvas
        height={200}
        draw={draw}
        deps={[d, lo, hi]}
        ariaLabel="Filter magnitude-squared response"
        onWheel={onWheel}
        onPan={onPan}
      />
    </div>
  );
}

/** Histogram bins (counts) over [-lim, lim]. */
function histogram(values: number[], bins: number, lim: number): number[] {
  const h = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.floor(((v + lim) / (2 * lim)) * bins);
    if (idx >= 0 && idx < bins) h[idx]++;
  }
  return h;
}

/** §5.3.3 — output amplitude histogram: filtered Gaussian noise stays Gaussian. */
export function FilterHistPanel({ params }: { params: ProcessParams }) {
  const hist = useMemo(() => {
    const colored = generateEnsemble({ ...params, kind: 'colored' });
    const flat = colored.slice(0, 20).flatMap((x) => Array.from(x));
    const lim = Math.max(0.1, ...flat.map(Math.abs));
    const bins = 41;
    const counts = histogram(flat, bins, lim);
    const cmax = Math.max(1, ...counts);
    return counts.map((c) => c / cmax);
  }, [params]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([0, hist.length - 1], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.12], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [0, hist.length - 1], {
      xLabel: '$x$',
      yLabel: '$f_Y(x)$ (norm.)',
      domainY: [0, 1.12],
      tickLabels: false,
    });
    for (let i = 0; i < hist.length; i++) {
      const px = ax.x(i);
      ctx.fillStyle = alpha(CHART.green, 0.5);
      ctx.fillRect(px - 3, ax.y(hist[i]), 6, ax.y(0) - ax.y(hist[i]));
    }
  };

  return (
    <div>
      <PlotTitle textKey="rp.filterhist.title" />
      <Canvas
        height={170}
        draw={draw}
        deps={[hist]}
        ariaLabel="Output amplitude histogram (Gaussian)"
      />
    </div>
  );
}
