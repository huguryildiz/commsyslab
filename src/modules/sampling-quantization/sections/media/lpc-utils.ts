// LPC section utility functions (non-component exports, kept separate for React fast-refresh).
import { fft } from '@/lib/dsp/fft';

/**
 * Compute a one-sided magnitude spectrum in dB from a real frame.
 * Returns freqHz and magDb arrays over [0, fs/2].
 */
export function frameSpectrum(
  frame: number[],
  fs: number,
): { freqHz: number[]; magDb: number[] } {
  const N = frame.length;
  if (N === 0) return { freqHz: [], magDb: [] };
  const X = fft(frame); // already 1/N-normalized (see fft.ts)
  // Positive frequencies: bins 0..floor(N/2)
  const half = Math.floor(N / 2) + 1;
  const freqHz: number[] = [];
  const magDb: number[] = [];
  for (let k = 0; k < half; k++) {
    const mag = Math.hypot(X[k].re, X[k].im);
    freqHz.push((k * fs) / N);
    magDb.push(20 * Math.log10(Math.max(mag, 1e-9)));
  }
  // Display normalization: shift so the spectral peak sits at 0 dB. Absolute level
  // is arbitrary here; this lets the LPC envelope (also peak-normalized) overlay
  // cleanly on the formant peaks.
  const peak = Math.max(...magDb);
  if (Number.isFinite(peak)) for (let k = 0; k < magDb.length; k++) magDb[k] -= peak;
  return { freqHz, magDb };
}
