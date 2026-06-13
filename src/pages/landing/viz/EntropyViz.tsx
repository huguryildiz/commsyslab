import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const BASE = [0.34, 0.22, 0.16, 0.12, 0.09, 0.07];

/** Information Theory: probability / entropy bars (lightly animated). */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const gap = 7;
  const n = BASE.length;
  const bw = (w - gap * (n + 1)) / n;
  const r = 3;

  BASE.forEach((p0, i) => {
    const p = p0 * (1 + 0.18 * Math.sin(t * 0.03 + i));
    const bh = (h - 10) * Math.min(p * 2.4, 1);
    const x = gap + i * (bw + gap);
    const y = h - bh - 4;
    const g = ctx.createLinearGradient(0, y, 0, h);
    g.addColorStop(0, VIZ.green);
    g.addColorStop(1, 'rgba(123, 140, 255, 0.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, h - 4);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + bw - r, y);
    ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
    ctx.lineTo(x + bw, h - 4);
    ctx.closePath();
    ctx.fill();
  });
};

export function EntropyViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
