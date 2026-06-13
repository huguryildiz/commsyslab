import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawScatter, drawVLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { OptRxView, OptRxReception } from './model';

const COL = {
  axis: alpha(CHART.dim, 0.5),
  tx: CHART.green,
  rx: alpha(CHART.text, 0.55),
  mf: CHART.orange,
  corr: CHART.green,
  mfout: CHART.orange,
  point: CHART.blue,
  label: CHART.text,
  thresh: alpha(CHART.dim, 0.9),
  sample: CHART.pink,
  err: CHART.red,
};

const PAD = { l: 38, r: 12, t: 12, b: 22 };

function axesFor(w: number, h: number, dx: [number, number], dy: [number, number]): Axes {
  return {
    x: linScale(dx, [PAD.l, w - PAD.r]),
    y: linScale(dy, [h - PAD.b, PAD.t]),
  };
}

function indices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** (a) Transmitted s(t), received r(t), and matched-filter impulse response h(t). */
export function WaveformPanel({ view, reception }: { view: OptRxView; reception: OptRxReception }) {
  const n = view.basis.length;
  const ymax =
    Math.max(
      ...view.symbolWaveform.map((v) => Math.abs(v)),
      ...reception.received.map((v) => Math.abs(v)),
      ...view.matchedIR.map((v) => Math.abs(v)),
      1e-6,
    ) * 1.15;
  return (
    <Canvas
      height={200}
      ariaLabel="Transmitted, received and matched-filter waveforms"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, n - 1], [-ymax, ymax]);
        const xs = indices(n);
        drawLine(ctx, ax, [0, n - 1], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, xs, reception.received, COL.rx, 1);
        drawLine(ctx, ax, xs, view.symbolWaveform, COL.tx, 2);
        drawLine(ctx, ax, xs, view.matchedIR, COL.mf, 1.5, true);
      }}
    />
  );
}

/** (b) Correlator running integral and matched-filter output meet at t = T. */
export function DemodPanel({ view, reception }: { view: OptRxView; reception: OptRxReception }) {
  const n = view.basis.length;
  const mfLen = reception.mfOutput.length;
  const sampleIdx = n - 1; // t = T (full overlap)
  const ys = [...reception.mfOutput, ...reception.runningCorr];
  const ymin = Math.min(...ys, 0) * 1.1;
  const ymax = Math.max(...ys, 1e-6) * 1.15;
  return (
    <Canvas
      height={220}
      ariaLabel="Correlator integral and matched-filter output versus sample index"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, mfLen - 1], [ymin, ymax]);
        drawLine(ctx, ax, [0, mfLen - 1], [0, 0], COL.axis, 1);
        // matched-filter output over its full support
        drawLine(ctx, ax, indices(mfLen), reception.mfOutput, COL.mfout, 1.5);
        // correlator running integral over [0, T]
        drawLine(ctx, ax, indices(n), reception.runningCorr, COL.corr, 2, true);
        // sampling instant t = T and the shared decision statistic
        drawVLine(ctx, ax, sampleIdx, ymin, ymax, COL.sample, true, 1);
        drawScatter(ctx, ax, [sampleIdx], [reception.statistic], COL.sample, 4.5);
        drawText(ctx, ax, sampleIdx, reception.statistic, 't=T', COL.sample, 6, -8);
      }}
    />
  );
}

/** (c) 1-D decision axis: amplitudes, thresholds and the sampled statistic. */
export function DecisionAxisPanel({
  view,
  reception,
}: {
  view: OptRxView;
  reception: OptRxReception;
}) {
  const e = view.extent;
  const correct = reception.decided === reception.txIndex;
  return (
    <Canvas
      height={120}
      ariaLabel="One-dimensional decision axis with thresholds and the sampled statistic"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-1, 1]);
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        for (const th of view.thresholds) drawVLine(ctx, ax, th, -1, 1, COL.thresh, true, 1);
        for (let k = 0; k < view.amplitudes.length; k++) {
          drawScatter(ctx, ax, [view.amplitudes[k]], [0], COL.point, 5);
          drawText(ctx, ax, view.amplitudes[k], 0, view.labels[k], COL.label, 0, -12);
        }
        drawScatter(ctx, ax, [reception.statistic], [0], correct ? COL.sample : COL.err, 5.5);
        drawText(
          ctx,
          ax,
          reception.statistic,
          0,
          t('modulation.optrx.readout.statistic'),
          correct ? COL.sample : COL.err,
          6,
          12,
        );
      }}
    />
  );
}
