import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawScatter, drawText, drawAxes, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { SignalSpaceView, SigSpaceFrame } from './signalspace-model';

const COL = {
  axis: alpha(CHART.dim, 0.5),
  source: CHART.green, // sₘ(t)
  proj: CHART.orange, // removed component
  residual: alpha(CHART.green, 0.55),
  basis: CHART.blue, // φₖ(t)
  point: CHART.blue,
  label: CHART.text,
  dep: CHART.pink,
};

// PAD leaves room for the rotated y-label (left) and x-label (bottom).
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, dx: [number, number], dy: [number, number]): Axes {
  return { x: linScale(dx, [PAD.l, w - PAD.r]), y: linScale(dy, [h - PAD.b, PAD.t]) };
}

function indices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function maxAbs(...arrs: number[][]): number {
  return Math.max(1e-6, ...arrs.flatMap((a) => a.map((v) => Math.abs(v)))) * 1.15;
}

/** Current G-S step: source sₘ(t), the projection component being removed, and the residual gₘ(t). */
export function WalkthroughPanel({
  frame,
  view,
  lo,
  hi,
  onWheel,
  onPan,
}: {
  frame: SigSpaceFrame;
  view: SignalSpaceView;
  lo: number;
  hi: number;
  onWheel: (f: number, d: number) => void;
  onPan: (f: number) => void;
}) {
  const sps = view.sps;
  const source = view.signals[frame.signalIndex] ?? [];
  const ymax = maxAbs(source, frame.residual, frame.component ?? []);
  const xs = indices(sps);
  return (
    <Canvas
      height={220}
      ariaLabel="Gram-Schmidt step: source, projection and residual"
      deps={[frame, view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-ymax, ymax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$s_m(t),\\ g_m(t)$' });
        drawLine(ctx, ax, [lo, hi], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, xs, source, COL.source, 2);
        if (frame.phase === 'project' && frame.component) {
          drawLine(ctx, ax, xs, frame.component, COL.proj, 1.5, true);
          if (frame.coeff !== null) {
            drawText(ctx, ax, lo, ymax, `c = ${frame.coeff.toFixed(2)}`, COL.proj, 6, 12);
          }
        }
        const residColor = frame.phase === 'normalize' && frame.dependent ? COL.dep : COL.residual;
        drawLine(ctx, ax, xs, frame.residual, residColor, frame.phase === 'normalize' ? 2.5 : 1.5);
      }}
    />
  );
}

/** Growing gallery of the orthonormal basis waveforms φₖ(t) (first `count` of them). */
export function BasisGalleryPanel({
  view,
  count,
  lo,
  hi,
  onWheel,
  onPan,
}: {
  view: SignalSpaceView;
  count: number;
  lo: number;
  hi: number;
  onWheel: (f: number, d: number) => void;
  onPan: (f: number) => void;
}) {
  const sps = view.sps;
  const shown = view.basis.slice(0, count);
  const ymax = shown.length ? maxAbs(...shown) : 1;
  const xs = indices(sps);
  return (
    <Canvas
      height={200}
      ariaLabel="Orthonormal basis waveforms"
      deps={[view, count, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-ymax, ymax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$\\varphi_k(t)$' });
        drawLine(ctx, ax, [lo, hi], [0, 0], COL.axis, 1);
        shown.forEach((phi, k) => {
          const c = k === 0 ? COL.basis : k === 1 ? CHART.orange : CHART.pink;
          drawLine(ctx, ax, xs, phi, c, 2);
          drawText(
            ctx,
            ax,
            xs[Math.floor(sps * 0.04)],
            phi[Math.floor(sps * 0.04)],
            `φ${k + 1}`,
            c,
            4,
            -6,
          );
        });
      }}
    />
  );
}

/** Signal-space constellation, rendered by dimension: 1-D axis, 2-D plane, or coefficient bars. */
export function ConstellationView({ view }: { view: SignalSpaceView }) {
  if (view.kind === 'axis') return <AxisConstellation view={view} />;
  if (view.kind === 'plane') return <PlaneConstellation view={view} />;
  return <BarsConstellation view={view} />;
}

function AxisConstellation({ view }: { view: SignalSpaceView }) {
  const pts = view.coeffs.map((c) => c[0] ?? 0);
  const e = Math.max(1e-6, ...pts.map((p) => Math.abs(p))) * 1.25;
  return (
    <Canvas
      height={120}
      ariaLabel="One-dimensional signal-space constellation"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-1, 1]);
        drawAxes(ctx, ax, [-e, e], { xLabel: '$s_{m1}$' });
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        pts.forEach((p, m) => {
          drawScatter(ctx, ax, [p], [0], COL.point, 5);
          drawText(ctx, ax, p, 0, view.labels[m], COL.label, 0, -12);
        });
      }}
    />
  );
}

function PlaneConstellation({ view }: { view: SignalSpaceView }) {
  const xs = view.coeffs.map((c) => c[0] ?? 0);
  const ys = view.coeffs.map((c) => c[1] ?? 0);
  const e = Math.max(1e-6, ...xs.map(Math.abs), ...ys.map(Math.abs)) * 1.25;
  return (
    <Canvas
      height={320}
      ariaLabel="Two-dimensional signal-space constellation"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-e, e]);
        drawAxes(ctx, ax, [-e, e], { xLabel: '$s_{m1}\\ (\\varphi_1)$', yLabel: '$s_{m2}\\ (\\varphi_2)$' });
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, [0, 0], [-e, e], COL.axis, 1);
        view.coeffs.forEach((c, m) => {
          drawScatter(ctx, ax, [c[0] ?? 0], [c[1] ?? 0], COL.point, 4.5);
          drawText(ctx, ax, c[0] ?? 0, c[1] ?? 0, view.labels[m], COL.label, 6, -6);
        });
      }}
    />
  );
}

function BarsConstellation({ view }: { view: SignalSpaceView }) {
  // One grouped bar chart: for each signal sₘ, its N coefficients s_{mn}.
  const N = view.dim;
  const M = view.M;
  const all = view.coeffs.flat();
  const ymax = Math.max(1e-6, ...all.map(Math.abs)) * 1.2;
  const groupW = 0.8;
  const barW = groupW / Math.max(1, N);
  const barColor = (n: number) => (n === 0 ? COL.basis : n === 1 ? CHART.orange : CHART.pink);
  return (
    <Canvas
      height={260}
      ariaLabel="Signal-space coefficients per signal"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-0.5, M - 0.5], [-ymax, ymax]);
        drawAxes(ctx, ax, [-0.5, M - 0.5], { xLabel: '$\\mathrm{signal}\\ m$', yLabel: '$s_{mn}$' });
        drawLine(ctx, ax, [-0.5, M - 0.5], [0, 0], COL.axis, 1);
        for (let m = 0; m < M; m++) {
          for (let n = 0; n < N; n++) {
            const cx = m - groupW / 2 + barW * (n + 0.5);
            const val = view.coeffs[m][n] ?? 0;
            const left = ax.x(cx - barW * 0.42);
            const right = ax.x(cx + barW * 0.42);
            const yTop = ax.y(Math.max(val, 0));
            const yBot = ax.y(Math.min(val, 0));
            ctx.fillStyle = alpha(barColor(n), 0.85);
            ctx.fillRect(left, yTop, right - left, yBot - yTop);
          }
          drawText(ctx, ax, m, 0, view.labels[m], COL.label, -6, 16);
        }
      }}
    />
  );
}
