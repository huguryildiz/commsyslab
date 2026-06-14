/**
 * Continuous-Phase Modulation (CPM). Full-response binary CPFSK keeps the carrier
 * phase continuous across symbols (constant envelope, compact spectrum); h = 1/2
 * is MSK. Proakis & Salehi §10.2.
 */

/**
 * CPFSK phase trajectory φ[n] for a ±1 symbol sequence, rectangular (full-
 * response) frequency pulse. Within symbol k the phase ramps linearly by
 * π·h·a_k (since q(T) = 1/2 ⇒ Δφ = 2πh·a_k·q(T) = πh·a_k), so the trajectory is
 * continuous. Sampled at `sps` points/symbol; length = symbols.length·sps.
 */
export function cpfskPhase(symbols: number[], h: number, sps: number): number[] {
  const out: number[] = [];
  let theta = 0; // accumulated terminal phase
  for (const a of symbols) {
    for (let i = 0; i < sps; i++) {
      const u = i / sps;
      out.push(theta + Math.PI * h * a * u);
    }
    theta += Math.PI * h * a; // terminal phase carried to the next symbol
  }
  return out;
}

/**
 * All 2^depth phase trajectories for the ±1 symbol sequences of the given depth —
 * the CPFSK "phase tree". Each entry is a `cpfskPhase` trajectory.
 */
export function cpfskPhaseTree(h: number, sps: number, depth: number): number[][] {
  const trees: number[][] = [];
  const n = 2 ** depth;
  for (let mask = 0; mask < n; mask++) {
    const symbols: number[] = [];
    for (let b = 0; b < depth; b++) symbols.push((mask >> b) & 1 ? 1 : -1);
    trees.push(cpfskPhase(symbols, h, sps));
  }
  return trees;
}

/**
 * MSK baseband power spectral density (dB, normalized to 0 dB at f=0):
 * S(f) ∝ (cos(2πfT)/(1−16(fT)²))². The 0/0 point at fT=±1/4 has the finite
 * limit (π/4)². Proakis §10.2.3 (Fig. 10.30).
 */
export function mskPsdDb(fT: number): number {
  const denom = 1 - 16 * fT * fT;
  let amp: number;
  if (Math.abs(denom) < 1e-6) {
    amp = Math.PI / 4; // L'Hôpital limit at fT = ±1/4
  } else {
    amp = Math.cos(2 * Math.PI * fT) / denom;
  }
  return 10 * Math.log10(Math.max(amp * amp, 1e-12));
}

/**
 * QPSK (rectangular pulse) baseband PSD (dB, normalized to 0 dB at f=0):
 * S(f) ∝ (sin(2πfT)/(2πfT))². Sidelobes fall as f⁻², far slower than MSK's f⁻⁴.
 */
export function qpskPsdDb(fT: number): number {
  const x = 2 * Math.PI * fT;
  const s = x === 0 ? 1 : Math.sin(x) / x;
  return 10 * Math.log10(Math.max(s * s, 1e-12));
}
