import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, gaussian } from './palette';

const POINTS: [number, number][] = [];
for (let i = -3; i <= 3; i += 2) {
  for (let q = -3; q <= 3; q += 2) {
    POINTS.push([i, q]);
  }
}

/** A "received symbol" that falls within a box, fading and disappearing. */
interface RxSymbol {
  i: number;
  q: number;
  ox: number;
  oy: number;
  age: number;
}
const rx: RxSymbol[] = [];
const TTL = 36;

/**
 * Flagship: 16-QAM constellation. Each frame, new "received symbols" with noise
 * fall around ideal points and fade away; ideal points pulse. Noise amplitude
 * breathes (giving the impression E_b/N_0 is changing).
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) / 9;

  // I/Q axes
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.lineTo(cx, h - 6);
  ctx.moveTo(6, cy);
  ctx.lineTo(w - 6, cy);
  ctx.stroke();

  // breathing noise amplitude + spawn new received symbols
  const sigma = 0.2 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.025));
  for (let k = 0; k < 2; k += 1) {
    const p = POINTS[Math.floor(Math.random() * POINTS.length)];
    if (p) rx.push({ i: p[0], q: p[1], ox: gaussian() * sigma, oy: gaussian() * sigma, age: 0 });
  }

  // age received symbols + draw fading
  for (let idx = rx.length - 1; idx >= 0; idx -= 1) {
    const r = rx[idx];
    if (!r) continue;
    r.age += 1;
    if (r.age > TTL) {
      rx.splice(idx, 1);
      continue;
    }
    const a = 1 - r.age / TTL;
    const x = cx + (r.i + r.ox) * s;
    const y = cy - (r.q + r.oy) * s;
    ctx.fillStyle = `rgba(255, 79, 154, ${0.55 * a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.7 + a * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ideal points — pulsing glow
  for (const [i, q] of POINTS) {
    const bx = cx + i * s;
    const by = cy - q * s;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.07 + (i + q) * 0.6);
    ctx.shadowColor = VIZ.green;
    ctx.shadowBlur = 5 + pulse * 8;
    ctx.fillStyle = VIZ.green;
    ctx.beginPath();
    ctx.arc(bx, by, 2.5 + pulse * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
};

export function ConstellationViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
