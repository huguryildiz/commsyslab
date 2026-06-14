/**
 * MIMO: Alamouti space-time diversity BER and ergodic spatial-multiplexing
 * capacity. Proakis & Salehi §10.1.6.
 */
import type { Complex } from '@/lib/dsp/fft';
import { mrcBerAntipodal } from '@/lib/dsp/diversity';
import { makeRng } from '@/lib/dsp/random';
import { gaussian } from '@/lib/dsp/awgn';

/**
 * Alamouti 2×N_r BER (antipodal). Space-time coding with two transmit antennas
 * achieves diversity order 2·N_r, but splitting the transmit power across the two
 * antennas costs 3 dB — so it behaves as a (2·N_r)-branch MRC at half the average
 * SNR. N_r = 1 ⇒ order-2 diversity. Proakis §10.1.6.
 */
export function alamoutiBerAntipodal(ebN0Db: number, nr: number): number {
  const halfSnrDb = ebN0Db - 10 * Math.log10(2); // 3 dB transmit power split
  return mrcBerAntipodal(halfSnrDb, 2 * nr);
}

// Minimal complex helpers (local; the small matrices here don't warrant a library).
const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cDiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const cConj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/**
 * Natural log of det(A) for a Hermitian positive-definite complex matrix via LU
 * without pivoting (a PD matrix has positive leading minors, so pivots never
 * vanish). The determinant is real and positive; the imaginary parts cancel.
 */
function logDetHermitianPd(A: Complex[][]): number {
  const n = A.length;
  const M = A.map((row) => row.map((c) => ({ ...c })));
  let logDet = 0;
  for (let k = 0; k < n; k++) {
    const piv = M[k][k];
    logDet += Math.log(piv.re); // PD ⇒ real positive pivot (imag ≈ 0)
    for (let i = k + 1; i < n; i++) {
      const factor = cDiv(M[i][k], piv);
      for (let j = k; j < n; j++) {
        M[i][j] = cSub(M[i][j], cMul(factor, M[k][j]));
      }
    }
  }
  return logDet;
}

/**
 * Ergodic MIMO capacity C = E[log₂ det(I_{N_r} + (ρ/N_t)·H·Hᴴ)] over seeded
 * Monte-Carlo, H i.i.d. CN(0,1). ρ is the linear SNR. The same seed reuses the
 * same channel realizations across SNR points, giving smooth, reproducible
 * curves. Proakis §10.1.6.
 */
export function mimoCapacity(snrDb: number, nt: number, nr: number, trials: number, seed: number): number {
  const rho = 10 ** (snrDb / 10);
  const rng = makeRng(seed);
  const LN2 = Math.log(2);
  let sum = 0;
  for (let t = 0; t < trials; t++) {
    // Draw H (N_r × N_t), entries CN(0,1): real & imag each N(0, 1/2).
    const H: Complex[][] = [];
    for (let i = 0; i < nr; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < nt; j++) {
        row.push({ re: gaussian(rng) / Math.SQRT2, im: gaussian(rng) / Math.SQRT2 });
      }
      H.push(row);
    }
    // A = I_{N_r} + (ρ/N_t)·H·Hᴴ  (Hermitian PD, N_r × N_r).
    const A: Complex[][] = [];
    for (let i = 0; i < nr; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < nr; j++) {
        let acc: Complex = { re: 0, im: 0 };
        for (let k = 0; k < nt; k++) acc = cAdd(acc, cMul(H[i][k], cConj(H[j][k])));
        const scaled: Complex = { re: (rho / nt) * acc.re, im: (rho / nt) * acc.im };
        row.push(i === j ? cAdd({ re: 1, im: 0 }, scaled) : scaled);
      }
      A.push(row);
    }
    sum += logDetHermitianPd(A) / LN2;
  }
  return sum / trials;
}
