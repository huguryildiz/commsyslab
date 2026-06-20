// Ref: Proakis & Salehi, Communication Systems Engineering §10.2 — power spectrum of
// linearly modulated digital signals (PAM/PSK/QAM).
import { sinc } from './math';

// Rectangular NRZ transmit-filter magnitude: |G_T(f)| = |A·T·sinc(fT)| (Example 10.2.1).
// Nulls at multiples of 1/T; energy density decays as 1/f².
export function rectNrzMag(A: number, T: number): (f: number) => number {
  return (f: number) => Math.abs(A * T * sinc(f * T));
}

// S_a(f) = Σ_m R_a[m] e^{-j2πfmT}  (Eq. 10.2.3). The autocorrelation R_a is supplied
// one-sided ([R_a0, R_a1, …]) and assumed even-symmetric, so the transform is real:
// S_a(f) = R_a0 + 2 Σ_{m≥1} R_a[m] cos(2πfmT).
export function symbolPsd(Ra: number[], T: number, freqs: number[]): number[] {
  return freqs.map((f) => {
    let s = Ra[0] ?? 0;
    for (let m = 1; m < Ra.length; m++) s += 2 * Ra[m] * Math.cos(2 * Math.PI * f * m * T);
    return s;
  });
}

// Power spectrum of the modulated signal for an uncorrelated symbol sequence (Eq. 10.2.9):
//   S_v(f) = (σ_a²/T)|G_T(f)|²  +  (m_a²/T²) Σ_m |G_T(m/T)|² δ(f − m/T).
// The first term is the continuous spectrum shaped by G_T; the second is a set of
// discrete spectral lines spaced 1/T apart. A zero-mean constellation (m_a = 0) removes
// the lines entirely (Eq. 10.2.10).
export function pamPsd(
  gTMag: (f: number) => number,
  sigmaA2: number,
  mA: number,
  T: number,
  freqs: number[],
): { continuous: number[]; lines: { f: number; weight: number }[] } {
  const continuous = freqs.map((f) => (sigmaA2 / T) * gTMag(f) ** 2);
  const lines: { f: number; weight: number }[] = [];
  if (Math.abs(mA) > 1e-12 && freqs.length > 0) {
    const fmin = Math.min(...freqs);
    const fmax = Math.max(...freqs);
    for (let m = Math.ceil(fmin * T); m <= Math.floor(fmax * T); m++) {
      const fm = m / T;
      const weight = ((mA * mA) / (T * T)) * gTMag(fm) ** 2;
      if (weight > 1e-12) lines.push({ f: fm, weight });
    }
  }
  return { continuous, lines };
}
