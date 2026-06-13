/**
 * Quadrature carrier basis over one symbol of `sps` samples (Proakis §7.3):
 *   φ₁[n] = √(2/sps)·cos(2π·cycles·n/sps),  φ₂[n] = √(2/sps)·sin(2π·cycles·n/sps).
 * For integer `cycles` (≥1) the two are exactly unit-energy and mutually orthogonal.
 */
export function quadratureBasis(sps: number, cycles: number): number[][] {
  const a = Math.sqrt(2 / sps);
  const phi1 = new Array<number>(sps);
  const phi2 = new Array<number>(sps);
  for (let n = 0; n < sps; n++) {
    const arg = (2 * Math.PI * cycles * n) / sps;
    phi1[n] = a * Math.cos(arg);
    phi2[n] = a * Math.sin(arg);
  }
  return [phi1, phi2];
}

/**
 * M orthogonal FSK tones (Proakis §7.4): φ_i[n] = √(2/sps)·cos(2π·(cycles+i)·n/sps).
 * Integer frequencies cycles…cycles+M−1 → each unit-energy and mutually orthogonal over the
 * symbol. Caller must keep cycles+M−1 < sps/2 (Nyquist).
 */
export function fskBasis(M: number, sps: number, cycles: number): number[][] {
  const a = Math.sqrt(2 / sps);
  const out: number[][] = [];
  for (let i = 0; i < M; i++) {
    const f = cycles + i;
    const tone = new Array<number>(sps);
    for (let n = 0; n < sps; n++) tone[n] = a * Math.cos((2 * Math.PI * f * n) / sps);
    out.push(tone);
  }
  return out;
}
