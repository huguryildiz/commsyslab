import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawAxes,
  drawLine,
  drawStems,
  drawStep,
  drawVLine,
  type Axes,
} from '@/lib/plot/draw';
import { replicaLines, hasAliasing } from '@/lib/dsp/spectrum';
import { levelValues } from '@/lib/dsp/quantize';
import type { SamplingView } from './model';
import type { Tone } from '@/lib/dsp/signals';
import type { QuantizerType } from '@/lib/dsp/quantize';

const COL = {
  analog: '#4aa3ff',
  sample: '#ffb454',
  recon: '#9aa7b4',
  quant: '#46c93a',
  level: 'rgba(154,167,180,0.25)',
  error: '#ff7c7c',
  base: '#4aa3ff',
  replica: 'rgba(154,167,180,0.5)',
  alias: 'rgba(255,92,92,0.22)',
  marker: 'rgba(255,92,92,0.8)',
  cursor: 'rgba(255,180,84,0.9)',
};

const PAD = { l: 8, r: 8, t: 10, b: 10 };

function axesFor(
  w: number,
  h: number,
  domX: [number, number],
  domY: [number, number],
): Axes {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

export interface TimePanelProps {
  view: SamplingView;
  mMax: number;
  showReconstruction: boolean;
  cursorT?: number;
}

export function TimePanel({ view, mMax, showReconstruction, cursorT }: TimePanelProps) {
  const yMax = mMax * 1.15;
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={200}
      ariaLabel="Time domain: analog signal, samples, reconstruction"
      deps={[view, mMax, showReconstruction, cursorT]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, view.analog.t, view.analog.x, COL.analog, 2);
        if (showReconstruction) {
          drawLine(ctx, ax, view.reconstructed.t, view.reconstructed.x, COL.recon, 1.5, true);
        }
        drawStems(ctx, ax, view.samples.t, view.samples.x, COL.sample, 3);
        if (cursorT != null) drawVLine(ctx, ax, cursorT, -yMax, yMax, COL.cursor, false, 1.5);
      }}
    />
  );
}

export interface SpectrumPanelProps {
  tones: Tone[];
  fs: number;
}

export function SpectrumPanel({ tones, fs }: SpectrumPanelProps) {
  const lines = replicaLines(tones, fs, 2);
  const W = tones.reduce((m, t) => Math.max(m, Math.abs(t.freq)), 0);
  const aliasing = hasAliasing(tones, fs);
  const fMax = Math.max(fs * 1.6, W * 1.4, 1);
  const magMax = lines.reduce((m, l) => Math.max(m, l.mag), 0.5) * 1.25;
  return (
    <Canvas
      height={200}
      ariaLabel="Frequency domain: spectral replicas and aliasing"
      deps={[tones, fs]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-fMax, fMax], [0, magMax]);
        drawAxes(ctx, ax, [-fMax, fMax]);
        if (aliasing) {
          const lo = fs - W;
          ctx.fillStyle = COL.alias;
          const x0 = ax.x(lo);
          const x1 = ax.x(W);
          ctx.fillRect(Math.min(x0, x1), PAD.t, Math.abs(x1 - x0), h - PAD.t - PAD.b);
          const mx0 = ax.x(-W);
          const mx1 = ax.x(-lo);
          ctx.fillRect(Math.min(mx0, mx1), PAD.t, Math.abs(mx1 - mx0), h - PAD.t - PAD.b);
        }
        for (const l of lines) {
          const isBase = Math.abs(l.freq) <= W + 1e-9;
          drawStems(ctx, ax, [l.freq], [l.mag], isBase ? COL.base : COL.replica, 2.5);
        }
        drawVLine(ctx, ax, fs / 2, 0, magMax, COL.marker, true, 1);
        drawVLine(ctx, ax, -fs / 2, 0, magMax, COL.marker, true, 1);
      }}
    />
  );
}

export interface QuantPanelProps {
  view: SamplingView;
  mMax: number;
  bits: number;
  type: QuantizerType;
}

export function QuantPanel({ view, mMax, bits, type }: QuantPanelProps) {
  const yMax = mMax * 1.15;
  const levels = levelValues(mMax, bits, type);
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={200}
      ariaLabel="Quantization: signal, staircase, and levels"
      deps={[view, mMax, bits, type]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        for (const lv of levels) drawLine(ctx, ax, [t0, t1], [lv, lv], COL.level, 1);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, view.analog.t, view.analog.x, COL.analog, 1.5);
        drawStep(ctx, ax, view.quantized.t, view.quantized.x, COL.quant, 2);
      }}
    />
  );
}

export interface ErrorPanelProps {
  view: SamplingView;
  delta: number;
}

export function ErrorPanel({ view, delta }: ErrorPanelProps) {
  const yMax = (delta / 2) * 1.4 || 1;
  const t0 = view.analog.t[0];
  const t1 = view.analog.t[view.analog.t.length - 1];
  return (
    <Canvas
      height={130}
      ariaLabel="Quantization error per sample"
      deps={[view, delta]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        drawLine(ctx, ax, [t0, t1], [delta / 2, delta / 2], COL.level, 1);
        drawLine(ctx, ax, [t0, t1], [-delta / 2, -delta / 2], COL.level, 1);
        drawAxes(ctx, ax, [t0, t1]);
        drawStems(ctx, ax, view.error.t, view.error.e, COL.error, 2.5);
      }}
    />
  );
}
