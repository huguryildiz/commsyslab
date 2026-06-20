// DPSK — differential phase modulation & detection.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.6.4–8.6.5.

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
