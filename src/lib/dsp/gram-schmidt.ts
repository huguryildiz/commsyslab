/**
 * Gram-Schmidt orthonormalization of a set of sampled signal waveforms
 * (Proakis & Salehi §7.1, Eq. 7.1.1–7.1.11).
 *
 * Inner product is the plain discrete sum ⟨a,b⟩ = Σ aₙbₙ (dt ≈ 1), matching the
 * energy convention used elsewhere in the model (`quadratureBasis`, `correlate`):
 * a unit-energy basis vector satisfies Σ φ[n]² = 1.
 */
export interface GramSchmidtResult {
  /** N orthonormal basis vectors {φ_k}, each the length of an input signal. */
  basis: number[][];
  /** M×N projection coefficients sₘₙ = ⟨sₘ, φₙ⟩ = signal-space points (Eq. 7.1.10). */
  coeffs: number[][];
  /** Dimension N ≤ M of the signal space. */
  dim: number;
  /** Energy Eₘ = Σ sₘ[n]² of each input signal (Eq. 7.1.11: = Σ coeffs[m]²). */
  energies: number[];
  /** length M; true ⇒ signal m added no new dimension (linearly dependent on earlier ones). */
  dependent: boolean[];
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function gramSchmidt(signals: number[][], tol = 1e-9): GramSchmidtResult {
  const M = signals.length;
  const len = M > 0 ? signals[0].length : 0;
  if (signals.some((s) => s.length !== len)) {
    throw new Error('gramSchmidt: all signals must have equal length');
  }
  const basis: number[][] = [];
  const dependent: boolean[] = [];
  const energies: number[] = [];

  for (let m = 0; m < M; m++) {
    const s = signals[m];
    const energy = dot(s, s);
    energies.push(energy);
    // dₖ = sₘ − Σ ⟨sₘ,φᵢ⟩ φᵢ  (Eq. 7.1.7–7.1.9)
    const d = s.slice();
    for (const phi of basis) {
      const c = dot(s, phi);
      for (let i = 0; i < len; i++) d[i] -= c * phi[i];
    }
    const dEnergy = dot(d, d);
    // Relative tolerance: a residual that is negligible vs the signal energy ⇒ dependent.
    if (dEnergy > tol * Math.max(energy, 1e-12)) {
      const norm = Math.sqrt(dEnergy);
      basis.push(d.map((v) => v / norm)); // φ = dₖ/√Eₖ (Eq. 7.1.6)
      dependent.push(false);
    } else {
      dependent.push(true);
    }
  }

  const dim = basis.length;
  // Coefficients over the FINAL basis: every signal (incl. dependent ones) gets a valid point.
  const coeffs = signals.map((s) => basis.map((phi) => dot(s, phi)));

  return { basis, coeffs, dim, energies, dependent };
}
