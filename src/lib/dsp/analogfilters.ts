/**
 * Realizable (approximation) analog lowpass filter magnitude responses.
 *
 * These are the classical analog-filter approximations used to *realize* the
 * ideal brick-wall lowpass: Butterworth (maximally flat), Chebyshev type I
 * (equiripple passband) and Chebyshev type II (equiripple stopband / inverse
 * Chebyshev). They are standard analog-filter theory and sit alongside the
 * ideal/RC responses in `fourier.ts`.
 *
 * Note on references: Proakis & Salehi, *Communication Systems Engineering*
 * mentions the Butterworth filter only in passing (reconstruction filter for
 * D/A conversion) and does not develop Chebyshev forms; these magnitude
 * expressions are the standard textbook approximation functions, kept here as
 * an extension for the Filters tab. Notation: f = frequency, f_c = cutoff,
 * N = order, R_p / R_s = passband ripple / stopband attenuation in dB.
 */

export type AnalogFilterKind = 'butterworth' | 'cheby1' | 'cheby2';

/**
 * Chebyshev polynomial of the first kind, T_N(x), via the stable three-term
 * recurrence T_0 = 1, T_1 = x, T_k = 2x·T_{k-1} − T_{k-2}. The recurrence is
 * exact for integer order and valid for all real x (no |x| ≤ 1 restriction),
 * so it covers both the passband (|x| ≤ 1, oscillatory) and the stopband
 * (|x| > 1, growing like the cosh branch).
 */
export function chebyT(n: number, x: number): number {
  if (n <= 0) return 1;
  if (n === 1) return x;
  let tPrev = 1; // T_0
  let tCur = x; // T_1
  for (let k = 2; k <= n; k++) {
    const tNext = 2 * x * tCur - tPrev;
    tPrev = tCur;
    tCur = tNext;
  }
  return tCur;
}

/**
 * Butterworth lowpass magnitude:  |H(f)| = 1 / √(1 + (f/f_c)^{2N}).
 * Maximally flat in the passband; −3 dB (1/√2) at f = f_c for every order N.
 */
export function butterworthMag(f: number, fc: number, n: number): number {
  const ratio = Math.abs(f) / fc;
  return 1 / Math.sqrt(1 + Math.pow(ratio, 2 * n));
}

/**
 * Chebyshev type I lowpass magnitude (equiripple passband):
 *   |H(f)| = 1 / √(1 + ε²·T_N²(f/f_c)),   ε = √(10^{R_p/10} − 1).
 * The response oscillates between 1 and 10^{−R_p/20} across the passband and
 * passes through the ripple edge 10^{−R_p/20} exactly at f = f_c (since
 * T_N(1) = 1). Steeper roll-off than Butterworth of the same order.
 */
export function chebyshev1Mag(f: number, fc: number, n: number, rippleDb: number): number {
  const eps2 = Math.pow(10, rippleDb / 10) - 1;
  const tn = chebyT(n, Math.abs(f) / fc);
  return 1 / Math.sqrt(1 + eps2 * tn * tn);
}

/**
 * Chebyshev type II (inverse Chebyshev) lowpass magnitude (equiripple
 * stopband, maximally flat passband):
 *   |H(f)| = 1 / √(1 + 1 / (ε²·T_N²(f_c/f))),   ε = 1 / √(10^{R_s/10} − 1).
 * Flat (unity) at DC, equiripple in the stopband bounded by 10^{−R_s/20}, and
 * equal to 10^{−R_s/20} exactly at the cutoff f = f_c.
 */
export function chebyshev2Mag(f: number, fc: number, n: number, stopDb: number): number {
  const af = Math.abs(f);
  if (af === 0) return 1; // f_c/f → ∞ ⇒ T_N → ∞ ⇒ |H| → 1 (flat passband at DC)
  const eps2 = 1 / (Math.pow(10, stopDb / 10) - 1);
  const tn = chebyT(n, fc / af);
  return 1 / Math.sqrt(1 + 1 / (eps2 * tn * tn));
}

export type ButterResponseKind = 'lpf' | 'hpf' | 'bpf' | 'bsf';

/**
 * Butterworth magnitude for the four common band shapes, all derived from the
 * lowpass prototype 1/√(1+Ω^{2N}) via the standard frequency transformations:
 *   LPF: Ω = f/fc            HPF: Ω = fc/f
 *   BPF: Ω = (f²−f0²)/(B·f)   BSF: Ω = (B·f)/(f²−f0²)
 * with band center f0 = √(fc·fc2) and bandwidth B = |fc2 − fc| (fc, fc2 = lower/
 * upper −3 dB edges). N is the order. Standard analog-filter theory; see header.
 */
export function butterworthResponse(
  kind: ButterResponseKind,
  f: number,
  fc: number,
  fc2: number,
  n: number,
): number {
  const af = Math.abs(f);
  const fromOmega = (omega: number) => 1 / Math.sqrt(1 + Math.pow(omega, 2 * n));
  switch (kind) {
    case 'lpf':
      return fromOmega(af / fc);
    case 'hpf':
      return af === 0 ? 0 : fromOmega(fc / af);
    case 'bpf': {
      const f1 = Math.min(fc, fc2), f2 = Math.max(fc, fc2);
      const f0 = Math.sqrt(f1 * f2), B = f2 - f1;
      if (af === 0 || B <= 0) return 0;
      return fromOmega((af * af - f0 * f0) / (B * af));
    }
    case 'bsf': {
      const f1 = Math.min(fc, fc2), f2 = Math.max(fc, fc2);
      const f0 = Math.sqrt(f1 * f2), B = f2 - f1;
      const denom = af * af - f0 * f0;
      if (denom === 0) return 0; // exactly at center → full notch
      if (af === 0) return 1;
      return fromOmega((B * af) / denom);
    }
  }
}

/** Dispatch helper: magnitude for the selected realizable filter kind. */
export function realizableMag(
  kind: AnalogFilterKind,
  f: number,
  fc: number,
  n: number,
  rippleDb: number,
  stopDb: number,
): number {
  switch (kind) {
    case 'butterworth':
      return butterworthMag(f, fc, n);
    case 'cheby1':
      return chebyshev1Mag(f, fc, n, rippleDb);
    case 'cheby2':
      return chebyshev2Mag(f, fc, n, stopDb);
  }
}
