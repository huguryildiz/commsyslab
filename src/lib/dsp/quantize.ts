import { clamp } from './math';

export type QuantizerType = 'midrise' | 'midtread';

/** Number of representation levels L = 2^bits. */
export function numLevels(bits: number): number {
  return 2 ** bits;
}

/** Uniform quantizer step size Δ = 2*mMax/L. */
export function step(mMax: number, bits: number): number {
  return (2 * mMax) / numLevels(bits);
}

/** Quantize a single value to L = 2^bits uniform levels in [-mMax, mMax]. */
export function quantize(value: number, mMax: number, bits: number, type: QuantizerType): number {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  if (type === 'midrise') {
    const k = clamp(Math.floor(value / d), -L / 2, L / 2 - 1);
    return (k + 0.5) * d;
  }
  // midtread: a level sits at 0; index spans the full L = 2^bits codes
  // (k in [-L/2, L/2-1]) so an R-bit PCM codeword maps cleanly. The level
  // set is asymmetric for even L (the standard even-L midtread).
  const k = clamp(Math.round(value / d), -L / 2, L / 2 - 1);
  return k * d;
}

/** Quantize an array of samples. */
export function quantizeSignal(
  values: number[],
  mMax: number,
  bits: number,
  type: QuantizerType,
): number[] {
  return values.map((v) => quantize(v, mMax, bits, type));
}

/** Per-sample quantization error e[n] = x[n] - Q(x[n]). */
export function quantizationError(values: number[], quantized: number[]): number[] {
  return values.map((v, i) => v - quantized[i]);
}

function meanSquare(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x * x;
  return s / xs.length;
}

/** Theoretical SQNR in dB: 10*log10(3*P_M/mMax^2) + 6.02*bits. */
export function sqnrTheoreticalDb(signalPower: number, mMax: number, bits: number): number {
  return 10 * Math.log10((3 * signalPower) / (mMax * mMax)) + 20 * bits * Math.log10(2);
}

/** Measured SQNR in dB from the actual signal and quantization error.
 *  Returns Infinity for perfect reconstruction (zero error power). */
export function sqnrMeasuredDb(values: number[], quantized: number[]): number {
  const err = quantizationError(values, quantized);
  const noisePower = meanSquare(err);
  if (noisePower === 0) return Infinity;
  return 10 * Math.log10(meanSquare(values) / noisePower);
}

/** The L = 2^bits representation levels (ascending). Mirrors `quantize`:
 *  midrise at (k+0.5)*Δ, midtread at k*Δ, for k in [-L/2, L/2-1]. */
export function levelValues(mMax: number, bits: number, type: QuantizerType): number[] {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  const out: number[] = [];
  for (let k = -L / 2; k <= L / 2 - 1; k++) {
    out.push(type === 'midrise' ? (k + 0.5) * d : k * d);
  }
  return out;
}

/** Uniform-quantizer noise power E[Q^2] = Δ^2 / 12. */
export function quantizationNoisePower(mMax: number, bits: number): number {
  const d = step(mMax, bits);
  return (d * d) / 12;
}
