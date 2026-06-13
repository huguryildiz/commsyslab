import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  logScale,
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
import { CHART, alpha } from '@/lib/plot/colors';
import type { ModulationView, Pt2 } from './model';

const COL = {
  axis: alpha(CHART.dim, 0.5),
  point: CHART.blue,
  label: CHART.text,
  cloud: alpha(CHART.blue, 0.35),
  cloudErr: alpha(CHART.red, 0.6),
  dmin: alpha(CHART.orange, 0.9),
  ml: CHART.green,
  map: CHART.red,
  theory: CHART.blue,
  sim: CHART.orange,
  live: CHART.green,
  marker: alpha(CHART.red, 0.8),
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
              decision === 'map' ? detectMAP([x, y], pts, priors, n0) : detectML([x, y], pts),
            colors,
            80,
          );
        }
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        drawLine(ctx, ax, [0, 0], [-e, e], COL.axis, 1);
        for (const p of cloud) {
          drawScatter(ctx, ax, [p.x], [p.y], p.err ? COL.cloudErr : COL.cloud, 1.6);
        }
        const [i, j] = view.dMinPair;
        const a = view.points2d[i];
        const b = view.points2d[j];
        if (a && b) {
          drawLine(ctx, ax, [a.x, b.x], [a.y, b.y], COL.dmin, 1.5, true);
          drawText(ctx, ax, (a.x + b.x) / 2, (a.y + b.y) / 2, 'd_min', COL.dmin, 4, -4);
        }
        for (let k = 0; k < view.points2d.length; k++) {
          const p = view.points2d[k];
          drawScatter(ctx, ax, [p.x], [p.y], COL.point, 4.5);
          if (showLabels) drawText(ctx, ax, p.x, p.y, view.labels[k], COL.label, 7, -7);
        }
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
  const yJit = 1;
  return (
    <Canvas
      height={200}
      ariaLabel="One-dimensional decision axis with ML/MAP thresholds"
      deps={[view, decision, showLabels, cloud]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-e, e], [-yJit, yJit]);
        drawLine(ctx, ax, [-e, e], [0, 0], COL.axis, 1);
        for (const p of cloud) {
          drawScatter(ctx, ax, [p.x], [p.y], p.err ? COL.cloudErr : COL.cloud, 1.6);
        }
        if (view.axis1d) {
          for (const th of view.axis1d.thresholds) {
            drawVLine(ctx, ax, th.ml, -yJit, yJit, COL.ml, false, 1.5);
            if (decision === 'map') drawVLine(ctx, ax, th.map, -yJit, yJit, COL.map, true, 1.5);
          }
        }
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
        const ys = view.serCurve.pe.map((v) => Math.max(v, SER_FLOOR));
        drawLine(ctx, ax, view.serCurve.ebN0Db, ys, COL.theory, 2);
        drawVLine(ctx, ax, ebN0Db, SER_FLOOR, 1, COL.marker, true, 1);
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
        ctx.fillStyle = CHART.bgDeep;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = CHART.text;
        for (let r = 0; r < height; r++) {
          for (let col = 0; col < width; col++) {
            if (bits[r * width + col]) ctx.fillRect(col * cw, r * ch, cw + 0.5, ch + 0.5);
          }
        }
      }}
    />
  );
}
