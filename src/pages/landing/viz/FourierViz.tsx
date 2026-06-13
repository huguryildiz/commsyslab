/**
 * Landing page ambient visualization for Fourier & Spectrum module.
 * Animated harmonic accumulation: square wave building from sine components.
 * Proakis § 2.1.
 */

import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  // Oscilloscope-style appearance
  ctx.fillStyle = VIZ.screen;
  ctx.fillRect(0, 0, w, h);

  const mid = h * 0.5;
  const amp = h * 0.25;
  const ph = (t % 300) / 300; // animation loop: 0 to 1

  // Number of harmonics grows over the animation loop
  const maxHarmonics = 50;
  const activeHarmonics = Math.floor(1 + ph * (maxHarmonics - 1));

  // Draw harmonic components faintly
  ctx.strokeStyle = alpha(VIZ.green, 0.15);
  ctx.lineWidth = 0.5;
  for (let n = 1; n < activeHarmonics; n += 2) {
    // Only odd harmonics (square wave)
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const frac = x / w;
      const harmonic = ((4 / Math.PI) / n) * Math.sin(2 * Math.PI * n * frac);
      const y = mid - harmonic * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw accumulated sum (main waveform) with glow
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    const frac = x / w;
    let y = 0;
    for (let n = 1; n < activeHarmonics; n += 2) {
      y += ((4 / Math.PI) / n) * Math.sin(2 * Math.PI * n * frac);
    }
    const py = mid - y * amp;
    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw harmonic counter
  ctx.fillStyle = VIZ.dim;
  ctx.font = '12px var(--mono)';
  ctx.textAlign = 'right';
  ctx.fillText(`${activeHarmonics} harmonics`, w - 8, 16);
};

export function FourierViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}

function alpha(hex: string, a: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${a})`;
}
