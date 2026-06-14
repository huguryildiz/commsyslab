/**
 * Doppler / time-selective fading. The classical (Clarke/Jakes) isotropic-
 * scattering model: U-shaped Doppler power spectrum, Bessel autocorrelation,
 * and the envelope level-crossing / fade-duration statistics. The book defines
 * the Doppler spread B_d and coherence time T_ct = 1/B_d (Proakis §10.1.1,
 * eq. 10.1.14); the U-spectrum and LCR/AFD are the standard Clarke/Jakes forms.
 */
import { besselJ0 } from '@/lib/dsp/math';
import { makeRng } from '@/lib/dsp/random';

const C_LIGHT = 299792458; // speed of light (m/s)

/** Maximum Doppler shift f_m = v·f_c/c. speed in m/s, carrier in Hz. */
export function maxDopplerHz(speedMps: number, carrierHz: number): number {
  return (speedMps * carrierHz) / C_LIGHT;
}

/**
 * Coherence time T_ct = 1/B_d with the classical two-sided Doppler spread
 * B_d = 2·f_m, so T_ct = 1/(2·f_m). Proakis §10.1.1 (eq. 10.1.14).
 */
export function coherenceTimeS(fm: number): number {
  return fm > 0 ? 1 / (2 * fm) : Infinity;
}

/** Common rule-of-thumb coherence time T_c ≈ 0.423/f_m (Clarke/Jakes). */
export function coherenceTimeRuleS(fm: number): number {
  return fm > 0 ? 0.423 / fm : Infinity;
}

/**
 * Classical (Jakes) Doppler power spectrum S(f) = 1/(π f_m √(1−(f/f_m)²)) for
 * |f| < f_m, else 0. The band-edge singularity is integrable; callers sampling
 * near ±f_m should expect large but finite values (clamped just inside the edge).
 */
export function jakesDopplerPsd(fHz: number, fm: number): number {
  if (fm <= 0) return 0;
  const r = fHz / fm;
  if (Math.abs(r) >= 1) return 0;
  return 1 / (Math.PI * fm * Math.sqrt(1 - r * r));
}

/** Classical Doppler autocorrelation R(τ) = J₀(2π f_m τ). */
export function dopplerAutocorr(tauS: number, fm: number): number {
  return besselJ0(2 * Math.PI * fm * tauS);
}

/**
 * Level-crossing rate N_R = √(2π)·f_m·ρ·e^(−ρ²), ρ = R/R_rms the normalized
 * threshold (linear). Crossings per second of the Rayleigh envelope.
 */
export function levelCrossingRateHz(rhoNorm: number, fm: number): number {
  return Math.sqrt(2 * Math.PI) * fm * rhoNorm * Math.exp(-rhoNorm * rhoNorm);
}

/** Average fade duration τ̄ = (e^(ρ²) − 1)/(ρ·f_m·√(2π)). */
export function avgFadeDurationS(rhoNorm: number, fm: number): number {
  if (fm <= 0 || rhoNorm <= 0) return Infinity;
  return (Math.exp(rhoNorm * rhoNorm) - 1) / (rhoNorm * fm * Math.sqrt(2 * Math.PI));
}

/**
 * Time-varying Rayleigh fading envelope via the sum-of-sinusoids (Jakes) model:
 * sum nSin scatterers with Doppler shifts f_m·cos(θ_n) and seeded random phases.
 * Returns the envelope |g(t)| normalized to unit RMS. Deterministic for a seed.
 */
export function fadingEnvelope(
  fm: number,
  fsHz: number,
  nSamples: number,
  seed: number,
  nSin = 16,
): number[] {
  const rng = makeRng(seed);
  const theta: number[] = [];
  const phiI: number[] = [];
  const phiQ: number[] = [];
  for (let n = 0; n < nSin; n++) {
    theta.push((2 * Math.PI * (n + 1)) / nSin); // even angle spread (Jakes)
    phiI.push(2 * Math.PI * rng());
    phiQ.push(2 * Math.PI * rng());
  }
  const env = new Array<number>(nSamples);
  const dt = fsHz > 0 ? 1 / fsHz : 0;
  for (let k = 0; k < nSamples; k++) {
    const t = k * dt;
    let xi = 0;
    let xq = 0;
    for (let n = 0; n < nSin; n++) {
      const wd = 2 * Math.PI * fm * Math.cos(theta[n]);
      xi += Math.cos(wd * t + phiI[n]);
      xq += Math.sin(wd * t + phiQ[n]);
    }
    env[k] = Math.sqrt(xi * xi + xq * xq);
  }
  // Normalize to unit RMS so the envelope is in units of R/R_rms.
  const ms = env.reduce((s, v) => s + v * v, 0) / nSamples;
  const rms = Math.sqrt(ms);
  return rms > 0 ? env.map((v) => v / rms) : env;
}
