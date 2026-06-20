import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawScatter, drawVLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { PllView, TimingView } from './sync-model';

const PAD = { l: 46, r: 14, t: 14, b: 34 };

export interface PllLockPanelProps {
  view: PllView;
}

/**
 * PLL lock-in: phase error (degrees) vs time. Underdamped loops ring, overdamped
 * loops crawl; the error settles to zero as the loop locks (§8.8.1).
 */
export function PllLockPanel({ view }: PllLockPanelProps) {
  const tMax = view.trace[view.trace.length - 1]?.t ?? 1;
  const errsDeg = view.trace.map((p) => (p.err * 180) / Math.PI);
  const maxDeg = Math.max(10, ...errsDeg.map((e) => Math.abs(e)));
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, tMax, {
    minSpan: 1,
    maxSpan: tMax,
    clampMin: 0,
  });
  const yDom: [number, number] = [-maxDeg * 1.1, maxDeg * 1.1];
  return (
    <Canvas
      height={280}
      ariaLabel="PLL phase error versus time during lock-in"
      deps={[view, lo, hi]}
      onWheel={handleWheel}
      onPan={handlePan}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([lo, hi], [PAD.l, w - PAD.r]),
          y: linScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$t\\,(\\mathrm{s})$',
          yLabel: '$\\phi-\\hat{\\phi}\\,(\\mathrm{deg})$',
          domainY: yDom,
        });
        drawLine(ctx, ax, [lo, hi], [0, 0], alpha(CHART.dim, 0.5), 1);
        drawLine(
          ctx,
          ax,
          view.trace.map((p) => p.t),
          errsDeg,
          CHART.blue,
          2,
        );
      }}
    />
  );
}

export interface EarlyLatePanelProps {
  view: TimingView;
}

/**
 * Early-late gate: the matched-filter autocorrelation (peak at the true symbol
 * instant) with the receiver's early and late gate samples. When they are unequal
 * the loop is off-time (§8.9.1).
 */
export function EarlyLatePanel({ view }: EarlyLatePanelProps) {
  return (
    <Canvas
      height={260}
      ariaLabel="Early-late gate samples on the matched-filter autocorrelation"
      deps={[view]}
      draw={(ctx, w, h) => {
        const xDom: [number, number] = [-1.2, 1.2];
        const yDom: [number, number] = [-0.05, 1.1];
        const ax: Axes = {
          x: linScale(xDom, [PAD.l, w - PAD.r]),
          y: linScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, xDom, {
          xLabel: '$t/T$',
          yLabel: '$|R(t)|$',
          domainY: yDom,
        });
        drawLine(
          ctx,
          ax,
          view.autocorr.map((p) => p.x),
          view.autocorr.map((p) => p.y),
          CHART.blue,
          2,
        );
        // True symbol instant (peak) and the offset gate samples.
        drawVLine(ctx, ax, view.peak.x, 0, 1, alpha(CHART.dim, 0.5), true, 1);
        drawScatter(ctx, ax, [view.early.x], [view.early.y], CHART.green, 5);
        drawText(ctx, ax, view.early.x, view.early.y, 'early', CHART.green, 0, -8);
        drawScatter(ctx, ax, [view.late.x], [view.late.y], CHART.orange, 5);
        drawText(ctx, ax, view.late.x, view.late.y, 'late', CHART.orange, 0, -8);
      }}
    />
  );
}

export interface TimingSCurvePanelProps {
  view: TimingView;
  tau: number;
}

/**
 * Timing discriminator S-curve: error vs offset τ. It crosses zero at perfect
 * timing with a restoring slope, and the current operating point is marked.
 */
export function TimingSCurvePanel({ view, tau }: TimingSCurvePanelProps) {
  const errs = view.sCurve.map((p) => p.error);
  const maxE = Math.max(0.1, ...errs.map((e) => Math.abs(e)));
  return (
    <Canvas
      height={240}
      ariaLabel="Early-late gate discriminator S-curve"
      deps={[view, tau]}
      draw={(ctx, w, h) => {
        const xDom: [number, number] = [-0.5, 0.5];
        const yDom: [number, number] = [-maxE * 1.1, maxE * 1.1];
        const ax: Axes = {
          x: linScale(xDom, [PAD.l, w - PAD.r]),
          y: linScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, xDom, {
          xLabel: '$\\tau/T$',
          yLabel: 'timing error',
          domainY: yDom,
        });
        drawLine(ctx, ax, [-0.5, 0.5], [0, 0], alpha(CHART.dim, 0.5), 1);
        drawLine(
          ctx,
          ax,
          view.sCurve.map((p) => p.tau),
          errs,
          CHART.blue,
          2,
        );
        drawScatter(ctx, ax, [tau], [view.errorNow], CHART.pink, 5);
      }}
    />
  );
}
