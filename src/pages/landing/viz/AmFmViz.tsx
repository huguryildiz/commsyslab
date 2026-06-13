import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

/**
 * AM/FM visualization: sinusoidal message fills a carrier frequency,
 * showing an AM envelope with a fast FM carrier underneath.
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const mid = h * 0.5;
  const amEnvAmp = h * 0.15; // AM envelope amplitude
  const carrierAmp = h * 0.08; // Carrier oscillation within envelope
  const msgPhase = t * 0.02; // Message frequency
  const carrierPhase = t * 0.15; // Carrier frequency (much faster)

  const kMsg = 4 / w; // Message wavenumber
  const kCarrier = 80 / w; // Carrier wavenumber

  // Draw AM envelope (slow modulation in orange)
  ctx.strokeStyle = VIZ.orange;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(255, 140, 66, 0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const envY = amEnvAmp * Math.sin(x * kMsg + msgPhase);
    const y = mid + envY;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Negative envelope
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const envY = amEnvAmp * Math.sin(x * kMsg + msgPhase);
    const y = mid - envY;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw modulated carrier wave (fast oscillation in blue within envelope)
  ctx.strokeStyle = VIZ.blue;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(123, 140, 255, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    const envY = amEnvAmp * Math.sin(x * kMsg + msgPhase);
    const carrierY = carrierAmp * Math.sin(x * kCarrier + carrierPhase);
    const y = mid + envY + carrierY;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Highlight the envelope samples (carrier peaks)
  ctx.fillStyle = VIZ.pink;
  for (let x = 0; x <= w; x += w / 12) {
    const envY = amEnvAmp * Math.sin(x * kMsg + msgPhase);
    ctx.beginPath();
    ctx.arc(x, mid + envY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

export function AmFmViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
