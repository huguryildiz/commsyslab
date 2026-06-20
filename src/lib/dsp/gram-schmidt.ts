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

/** One projection of sₘ onto a prior orthonormal basis vector φⱼ (Eq. 7.1.6). */
export interface GramSchmidtStepProjection {
  /** Index j of the prior basis vector φⱼ. */
  basisIndex: number;
  /** Projection coefficient ⟨sₘ, φⱼ⟩. */
  coeff: number;
  /** The removed component ⟨sₘ, φⱼ⟩·φⱼ(t). */
  component: number[];
}

/** The Gram-Schmidt step for one input signal sₘ. */
export interface GramSchmidtStep {
  /** Index m of the signal. */
  signalIndex: number;
  /** The original signal sₘ(t). */
  source: number[];
  /** Projections onto each prior basis vector, in order. */
  projections: GramSchmidtStepProjection[];
  /** Residual gₘ(t) = sₘ − Σ projections (Eq. 7.1.7). */
  residual: number[];
  /** ‖gₘ‖. */
  residualNorm: number;
  /** true ⇒ residual ≈ 0, signal adds no new dimension. */
  dependent: boolean;
  /** New basis vector φₖ = gₘ/‖gₘ‖, or null when dependent. */
  basis: number[] | null;
}

/** Full step-by-step Gram-Schmidt trace for animation (Proakis §7.1). */
export interface GramSchmidtTrace {
  steps: GramSchmidtStep[];
  /** Final orthonormal basis (equals `gramSchmidt(signals).basis`). */
  basis: number[][];
  /** Final M×N signal-space coefficients (equals `gramSchmidt(signals).coeffs`). */
  coeffs: number[][];
  dim: number;
}

/**
 * Like `gramSchmidt`, but records every intermediate projection/residual so the UI
 * can animate the orthonormalization. Same inner-product and tolerance conventions,
 * so the final `basis`/`coeffs`/`dim` are identical to `gramSchmidt`.
 */
export function gramSchmidtTrace(signals: number[][], tol = 1e-9): GramSchmidtTrace {
  const M = signals.length;
  const len = M > 0 ? signals[0].length : 0;
  if (signals.some((s) => s.length !== len)) {
    throw new Error('gramSchmidtTrace: all signals must have equal length');
  }
  const basis: number[][] = [];
  const steps: GramSchmidtStep[] = [];

  for (let m = 0; m < M; m++) {
    const s = signals[m];
    const energy = dot(s, s);
    const residual = s.slice();
    const projections: GramSchmidtStepProjection[] = [];
    for (let j = 0; j < basis.length; j++) {
      const phi = basis[j];
      const coeff = dot(s, phi); // basis is orthonormal ⇒ ⟨sₘ,φⱼ⟩ is the projection coeff
      const component = phi.map((v) => coeff * v);
      for (let i = 0; i < len; i++) residual[i] -= component[i];
      projections.push({ basisIndex: j, coeff, component });
    }
    const dResidual = dot(residual, residual);
    const residualNorm = Math.sqrt(dResidual);
    // Same relative-tolerance test as gramSchmidt().
    const dependent = !(dResidual > tol * Math.max(energy, 1e-12));
    let basisVec: number[] | null = null;
    if (!dependent) {
      basisVec = residual.map((v) => v / residualNorm);
      basis.push(basisVec);
    }
    steps.push({
      signalIndex: m,
      source: s.slice(),
      projections,
      residual: residual.slice(),
      residualNorm,
      dependent,
      basis: basisVec ? basisVec.slice() : null,
    });
  }

  const dim = basis.length;
  const coeffs = signals.map((s) => basis.map((phi) => dot(s, phi)));
  return { steps, basis, coeffs, dim };
}
