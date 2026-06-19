// Proakis §7.4.2 — Differential PCM. Book Eq. 7.4.10–7.4.14 (no CCSM script).
// Closed feedback loop: the encoder predicts from reconstructed past samples so the
// decoder, running the identical recursion, stays in lock-step.
import { quantize } from './quantize';

export interface DpcmResult {
  predError: number[]; // quantized prediction error ŷ_n (transmitted)
  rawError: number[]; // unquantized prediction error y_n (for gain/plots)
  reconstructed: number[]; // x̂_n
}

export function dpcmEncode(
  signal: number[],
  coeffs: number[],
  bits: number,
  mMax: number,
): DpcmResult {
  const predError: number[] = [];
  const rawError: number[] = [];
  const reconstructed: number[] = []; // x̂ history

  for (let n = 0; n < signal.length; n++) {
    let pred = 0;
    for (let k = 0; k < coeffs.length; k++) {
      pred += coeffs[k] * (reconstructed[n - 1 - k] ?? 0);
    }
    const e = signal[n] - pred; // y_n (Eq. 7.4.10)
    const eq = quantize(e, mMax, bits, 'midrise'); // ŷ_n
    const xhat = pred + eq; // x̂_n (Eq. 7.4.11)
    rawError.push(e);
    predError.push(eq);
    reconstructed.push(xhat);
  }
  return { predError, rawError, reconstructed };
}

export function dpcmDecode(predError: number[], coeffs: number[]): number[] {
  const reconstructed: number[] = [];
  for (let n = 0; n < predError.length; n++) {
    let pred = 0;
    for (let k = 0; k < coeffs.length; k++) {
      pred += coeffs[k] * (reconstructed[n - 1 - k] ?? 0);
    }
    reconstructed.push(pred + predError[n]);
  }
  return reconstructed;
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  let s = 0;
  for (const x of xs) s += (x - mean) * (x - mean);
  return s / xs.length;
}

/** Prediction gain G_p = 10 log10( var(signal) / var(prediction error) ) in dB. */
export function predictionGainDb(signal: number[], rawError: number[]): number {
  const vE = variance(rawError);
  return vE === 0 ? Infinity : 10 * Math.log10(variance(signal) / vE);
}
