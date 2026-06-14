import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const TAU = Math.PI * 2;
/** Message cycles shown across the panel. */
const MSG_CYCLES = 1.5;
/** FM mean carrier cycles across the full-width panel. */
const FM_CARRIER_CYCLES = 18;
/** FM modulation index β (depth of the frequency swing). */
const FM_MOD_INDEX = 4.5;
/** FM constant-envelope amplitude. */
const FM_ENV = 0.82;

/**
 * FM landing viz: a constant-envelope carrier whose frequency swings with the
 * message (Proakis & Salehi, Ch 4 — Angle Modulation).
 */
const draw: DrawFn = (ctx, frame, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const scale = h * 0.31;
  const PAD = 7;
  const inner = w - 2 * PAD;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Zero-mean baseline.
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Flat envelope rails — FM is a constant-envelope modulation; dashed + faded.
  ctx.strokeStyle = VIZ.orange;
  ctx.lineWidth = 1.75;
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([5, 5]);
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(PAD, mid + sign * FM_ENV * scale);
    ctx.lineTo(PAD + inner, mid + sign * FM_ENV * scale);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Frequency-swinging carrier — instantaneous phase carries ∫m(t).
  ctx.strokeStyle = VIZ.blue;
  ctx.lineWidth = 1.65;
  ctx.shadowColor = 'rgba(123, 140, 255, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let lx = 0; lx <= inner; lx += 1) {
    const u = lx / inner;
    const integ = -Math.cos(u * TAU * MSG_CYCLES - frame * 0.018);
    const arg = u * TAU * FM_CARRIER_CYCLES - frame * 0.34 + FM_MOD_INDEX * integ;
    const value = FM_ENV * Math.sin(arg);
    const x = PAD + lx;
    const y = mid - value * scale;
    if (lx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
};

export function FmViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
