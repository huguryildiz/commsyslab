// Canvas panels for the Waveforms tab. §8.1–8.4 Proakis & Salehi.
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { WaveformData } from './waveforms-model';

// [lo, hi] axis range returned by useZoom
export type ZoomState = [number, number];

const PAD = { l: 42, r: 12, t: 12, b: 28 };

function axesFor(w: number, h: number, dx: [number, number], dy: [number, number]): Axes {
  return {
    x: linScale(dx, [PAD.l, w - PAD.r]),
    y: linScale(dy, [h - PAD.b, PAD.t]),
  };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  domainY: [number, number],
) {
  const gridColor = alpha(CHART.dim, 0.18);
  ctx.save();
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  // Horizontal grid lines
  const [y0, y1] = domainY;
  const yStep = niceStep(y1 - y0, 4);
  const yStart = Math.ceil(y0 / yStep) * yStep;
  for (let y = yStart; y <= y1 + 1e-9; y += yStep) {
    const py = ax.y(y);
    ctx.beginPath();
    ctx.moveTo(ax.x(domainX[0]), py);
    ctx.lineTo(ax.x(domainX[1]), py);
    ctx.stroke();
  }
  // Vertical grid lines
  const [x0, x1] = domainX;
  const xStep = niceStep(x1 - x0, 6);
  const xStart = Math.ceil(x0 / xStep) * xStep;
  for (let x = xStart; x <= x1 + 1e-9; x += xStep) {
    const px = ax.x(x);
    ctx.beginPath();
    ctx.moveTo(px, ax.y(domainY[0]));
    ctx.lineTo(px, ax.y(domainY[1]));
    ctx.stroke();
  }
  ctx.restore();
}

function drawAxisLines(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  domainY: [number, number],
  xLabel: string,
  yLabel: string,
  h: number,
) {
  const axisColor = alpha(CHART.dim, 0.55);
  const tickColor = alpha(CHART.dim, 0.78);
  const labelColor = alpha(CHART.text, 0.84);

  ctx.save();
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;

  // X axis
  const py0 = Math.max(PAD.t, Math.min(h - PAD.b, ax.y(0)));
  ctx.beginPath();
  ctx.moveTo(ax.x(domainX[0]), py0);
  ctx.lineTo(ax.x(domainX[1]), py0);
  ctx.stroke();

  // Y axis
  const px0 = ax.x(domainX[0]);
  ctx.beginPath();
  ctx.moveTo(px0, ax.y(domainY[0]));
  ctx.lineTo(px0, ax.y(domainY[1]));
  ctx.stroke();

  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillStyle = tickColor;

  // Y ticks
  const [y0, y1] = domainY;
  const yStep = niceStep(y1 - y0, 4);
  const yStart = Math.ceil(y0 / yStep) * yStep;
  for (let y = yStart; y <= y1 + 1e-9; y += yStep) {
    const py = ax.y(y);
    ctx.beginPath();
    ctx.moveTo(px0 - 4, py);
    ctx.lineTo(px0, py);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTick(y), px0 - 6, py);
  }

  // X ticks
  const [x0, x1] = domainX;
  const xStep = niceStep(x1 - x0, 6);
  const xStart = Math.ceil(x0 / xStep) * xStep;
  for (let x = xStart; x <= x1 + 1e-9; x += xStep) {
    const px = ax.x(x);
    ctx.beginPath();
    ctx.moveTo(px, py0);
    ctx.lineTo(px, py0 + 4);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatTick(x), px, py0 + 6);
  }

  // Labels
  ctx.fillStyle = labelColor;
  ctx.font = '11px IBM Plex Sans, sans-serif';
  // X label — bottom center
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(xLabel, (ax.x(domainX[0]) + ax.x(domainX[1])) / 2, h - 2);
  // Y label — rotated left
  ctx.save();
  ctx.translate(10, (ax.y(domainY[0]) + ax.y(domainY[1])) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.restore();
}

function niceStep(range: number, targetCount: number): number {
  const raw = range / targetCount;
  const exp = Math.floor(Math.log10(raw));
  const frac = raw / Math.pow(10, exp);
  let nice: number;
  if (frac < 1.5) nice = 1;
  else if (frac < 3.5) nice = 2;
  else if (frac < 7.5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

function formatTick(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toPrecision(2);
}

// IQ baseband panel: I(t) green, Q(t) orange, noisy dims overlay
export function IQPanel({
  data,
  zoom,
  onWheel,
  onPan,
}: {
  data: WaveformData;
  zoom: ZoomState;
  onWheel: (xFrac: number, deltaY: number) => void;
  onPan: (deltaFrac: number) => void;
}) {
  const [lo, hi] = zoom;
  return (
    <Canvas
      height={160}
      ariaLabel="I(t) and Q(t) baseband waveforms"
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const domainX: [number, number] = [lo, hi];
        const domainY: [number, number] = [-1.6, 1.6];
        const ax = axesFor(w, h, domainX, domainY);
        drawGrid(ctx, ax, domainX, domainY);

        const { t, I, Q, Inoisy, Qnoisy, symbolBoundaries } = data;

        // Symbol boundary dashed verticals
        for (const sb of symbolBoundaries) {
          const tx = t[sb];
          if (tx >= lo && tx <= hi) {
            drawVLine(ctx, ax, tx, domainY[0], domainY[1], alpha(CHART.dim, 0.25), true, 1);
          }
        }

        // Noisy dim overlays
        drawLine(ctx, ax, t, Inoisy, alpha(CHART.green, 0.28), 1);
        drawLine(ctx, ax, t, Qnoisy, alpha(CHART.orange, 0.28), 1);

        // Clean I and Q
        drawLine(ctx, ax, t, I, CHART.green, 1.5);
        drawLine(ctx, ax, t, Q, CHART.orange, 1.5);

        drawAxisLines(ctx, ax, domainX, domainY, 't (sym)', 'Amplitude', h);
      }}
    />
  );
}

// RF bandpass panel: s(t) blue-violet
export function RFPanel({
  data,
  zoom,
  onWheel,
  onPan,
}: {
  data: WaveformData;
  zoom: ZoomState;
  onWheel: (xFrac: number, deltaY: number) => void;
  onPan: (deltaFrac: number) => void;
}) {
  const [lo, hi] = zoom;
  return (
    <Canvas
      height={160}
      ariaLabel="RF bandpass waveform s(t)"
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const domainX: [number, number] = [lo, hi];
        const domainY: [number, number] = [-2, 2];
        const ax = axesFor(w, h, domainX, domainY);
        drawGrid(ctx, ax, domainX, domainY);

        const { t, rf, symbolBoundaries } = data;

        for (const sb of symbolBoundaries) {
          const tx = t[sb];
          if (tx >= lo && tx <= hi) {
            drawVLine(ctx, ax, tx, domainY[0], domainY[1], alpha(CHART.dim, 0.2), true, 1);
          }
        }

        drawLine(ctx, ax, t, rf, CHART.blue, 1.5);
        drawAxisLines(ctx, ax, domainX, domainY, 't (sym)', 's(t)', h);
      }}
    />
  );
}

// Phase / frequency / amplitude panel — label adapts to family
export function PhasePanel({
  data,
  zoom,
  onWheel,
  onPan,
}: {
  data: WaveformData;
  zoom: ZoomState;
  onWheel: (xFrac: number, deltaY: number) => void;
  onPan: (deltaFrac: number) => void;
}) {
  const [lo, hi] = zoom;
  return (
    <Canvas
      height={160}
      ariaLabel="Phase, frequency or amplitude trajectory"
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const domainX: [number, number] = [lo, hi];
        const domainY = data.phaseDomain;
        const ax = axesFor(w, h, domainX, domainY);
        drawGrid(ctx, ax, domainX, domainY);

        const { t, phaseOrFreq, symbolBoundaries } = data;

        for (const sb of symbolBoundaries) {
          const tx = t[sb];
          if (tx >= lo && tx <= hi) {
            drawVLine(ctx, ax, tx, domainY[0], domainY[1], alpha(CHART.dim, 0.22), true, 1);
          }
        }

        drawLine(ctx, ax, t, phaseOrFreq, CHART.pink, 1.5);

        // Derive plain-text y label from LaTeX-like string (just strip backslash commands)
        const yLabel = data.phaseLabel
          .replace(/\\theta/g, 'θ')
          .replace(/\\mathrm\{([^}]+)\}/g, '$1')
          .replace(/\\/g, '')
          .replace(/\s*\(rad\)/g, ' (rad)');

        drawAxisLines(ctx, ax, domainX, domainY, 't (sym)', yLabel, h);
      }}
    />
  );
}

// Eye diagram panel: overlaid 2T folds (no zoom — fixed 2T window)
export function EyePanel({ eyeFolds, sps }: { eyeFolds: number[][]; sps: number }) {
  return (
    <Canvas
      height={160}
      ariaLabel="Eye diagram — I(t) folds over 2-symbol windows"
      draw={(ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        if (eyeFolds.length === 0) return;

        const winLen = 2 * sps;
        const domainX: [number, number] = [0, 2];
        const allVals = eyeFolds.flat();
        const peak = Math.max(...allVals.map(Math.abs), 1e-6);
        const domainY: [number, number] = [-peak * 1.25, peak * 1.25];
        const ax = axesFor(w, h, domainX, domainY);
        drawGrid(ctx, ax, domainX, domainY);

        const tFold = Array.from({ length: winLen }, (_, n) => n / sps);
        const foldColor = alpha(CHART.green, Math.max(0.06, Math.min(0.4, 8 / eyeFolds.length)));

        for (const fold of eyeFolds) {
          drawLine(ctx, ax, tFold, fold, foldColor, 1);
        }

        drawAxisLines(ctx, ax, domainX, domainY, 't (sym)', 'I(t)', h);
      }}
    />
  );
}
