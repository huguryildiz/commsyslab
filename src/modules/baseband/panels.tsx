// src/modules/baseband/panels.tsx
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  logScale,
  drawAxes,
  drawLine,
  drawVLine,
  drawText,
  drawStems,
  type Axes,
} from '@/lib/plot/draw';
import { useZoom } from '@/lib/plot/useZoom';
import { CHART, alpha } from '@/lib/plot/colors';
import type {
  PulseView,
  ReceiverView,
  EyeView,
  PartialResponseView,
  PrDetectionView,
  PsdView,
  DistortionView,
} from './model';
import type { EyeTrace } from '@/lib/dsp/eye';

const COL_P = CHART.green; // p(t) / input
const COL_H = CHART.orange; // system / matched filter
const COL_Y = CHART.blue; // output / spectrum
const COL_MARK = CHART.pink; // cursor / marker

// Room for tick labels + LaTeX axis labels (y-label at left−34, x-label at bottom+30).
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

/** Compact on-canvas legend, drawn top-right inside the plot area. */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  items: { color: string; label: string }[],
): void {
  ctx.save();
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let maxW = 0;
  for (const it of items) maxW = Math.max(maxW, ctx.measureText(it.label).width);
  const x = w - PAD.r - (26 + maxW);
  let y = PAD.t + 8;
  for (const it of items) {
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18, y);
    ctx.stroke();
    ctx.fillStyle = CHART.dim;
    ctx.fillText(it.label, x + 24, y);
    y += 15;
  }
  ctx.restore();
}

export function PulseTimePanel({ view }: { view: PulseView }) {
  const tMax = view.t[view.t.length - 1] || 5;
  const [lo, hi, onWheel, , onPan] = useZoom(-tMax, tMax, { minSpan: 1, maxSpan: tMax * 2 });
  const yMax = 1.2;
  return (
    <Canvas
      height={220}
      ariaLabel="Pulse p(t) with zero crossings at integer symbol times"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-0.4, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T$', yLabel: '$p(t)$' });
        for (let n = Math.ceil(lo); n <= Math.floor(hi); n++) {
          drawVLine(ctx, ax, n, -0.4, yMax, alpha(CHART.dim, 0.35), true, 1);
        }
        drawLine(ctx, ax, view.t, view.p, COL_P, 2);
      }}
    />
  );
}

export function SpectrumPanel({ view }: { view: PulseView }) {
  const [lo, hi, onWheel, , onPan] = useZoom(-1, 1, { minSpan: 0.25, maxSpan: 2 });
  return (
    <Canvas
      height={200}
      ariaLabel="Raised cosine spectrum with bandwidth and Nyquist markers"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [0, 1.15]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$|X(f)|$' });
        drawLine(ctx, ax, view.freqs, view.spectrum, COL_Y, 2);
        drawVLine(ctx, ax, view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, -view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, view.nyquist, 0, 1.15, alpha(CHART.dim, 0.6), true, 1);
        drawVLine(ctx, ax, -view.nyquist, 0, 1.15, alpha(CHART.dim, 0.6), true, 1);
        drawText(ctx, ax, view.bandwidth, 1.05, 'W', COL_H, 4, -4);
        drawText(ctx, ax, view.nyquist, 0.5, '1/2T', CHART.dim, 4, -4);
      }}
    />
  );
}

export function MatchedFilterPanel({ view }: { view: ReceiverView }) {
  const tMax = view.t[view.t.length - 1] || 4;
  const [lo, hi, onWheel, , onPan] = useZoom(-tMax, tMax, { minSpan: 1, maxSpan: tMax * 2 });
  return (
    <Canvas
      height={200}
      ariaLabel="Transmit pulse and its matched filter"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-0.5, 1.2]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T$', yLabel: '$amplitude$' });
        drawLine(ctx, ax, view.t, view.pulse, COL_P, 2);
        drawLine(ctx, ax, view.t, view.matched, COL_H, 2, true);
        drawLegend(ctx, w, [
          { color: COL_P, label: 'p(t)' },
          { color: COL_H, label: 'h(t)=p(T−t)' },
        ]);
      }}
    />
  );
}

export function MfOutputPanel({ view }: { view: ReceiverView }) {
  const n = view.mfOutput.length;
  const [lo, hi, onWheel, , onPan] = useZoom(0, n - 1, { minSpan: 8, maxSpan: n - 1, clampMin: 0 });
  return (
    <Canvas
      height={200}
      ariaLabel="Matched filter output peaking to the pulse energy at t equals T"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...view.mfOutput) * 1.15;
        const xs = view.mfOutput.map((_, i) => i);
        const ax = axesFor(w, h, [lo, hi], [-yMax * 0.3, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n\\,(\\mathrm{sample})$', yLabel: '$y_n$' });
        drawLine(ctx, ax, xs, view.mfOutput, COL_Y, 2);
        drawVLine(ctx, ax, view.mfPeakIndex, -yMax * 0.3, yMax, COL_MARK, false, 1.5);
        drawText(ctx, ax, view.mfPeakIndex, view.energy, `E=${view.energy.toFixed(2)}`, COL_MARK, 6, -6);
      }}
    />
  );
}

export function RrcSplitPanel({ view }: { view: ReceiverView }) {
  const c = view.rrcCascade;
  const n = c.length;
  const [lo, hi, onWheel, , onPan] = useZoom(0, n - 1, { minSpan: 8, maxSpan: n - 1, clampMin: 0 });
  return (
    <Canvas
      height={180}
      ariaLabel="Two root raised cosine pulses convolve to a zero ISI raised cosine"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const peak = Math.max(...c);
        const xs = c.map((_, i) => i);
        const ax = axesFor(w, h, [lo, hi], [-peak * 0.3, peak * 1.1]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n\\,(\\mathrm{sample})$', yLabel: '$(p\\star p)_n$' });
        drawLine(ctx, ax, xs, c, COL_Y, 2);
      }}
    />
  );
}

export function EyePanel({ traces, sps, label }: { traces: EyeTrace[]; sps: number; label: string }) {
  const cols = traces[0]?.samples.length ?? 2 * sps;
  const [lo, hi, onWheel, , onPan] = useZoom(0, cols - 1, {
    minSpan: sps / 2,
    maxSpan: cols - 1,
    clampMin: 0,
    clampMax: cols - 1,
  });
  return (
    <Canvas
      height={220}
      ariaLabel={label}
      deps={[traces, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-4, 4]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T$', yLabel: '$y(t)$' });
        const xs = Array.from({ length: cols }, (_, i) => i);
        for (const tr of traces) drawLine(ctx, ax, xs, tr.samples, alpha(COL_Y, 0.35), 1);
        drawVLine(ctx, ax, Math.floor(cols / 2), -4, 4, COL_MARK, true, 1.5);
      }}
    />
  );
}

export function TapStemPanel({ view }: { view: EyeView }) {
  const n = view.eqTaps.length;
  const [lo, hi, onWheel, , onPan] = useZoom(-0.5, n - 0.5, { minSpan: 2, maxSpan: n });
  return (
    <Canvas
      height={170}
      ariaLabel="Equalizer tap weights"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const xs = view.eqTaps.map((_, i) => i);
        const m = Math.max(1, ...view.eqTaps.map((v) => Math.abs(v))) * 1.2;
        const ax = axesFor(w, h, [lo, hi], [-m, m]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$w_n$' });
        drawStems(ctx, ax, xs, view.eqTaps, COL_H, 3);
      }}
    />
  );
}

export function CombinedPanel({ view }: { view: EyeView }) {
  const n = view.combined.length;
  const [lo, hi, onWheel, , onPan] = useZoom(-0.5, n - 0.5, { minSpan: 2, maxSpan: n });
  return (
    <Canvas
      height={170}
      ariaLabel="Combined channel and equalizer response approaches an impulse"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const xs = view.combined.map((_, i) => i);
        const m = Math.max(1, ...view.combined.map((v) => Math.abs(v))) * 1.2;
        const ax = axesFor(w, h, [lo, hi], [-m, m]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n$', yLabel: '$(c\\star w)_n$' });
        drawStems(ctx, ax, xs, view.combined, COL_Y, 3);
      }}
    />
  );
}

// ── §10.3.2 Partial-response panels ─────────────────────────────────────────

export function PrPulsePanel({ view }: { view: PartialResponseView }) {
  const tMax = view.t[view.t.length - 1] || 4;
  const [lo, hi, onWheel, , onPan] = useZoom(-tMax, tMax, { minSpan: 2, maxSpan: tMax * 2 });
  return (
    <Canvas
      height={220}
      ariaLabel="Partial-response pulse compared to a full-response raised cosine"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-0.4, 1.2]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T$', yLabel: '$x(t)$' });
        for (let n = Math.ceil(lo); n <= Math.floor(hi); n++) {
          drawVLine(ctx, ax, n, -0.4, 1.2, alpha(CHART.dim, 0.3), true, 1);
        }
        drawLine(ctx, ax, view.t, view.rc, alpha(CHART.dim, 0.7), 1.5, true);
        drawLine(ctx, ax, view.t, view.pulse, COL_P, 2);
        drawLegend(ctx, w, [
          { color: COL_P, label: 'PR pulse' },
          { color: alpha(CHART.dim, 0.7), label: 'raised cosine' },
        ]);
      }}
    />
  );
}

export function PrSpectrumPanel({ view }: { view: PartialResponseView }) {
  const [lo, hi, onWheel, , onPan] = useZoom(-1, 1, { minSpan: 0.25, maxSpan: 2 });
  return (
    <Canvas
      height={200}
      ariaLabel="Partial-response magnitude spectrum"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(0.5, ...view.spectrum) * 1.15;
        const ax = axesFor(w, h, [lo, hi], [0, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$|X(f)|$' });
        drawLine(ctx, ax, view.freqs, view.spectrum, COL_Y, 2);
        if (view.dcNull) {
          drawVLine(ctx, ax, 0, 0, yMax, COL_MARK, true, 1.5);
          drawText(ctx, ax, 0, yMax * 0.5, 'DC null', COL_MARK, 6, 0);
        }
      }}
    />
  );
}

// ── §10.4 PR detection panels ───────────────────────────────────────────────

export function PrBerPanel({ view }: { view: PrDetectionView }) {
  const { ebN0dB, zeroIsi, symbolBySymbol, mlsd } = view.ber;
  const xLo = ebN0dB[0];
  const xHi = ebN0dB[ebN0dB.length - 1];
  const [lo, hi, onWheel, , onPan] = useZoom(xLo, xHi, { minSpan: 2, maxSpan: xHi - xLo });
  const clamp = (ys: number[]) => ys.map((y) => Math.max(1e-6, y));
  return (
    <Canvas
      height={240}
      ariaLabel="Bit-error rate: zero-ISI, symbol-by-symbol, and ML sequence detection"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([lo, hi], [PAD.l, w - PAD.r]),
          y: logScale([1e-6, 1], [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$E_b/N_0\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, ebN0dB, clamp(zeroIsi), COL_P, 2);
        drawLine(ctx, ax, ebN0dB, clamp(mlsd), COL_Y, 2);
        drawLine(ctx, ax, ebN0dB, clamp(symbolBySymbol), COL_H, 2);
        drawLegend(ctx, w, [
          { color: COL_P, label: 'zero-ISI' },
          { color: COL_Y, label: 'MLSD (≈0.34 dB)' },
          { color: COL_H, label: 'symbol-by-symbol (≈2.1 dB)' },
        ]);
      }}
    />
  );
}

// ── §10.2 Power-spectrum panels ─────────────────────────────────────────────

export function SvPanel({ view }: { view: PsdView }) {
  const fMax = view.freqs[view.freqs.length - 1] || 2.5;
  const [lo, hi, onWheel, , onPan] = useZoom(-fMax, fMax, { minSpan: 1, maxSpan: fMax * 2 });
  return (
    <Canvas
      height={220}
      ariaLabel="Power spectrum S_v(f): continuous part and discrete spectral lines"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const contMax = Math.max(0.01, ...view.svContinuous);
        const lineMax = view.svLines.reduce((m, l) => Math.max(m, l.weight), 0);
        const yMax = Math.max(contMax, lineMax) * 1.2;
        const ax = axesFor(w, h, [lo, hi], [0, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$S_v(f)$' });
        drawLine(ctx, ax, view.freqs, view.svContinuous, COL_Y, 2);
        if (view.svLines.length) {
          drawStems(
            ctx,
            ax,
            view.svLines.map((l) => l.f),
            view.svLines.map((l) => l.weight),
            COL_MARK,
            3,
          );
        }
        drawLegend(ctx, w, [
          { color: COL_Y, label: 'continuous' },
          { color: COL_MARK, label: 'spectral lines' },
        ]);
      }}
    />
  );
}

export function SaPanel({ view }: { view: PsdView }) {
  const fMax = view.freqs[view.freqs.length - 1] || 2.5;
  const [lo, hi, onWheel, , onPan] = useZoom(-fMax, fMax, { minSpan: 1, maxSpan: fMax * 2 });
  return (
    <Canvas
      height={180}
      ariaLabel="Information-sequence power spectrum S_a(f)"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(0.5, ...view.sa) * 1.2;
        const ax = axesFor(w, h, [lo, hi], [0, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$S_a(f)$' });
        drawLine(ctx, ax, view.freqs, view.sa, COL_P, 2);
      }}
    />
  );
}

// 2-state partial-response trellis with the Viterbi survivor path highlighted.
export function PrTrellisPanel({ view }: { view: PrDetectionView }) {
  const survivor = view.survivor.slice(0, 8); // first stages for legibility
  return (
    <Canvas
      height={180}
      ariaLabel="Two-state partial-response trellis with the survivor path"
      deps={[view]}
      draw={(ctx, w, h) => {
        const stages = survivor.length;
        const x0 = PAD.l;
        const x1 = w - PAD.r;
        const dx = stages > 1 ? (x1 - x0) / (stages - 1) : 0;
        const yTop = PAD.t + 20; // state +1
        const yBot = h - PAD.b; // state −1
        const xOf = (k: number) => x0 + k * dx;
        const yOf = (s: number) => (s > 0 ? yTop : yBot);
        // Faint full trellis: from each state at stage k to both states at k+1.
        ctx.strokeStyle = alpha(CHART.dim, 0.3);
        ctx.lineWidth = 1;
        for (let k = 0; k < stages - 1; k++) {
          for (const s of [-1, 1]) {
            for (const q of [-1, 1]) {
              ctx.beginPath();
              ctx.moveTo(xOf(k), yOf(s));
              ctx.lineTo(xOf(k + 1), yOf(q));
              ctx.stroke();
            }
          }
        }
        // Survivor path (bold accent).
        ctx.strokeStyle = COL_P;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k < stages; k++) {
          const x = xOf(k);
          const y = yOf(survivor[k]);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // State nodes + labels.
        ctx.fillStyle = CHART.text;
        ctx.font = '11px ui-monospace, Menlo, monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText('a=+1', x0 - 6, yTop);
        ctx.fillText('a=−1', x0 - 6, yBot);
        for (let k = 0; k < stages; k++) {
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.fillStyle = survivor[k] === s ? COL_P : alpha(CHART.dim, 0.6);
            ctx.arc(xOf(k), yOf(s), 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }}
    />
  );
}

// ── §10.5 Channel distortion panels ─────────────────────────────────────────

export function ChannelPanel({ view }: { view: DistortionView }) {
  const fMax = view.freqs[view.freqs.length - 1] || 0.5;
  const [lo, hi, onWheel, , onPan] = useZoom(-fMax, fMax, { minSpan: 0.2, maxSpan: fMax * 2 });
  return (
    <Canvas
      height={210}
      ariaLabel="Channel magnitude, phase, and the designed transmit filter"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax =
          Math.max(1.2, ...view.mag, ...view.phase.map(Math.abs), ...view.gT) * 1.15;
        const ax = axesFor(w, h, [lo, hi], [0, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$|C(f)|,\\ \\theta_c(f)$' });
        drawLine(ctx, ax, view.freqs, view.mag, COL_P, 2);
        drawLine(ctx, ax, view.freqs, view.phase.map(Math.abs), COL_H, 1.8, true);
        drawLine(ctx, ax, view.freqs, view.gT, COL_Y, 1.8);
        drawLegend(ctx, w, [
          { color: COL_P, label: '|C(f)|' },
          { color: COL_H, label: '|θ_c(f)|' },
          { color: COL_Y, label: '|G_T(f)|' },
        ]);
      }}
    />
  );
}

export function EnvelopeDelayPanel({ view }: { view: DistortionView }) {
  const fMax = view.freqs[view.freqs.length - 1] || 0.5;
  const [lo, hi, onWheel, , onPan] = useZoom(-fMax, fMax, { minSpan: 0.2, maxSpan: fMax * 2 });
  return (
    <Canvas
      height={180}
      ariaLabel="Envelope (group) delay of the channel"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const m = Math.max(0.1, ...view.tau.map(Math.abs)) * 1.3;
        const ax = axesFor(w, h, [lo, hi], [-m, m]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(1/T)$', yLabel: '$\\tau(f)$' });
        drawLine(ctx, ax, view.freqs, view.tau, CHART.cyan, 2);
      }}
    />
  );
}

export function DistortedPulsePanel({ view }: { view: DistortionView }) {
  const tMax = view.t[view.t.length - 1] || 4;
  const [lo, hi, onWheel, , onPan] = useZoom(-tMax, tMax, { minSpan: 1, maxSpan: tMax * 2 });
  return (
    <Canvas
      height={210}
      ariaLabel="Clean raised-cosine pulse versus the channel-distorted pulse"
      deps={[view, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMin = Math.min(-0.4, ...view.distorted);
        const yMax = Math.max(1.2, ...view.distorted) * 1.1;
        const ax = axesFor(w, h, [lo, hi], [yMin, yMax]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T$', yLabel: '$x(t)$' });
        for (let n = Math.ceil(lo); n <= Math.floor(hi); n++) {
          drawVLine(ctx, ax, n, yMin, yMax, alpha(CHART.dim, 0.3), true, 1);
        }
        drawLine(ctx, ax, view.t, view.cleanPulse, alpha(CHART.dim, 0.8), 1.5, true);
        drawLine(ctx, ax, view.t, view.distorted, COL_P, 2);
        drawLegend(ctx, w, [
          { color: alpha(CHART.dim, 0.8), label: 'clean RC' },
          { color: COL_P, label: 'distorted' },
        ]);
      }}
    />
  );
}
