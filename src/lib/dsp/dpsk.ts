// DPSK — differential phase modulation & detection.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.6.4–8.6.5.

import { ebN0Linear } from './awgn';

/** Non-negative modulo. */
function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

/**
 * Differential phase encoding (Proakis §8.6.4): the information symbol carries
 * the phase *increment*. Transmitted phase index θ_k = (θ_{k-1} + d_k) mod M,
 * with θ_{-1} = ref. Returns the transmitted phase-index sequence.
 */
export function differentialEncode(info: number[], M: number, ref = 0): number[] {
  const tx: number[] = [];
  let prev = mod(ref, M);
  for (const d of info) {
    prev = mod(prev + d, M);
    tx.push(prev);
  }
  return tx;
}

/**
 * Differential decoding: recover the information increments from transmitted /
 * detected phase indices. d_k = (θ_k − θ_{k-1}) mod M, with θ_{-1} = ref.
 * Exact inverse of differentialEncode.
 */
export function differentialDecode(phases: number[], M: number, ref = 0): number[] {
  const info: number[] = [];
  let prev = mod(ref, M);
  for (const p of phases) {
    info.push(mod(p - prev, M));
    prev = p;
  }
  return info;
}

/** Binary DPSK bit-error probability (Proakis §8.6.5 Eq. 8.6.42): ½ e^{-Eb/N0}. */
export function dpskBitErrorProb(ebN0Db: number): number {
  return 0.5 * Math.exp(-ebN0Linear(ebN0Db));
}

/**
 * M-ary DPSK symbol-error probability (Proakis §8.6.5 Eq. 8.6.37):
 *   P_M = (1/π) ∫_0^{π−π/M} exp[ −P_s sin²(π/M) / (1 − cos(π/M) cosθ) ] dθ,
 *   P_s = E_s/N0 = log2(M)·Eb/N0.
 * For M=2 the integral reduces analytically to ½ e^{-Eb/N0}; returned directly.
 */
export function dpskSymbolErrorProb(M: number, ebN0Db: number): number {
  if (M === 2) return dpskBitErrorProb(ebN0Db);
  const k = Math.log2(M);
  const ps = k * ebN0Linear(ebN0Db);
  const a = Math.sin(Math.PI / M) ** 2;
  const c = Math.cos(Math.PI / M);
  const upper = Math.PI - Math.PI / M;
  // Composite trapezoid; N even, fine enough for a smooth bounded integrand.
  const N = 4000;
  const h = upper / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const theta = i * h;
    const f = Math.exp((-ps * a) / (1 - c * Math.cos(theta)));
    sum += i === 0 || i === N ? f / 2 : f;
  }
  return (sum * h) / Math.PI;
}
