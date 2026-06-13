import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

/** Hero oscilloscope: graticule + sample stems + noisy trace + scan line. */
const draw: DrawFn = (ctx, t, w, h) => {
  // phosphor persistence (fading trace over panel's dark --scope-bg background)
  ctx.fillStyle = VIZ.trail;
  ctx.fillRect(0, 0, w, h);

  // graticule
  ctx.strokeStyle = VIZ.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gx = w / 12;
  const gy = h / 6;
  for (let i = 1; i < 12; i += 1) {
    ctx.moveTo(i * gx, 0);
    ctx.lineTo(i * gx, h);
  }
  for (let j = 1; j < 6; j += 1) {
    ctx.moveTo(0, j * gy);
    ctx.lineTo(w, j * gy);
  }
  ctx.stroke();
  ctx.strokeStyle = VIZ.gridStrong;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const mid = h / 2;
  const amp = h * 0.27;
  const k = 6.2 / w;
  const ph = t * 0.03;

  // sample stems
  const n = 18;
  for (let i = 0; i <= n; i += 1) {
    const x = (w * i) / n;
    const y = mid - Math.sin(x * k + ph) * amp;
    ctx.strokeStyle = 'rgba(123, 140, 255, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, mid);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = VIZ.blue;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // continuous noisy trace
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 9;
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const y = mid - Math.sin(x * k + ph) * amp + (Math.random() * 2 - 1) * 3.2;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // scan line
  const sx = (t * 3) % w;
  const grd = ctx.createLinearGradient(sx - 40, 0, sx, 0);
  grd.addColorStop(0, 'rgba(57, 255, 133, 0)');
  grd.addColorStop(1, 'rgba(57, 255, 133, 0.32)');
  ctx.fillStyle = grd;
  ctx.fillRect(sx - 40, 0, 40, h);
  ctx.strokeStyle = 'rgba(57, 255, 133, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, h);
  ctx.stroke();
};

export function Oscilloscope() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
