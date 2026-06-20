import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import type { DpcmResult } from '@/lib/dsp/dpcm';

const COL = {
  signal: '#46c93a', // original signal
  error: '#ffb454', // prediction error (smaller range)
  recon: '#7c8cff', // reconstruction
};

const PAD = { l: 8, r: 8, t: 10, b: 10 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

/** Original signal, prediction error, and reconstruction versus sample index. */
export function DpcmTracePanel({ enc, signal }: { enc: DpcmResult; signal: number[] }) {
  const xs = signal.map((_, i) => i);
  const all = [...signal, ...enc.rawError, ...enc.reconstructed].map(Math.abs);
  const yMax = (all.length ? Math.max(...all) : 1) * 1.1 || 1;
  const xMax = Math.max(signal.length - 1, 1);
  return (
    <Canvas
      height={240}
      ariaLabel="DPCM signal, prediction error and reconstruction"
      deps={[enc, signal]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, xMax], [-yMax, yMax]);
        drawAxes(ctx, ax, [0, xMax]);
        drawLine(ctx, ax, xs, signal, COL.signal, 2);
        drawLine(ctx, ax, xs, enc.rawError, COL.error, 1.5);
        drawLine(ctx, ax, xs, enc.reconstructed, COL.recon, 1.5);
      }}
    />
  );
}
