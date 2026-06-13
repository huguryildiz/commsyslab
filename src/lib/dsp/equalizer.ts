// src/lib/dsp/equalizer.ts — linear ZF / MMSE equalizers (Proakis §8.6.2).
import { convolve } from './matchedfilter';

/** Apply an FIR equalizer (or channel) to a signal — alias of convolve. */
export function applyFilter(signal: number[], taps: number[]): number[] {
  return convolve(signal, taps);
}

/** Square N×N lower-triangular Toeplitz convolution matrix of the channel (T[i][j]=channel[i−j]). */
function toeplitz(channel: number[], n: number): number[][] {
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const k = i - j;
      if (k < channel.length) A[i][j] = channel[k];
    }
  }
  return A;
}

/** Solve A x = b by Gaussian elimination with partial pivoting (small N). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / (M[i][i] || 1e-12));
}

/**
 * Zero-forcing equalizer taps: solve T·w = e₀ where T is the square lower-triangular Toeplitz
 * of the channel (recursive deconvolution). Forces ISI to zero at the first nTaps−1 sample instants.
 */
export function zeroForcingTaps(channel: number[], nTaps: number): number[] {
  const w = new Array(nTaps).fill(0);
  const c0 = channel[0] || 1e-12;
  w[0] = 1 / c0;
  for (let n = 1; n < nTaps; n++) {
    let acc = 0;
    for (let k = 1; k <= n && k < channel.length; k++) acc += channel[k] * w[n - k];
    w[n] = -acc / c0;
  }
  return w;
}

/**
 * MMSE equalizer taps: solve (TᵀT + σ²I)·w = Tᵀe₀ on the same square Toeplitz T as ZF.
 * Since T is square-invertible, σ²=0 gives w = T⁻¹e₀ = the zero-forcing solution exactly;
 * larger σ² regularizes (shrinks) the taps → less noise enhancement.
 */
export function mmseTaps(channel: number[], noiseVar: number, nTaps: number): number[] {
  const T = toeplitz(channel, nTaps);
  const A: number[][] = Array.from({ length: nTaps }, () => new Array(nTaps).fill(0));
  for (let i = 0; i < nTaps; i++) {
    for (let j = 0; j < nTaps; j++) {
      let s = 0;
      for (let k = 0; k < nTaps; k++) s += T[k][i] * T[k][j];
      A[i][j] = s + (i === j ? noiseVar : 0);
    }
  }
  const b = new Array(nTaps).fill(0);
  b[0] = T[0][0];
  return solveLinear(A, b);
}

/** Residual ISI = Σ |(channel ⋆ taps)[k]| over every index except the main (peak) tap. */
export function residualIsi(channel: number[], taps: number[]): number {
  const c = convolve(channel, taps);
  let peakIdx = 0;
  for (let i = 1; i < c.length; i++) if (Math.abs(c[i]) > Math.abs(c[peakIdx])) peakIdx = i;
  let acc = 0;
  for (let i = 0; i < c.length; i++) if (i !== peakIdx) acc += Math.abs(c[i]);
  return acc;
}
