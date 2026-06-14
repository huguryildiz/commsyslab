import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const TAU = Math.PI * 2;

function amEnvelope(x: number, frame: number, width: number): number {
  const u = x / Math.max(1, width);
  const messagePhase = frame * 0.018;
  const message = Math.sin(u * TAU * 1.18 - messagePhase);
  return 0.58 + 0.36 * message;
}

function amCarrier(x: number, frame: number, width: number): number {
  const u = x / Math.max(1, width);
  const carrierPhase = frame * 0.38;
  return Math.sin(u * TAU * 17.5 - carrierPhase);
}

/**
 * AM/FM visualization: a moving AM carrier constrained by its envelope.
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const mid = h * 0.5;
  const scale = h * 0.31;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Draw AM envelope rails.
  ctx.strokeStyle = VIZ.orange;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(255, 140, 66, 0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = mid - amEnvelope(x, t, w) * scale;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = mid + amEnvelope(x, t, w) * scale;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw the AM waveform: carrier amplitude follows the envelope.
  ctx.strokeStyle = VIZ.blue;
  ctx.lineWidth = 1.65;
  ctx.shadowColor = 'rgba(123, 140, 255, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    const y = mid - amEnvelope(x, t, w) * amCarrier(x, t, w) * scale;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Highlight a few moving envelope samples without changing the tile theme.
  ctx.fillStyle = VIZ.pink;
  const markerStep = w / 10;
  const markerOffset = (t * 1.7) % markerStep;
  for (let x = -markerStep + markerOffset; x <= w + markerStep; x += markerStep) {
    const y = mid - amEnvelope(x, t, w) * scale;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, TAU);
    ctx.fill();
  }
};

export function AmFmViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
