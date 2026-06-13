import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, gaussian } from './palette';
import { advanceNoiseTrace, makeNoiseTrace } from './noiseTrace';

/** Visible sample columns across the canvas width (noise texture density). */
const VISIBLE = 120;
/** Advance the ensemble one sample every N frames (scroll speed; lower = faster). */
const FRAMES_PER_STEP = 2;

/** One realization of the random process: a scrolling Gaussian-noise trace. */
interface Lane {
  buf: number[];
  color: string;
  alpha: number;
  width: number;
  glow: number;
  /** Vertical amplitude per unit std-dev, as a fraction of canvas height. */
  scale: number;
}

// Exactly one NoiseViz renders on the landing page, so module-scope buffers are
// safe (see docs/superpowers/specs/2026-06-14-random-process-noise-viz-design.md).
let lanes: Lane[] | null = null;
let lastFrame = -1;

function ensureLanes(): Lane[] {
  if (!lanes) {
    lanes = [
      { buf: makeNoiseTrace(VISIBLE + 2, gaussian), color: VIZ.green, alpha: 0.95, width: 1.8, glow: 6, scale: 0.1 },
      { buf: makeNoiseTrace(VISIBLE + 2, gaussian), color: VIZ.blue, alpha: 0.5, width: 1.2, glow: 0, scale: 0.13 },
      { buf: makeNoiseTrace(VISIBLE + 2, gaussian), color: VIZ.orange, alpha: 0.38, width: 1.2, glow: 0, scale: 0.16 },
    ];
  }
  return lanes;
}

/** Random Processes: an ensemble of scrolling Gaussian sample functions. */
const draw: DrawFn = (ctx, t, w, h) => {
  const ls = ensureLanes();

  // Advance one sample per FRAMES_PER_STEP, but only on genuinely new frames —
  // resize/initial repaints reuse the same `t` and must not double-advance.
  if (t !== lastFrame) {
    if (t % FRAMES_PER_STEP === 0) {
      for (let i = 0; i < ls.length; i += 1) advanceNoiseTrace(ls[i].buf, gaussian);
    }
    lastFrame = t;
  }
  // Fractional slide between sample pushes → smooth sub-pixel scroll.
  const phase = (t % FRAMES_PER_STEP) / FRAMES_PER_STEP;

  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const step = w / VISIBLE;

  // Ensemble-mean baseline: E[X(t)] ≈ 0.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Draw back-to-front so the bright green realization lands on top.
  for (let li = ls.length - 1; li >= 0; li -= 1) {
    const lane = ls[li];
    const amp = lane.scale * h;
    ctx.globalAlpha = lane.alpha;
    ctx.strokeStyle = lane.color;
    ctx.lineWidth = lane.width;
    ctx.shadowColor = lane.color;
    ctx.shadowBlur = lane.glow;
    ctx.beginPath();
    for (let i = 0; i < lane.buf.length; i += 1) {
      // Shift left by `phase` of a step so the trace slides smoothly; index 0
      // sits just off the left edge, the newest sample just past the right.
      const x = (i - 1 - phase) * step;
      let y = mid - lane.buf[i] * amp;
      if (y < 2) y = 2;
      else if (y > h - 2) y = h - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

export function NoiseViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
