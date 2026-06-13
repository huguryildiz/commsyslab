// src/modules/baseband/panels.tsx
import { Canvas } from '@/lib/plot/Canvas';
import { drawAxes, drawLine, drawVLine, drawText, linScale, drawStems } from '@/lib/plot/draw';
import type { PulseView, ReceiverView, EyeView } from './model';
import type { EyeTrace } from '@/lib/dsp/eye';

const COL_P = 'var(--color-x)';
const COL_H = 'var(--color-h)';
const COL_Y = 'var(--color-y)';
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
        for (let n = -Math.floor(tMax); n <= Math.floor(tMax); n++) {
          drawVLine(ctx, ax, n, -0.4, yMax, 'rgba(154,167,180,0.25)', true, 1);
        }
        drawLine(ctx, ax, view.t, view.p, COL_P, 2);
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

function drawEye(ctx: CanvasRenderingContext2D, w: number, h: number, traces: EyeTrace[], sps: number) {
  const cols = traces[0]?.samples.length ?? 2 * sps;
  const ax = { x: linScale([0, cols - 1], [34, w - 10]), y: linScale([-4, 4], [h - 18, 10]) };
  drawAxes(ctx, ax, [0, cols - 1]);
  const xs = Array.from({ length: cols }, (_, i) => i);
  for (const tr of traces) drawLine(ctx, ax, xs, tr.samples, 'rgba(74,163,255,0.35)', 1);
  drawVLine(ctx, ax, Math.floor(cols / 2), -4, 4, COL_MARK, true, 1.5);
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
        const m = Math.max(1, ...view.eqTaps.map((v) => Math.abs(v))) * 1.2;
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
        const m = Math.max(1, ...view.combined.map((v) => Math.abs(v))) * 1.2;
        const ax = { x: linScale([-0.5, view.combined.length - 0.5], [34, w - 10]), y: linScale([-m, m], [h - 18, 10]) };
        drawAxes(ctx, ax, [-0.5, view.combined.length - 0.5]);
        drawStems(ctx, ax, xs, view.combined, COL_Y, 3);
      }}
    />
  );
}
