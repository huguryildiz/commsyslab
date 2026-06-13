import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

/** End-to-End (soon): an envelope-modulated fading pulse — the entire chain's heartbeat. */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = VIZ.dim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const d = (x - w * 0.5) / (w * 0.22);
    const env = Math.exp(-(d * d));
    const y = h / 2 - Math.sin(x * 0.09 + t * 0.04) * h * 0.3 * env;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

export function LinkPulseViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
