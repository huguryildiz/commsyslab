import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawLine,
  drawScatter,
  drawVLine,
  drawText,
  drawArrow,
  drawRegions,
  regionColors,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { detectML } from '@/lib/dsp/detector';
import { t } from '@/i18n';
import type { OptRxView, OptRxReception } from './model';

const COL = {
  axis: alpha(CHART.dim, 0.5),
  tx: CHART.green,
  rx: alpha(CHART.text, 0.55),
  mf: alpha(CHART.orange, 0.8),
  mfout: CHART.orange,
  point: CHART.blue,
  label: CHART.text,
  thresh: alpha(CHART.dim, 0.9),
  sample: CHART.pink,
  err: CHART.red,
};

// Per-branch correlator colors (cycled for orthogonal bases).
const BRANCH = [CHART.green, CHART.blue, CHART.orange, CHART.pink];

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

/** (a) Transmitted s(t), received r(t), and the basis waveforms φ_k(t). */
export function WaveformPanel({ view, reception }: { view: OptRxView; reception: OptRxReception }) {
  const sps = view.basis[0].length;
  const ymax =
    Math.max(
      ...view.symbolWaveform.map((v) => Math.abs(v)),
      ...reception.received.map((v) => Math.abs(v)),
      ...view.basis.flatMap((b) => b.map((v) => Math.abs(v))),
      1e-6,
    ) * 1.15;
  return (
    <Canvas
      height={200}
      ariaLabel="Transmitted, received and basis waveforms"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, sps - 1], [-ymax, ymax]);
        const xs = indices(sps);
        drawLine(ctx, ax, [0, sps - 1], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, xs, reception.received, COL.rx, 1);
        for (const phi of view.basis) drawLine(ctx, ax, xs, phi, COL.mf, 1, true);
        drawLine(ctx, ax, xs, view.symbolWaveform, COL.tx, 2);
      }}
    />
  );
}

/** (b) Per-branch correlator running integrals; each reaches its statistic component at t=T. */
export function DemodPanel({ view, reception }: { view: OptRxView; reception: OptRxReception }) {
  const sps = view.basis[0].length;
  const sampleIdx = sps - 1; // t = T (full overlap)
  const mfLen = reception.branchMf ? reception.branchMf[0].length : sps;
  const xMax = Math.max(sps - 1, mfLen - 1);
  const ys = [
    ...reception.branchCorr.flat(),
    ...(reception.branchMf ? reception.branchMf.flat() : []),
  ];
  const ymin = Math.min(...ys, 0) * 1.1;
  const ymax = Math.max(...ys, 1e-6) * 1.15;
  return (
    <Canvas
      height={220}
      ariaLabel="Correlator branch integrals versus sample index"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, xMax], [ymin, ymax]);
        drawLine(ctx, ax, [0, xMax], [0, 0], COL.axis, 1);
        // 1-D only: matched-filter output overlay shows the correlator≡MF equivalence.
        if (reception.branchMf) {
          for (const mf of reception.branchMf) {
            drawLine(ctx, ax, indices(mf.length), mf, COL.mfout, 1.5);
          }
        }
        reception.branchCorr.forEach((corr, k) => {
          drawLine(ctx, ax, indices(corr.length), corr, BRANCH[k % BRANCH.length], 2, true);
        });
        drawVLine(ctx, ax, sampleIdx, ymin, ymax, COL.sample, true, 1);
        reception.statistic.forEach((rk, k) => {
          drawScatter(ctx, ax, [sampleIdx], [rk], BRANCH[k % BRANCH.length], 4.5);
        });
        drawText(ctx, ax, sampleIdx, reception.statistic[0], 't=T', COL.sample, 6, -8);
      }}
    />
  );
}

/** (c-1d) 1-D decision axis: points, thresholds and the sampled statistic. */
export function DecisionAxisPanel({
  view,
  reception,
}: {
  view: OptRxView;
  reception: OptRxReception;
}) {
  const e = view.extent;
  const correct = reception.decided === reception.txIndex;
  const stat = reception.statistic[0];
  return (
    <Canvas
      height={120}
      ariaLabel="One-dimensional decision axis with thresholds and the sampled statistic"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-1, 1]);
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        for (const th of view.thresholds) drawVLine(ctx, ax, th, -1, 1, COL.thresh, true, 1);
        for (let k = 0; k < view.points.length; k++) {
          drawScatter(ctx, ax, [view.points[k][0]], [0], COL.point, 5);
          drawText(ctx, ax, view.points[k][0], 0, view.labels[k], COL.label, 0, -12);
        }
        drawScatter(ctx, ax, [stat], [0], correct ? COL.sample : COL.err, 5.5);
        drawText(
          ctx,
          ax,
          stat,
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

/** (c-2d) Signal-space constellation with decision regions and the received point (r₁,r₂). */
export function ConstellationLandingPanel({
  view,
  reception,
}: {
  view: OptRxView;
  reception: OptRxReception;
}) {
  const e = view.extent;
  const colors = regionColors(view.M);
  const correct = reception.decided === reception.txIndex;
  const rx = reception.statistic;
  const ideal = view.points[reception.txIndex];
  return (
    <Canvas
      height={320}
      ariaLabel="Constellation with decision regions and the received point"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-e, e]);
        drawRegions(ctx, ax, [-e, e], [-e, e], (x, y) => detectML([x, y], view.points), colors, 72);
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, [0, 0], [-e, e], COL.axis, 1);
        for (let k = 0; k < view.points.length; k++) {
          drawScatter(ctx, ax, [view.points[k][0]], [view.points[k][1]], COL.point, 4.5);
          drawText(ctx, ax, view.points[k][0], view.points[k][1], view.labels[k], COL.label, 6, -6);
        }
        drawArrow(ctx, ax, ideal[0], ideal[1], rx[0], rx[1], correct ? COL.sample : COL.err, 1.5);
        drawScatter(ctx, ax, [rx[0]], [rx[1]], correct ? COL.sample : COL.err, 5.5);
      }}
    />
  );
}

/** (c-orthogonal) Bar chart of the M correlator outputs; the largest (= decision) is highlighted. */
export function CorrelatorBankPanel({
  view,
  reception,
}: {
  view: OptRxView;
  reception: OptRxReception;
}) {
  const M = view.M;
  const stats = reception.statistic;
  const correct = reception.decided === reception.txIndex;
  const ymax = Math.max(...stats, 1e-6) * 1.2;
  const ymin = Math.min(...stats, 0) * 1.1;
  const bw = 0.62;
  return (
    <Canvas
      height={220}
      ariaLabel="Correlator-bank outputs; the largest is the decision"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-0.5, M - 0.5], [ymin, ymax]);
        drawLine(ctx, ax, [-0.5, M - 0.5], [0, 0], COL.axis, 1);
        for (let k = 0; k < M; k++) {
          const isDecided = k === reception.decided;
          const fill = isDecided ? (correct ? COL.sample : COL.err) : alpha(CHART.blue, 0.55);
          const left = ax.x(k - bw / 2);
          const right = ax.x(k + bw / 2);
          const yTop = ax.y(Math.max(stats[k], 0));
          const yBot = ax.y(Math.min(stats[k], 0));
          ctx.fillStyle = fill;
          ctx.fillRect(left, yTop, right - left, yBot - yTop);
          drawText(ctx, ax, k, Math.max(stats[k], 0), view.labels[k], COL.label, -6, -8);
          if (k === reception.txIndex) drawText(ctx, ax, k, 0, 'tx', COL.tx, -4, 14);
        }
      }}
    />
  );
}

/** (c-dim≥3) Bar chart of Euclidean distances ‖r − sₘ‖; the smallest (= decision) is highlighted. */
export function MinDistancePanel({
  view,
  reception,
}: {
  view: OptRxView;
  reception: OptRxReception;
}) {
  const M = view.M;
  const r = reception.statistic;
  const dists = view.points.map((s) => {
    let d = 0;
    for (let k = 0; k < s.length; k++) {
      const df = r[k] - s[k];
      d += df * df;
    }
    return Math.sqrt(d);
  });
  const correct = reception.decided === reception.txIndex;
  const ymax = Math.max(...dists, 1e-6) * 1.2;
  const bw = 0.62;
  return (
    <Canvas
      height={220}
      ariaLabel="Distances from the received vector to each candidate; the smallest is the decision"
      deps={[view, reception]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-0.5, M - 0.5], [0, ymax]);
        drawLine(ctx, ax, [-0.5, M - 0.5], [0, 0], COL.axis, 1);
        for (let k = 0; k < M; k++) {
          const isDecided = k === reception.decided;
          const fill = isDecided ? (correct ? COL.sample : COL.err) : alpha(CHART.blue, 0.55);
          const left = ax.x(k - bw / 2);
          const right = ax.x(k + bw / 2);
          const yTop = ax.y(dists[k]);
          const yBot = ax.y(0);
          ctx.fillStyle = fill;
          ctx.fillRect(left, yTop, right - left, yBot - yTop);
          drawText(ctx, ax, k, dists[k], view.labels[k], COL.label, -6, -8);
          if (k === reception.txIndex) drawText(ctx, ax, k, 0, 'tx', COL.tx, -4, 14);
        }
      }}
    />
  );
}
