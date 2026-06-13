import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

/** Sampling: continuous sine + sample-and-hold staircase + sample points. */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.55;
  const amp = h * 0.3;
  const k = 7 / w;
  const ph = t * 0.025;
  const n = 11;

  // sample & hold staircase
  ctx.strokeStyle = 'rgba(255, 140, 66, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const x0 = (w * i) / n;
    const x1 = (w * (i + 1)) / n;
    const y = mid - Math.sin(x0 * k + ph) * amp;
    if (i === 0) ctx.moveTo(x0, y);
    else ctx.lineTo(x0, y);
    ctx.lineTo(Math.min(x1, w), y);
  }
  ctx.stroke();

  // continuous sine
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 2;
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const y = mid - Math.sin(x * k + ph) * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // sample points
  for (let i = 0; i <= n; i += 1) {
    const x = (w * i) / n;
    const y = mid - Math.sin(x * k + ph) * amp;
    ctx.fillStyle = VIZ.blue;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

export function SamplingViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
