import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawStep, type Axes } from '@/lib/plot/draw';

const PAD = { l: 8, r: 8, t: 10, b: 10 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

/** Adaptive-DM step size Δ_n versus time (grows on slope overload, shrinks on hunting). */
export function StepTrackingPanel({ steps, times }: { steps: number[]; times: number[] }) {
  const t0 = times[0] ?? 0;
  const t1 = times[times.length - 1] ?? 1;
  const yMax = (steps.length ? Math.max(...steps) : 1) * 1.1 || 1;
  return (
    <Canvas
      height={160}
      ariaLabel="Adaptive DM step size over time"
      deps={[steps, times]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [0, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawStep(ctx, ax, times, steps, '#ffb454', 2);
      }}
    />
  );
}
