/**
 * Time-variant multipath fading channel models.
 * Proakis & Salehi §10.1.1 (Channel Models for Time-Variant Multipath Channels).
 */

/** Seeded RNG returning uniform random values in [0,1). */
type Rng = () => number;

export interface Tap {
  /** Path delay in seconds. */
  delay: number;
  /** Average path power (linear, relative). */
  power: number;
}

/**
 * Exponential power-delay profile: p_k = exp(-tau_k / tauRms), normalized to unit
 * total power. Taps are equally spaced by `tapSpacing` seconds starting at delay 0.
 */
export function exponentialPdp(nTaps: number, tauRms: number, tapSpacing: number): Tap[] {
  const taps: Tap[] = [];
  let total = 0;
  for (let k = 0; k < nTaps; k++) {
    const delay = k * tapSpacing;
    const power = Math.exp(-delay / tauRms);
    taps.push({ delay, power });
    total += power;
  }
  for (const t of taps) t.power /= total; // normalize to unit total power
  return taps;
}

/** RMS delay spread sigma_tau = sqrt(E[tau^2] - E[tau]^2), power-weighted. */
export function rmsDelaySpread(taps: Tap[]): number {
  const p = taps.reduce((s, t) => s + t.power, 0);
  if (p === 0) return 0;
  const mean = taps.reduce((s, t) => s + t.power * t.delay, 0) / p;
  const meanSq = taps.reduce((s, t) => s + t.power * t.delay * t.delay, 0) / p;
  return Math.sqrt(Math.max(0, meanSq - mean * mean));
}

/** Coherence bandwidth B_c ≈ 1/(2π·sigma_tau). Proakis §10.1.1. */
export function coherenceBandwidth(sigmaTau: number): number {
  if (sigmaTau <= 0) return Infinity;
  return 1 / (2 * Math.PI * sigmaTau);
}

/** Coherence time T_c ≈ 1/(2π·f_D), with f_D the maximum Doppler shift (Hz). */
export function coherenceTime(fD: number): number {
  if (fD <= 0) return Infinity;
  return 1 / (2 * Math.PI * fD);
}

/**
 * Magnitude of the channel transfer function H(f) = Σ_k g_k e^{-j2π f τ_k},
 * where each complex tap gain g_k = sqrt(power_k)·e^{jθ_k} has a seeded random
 * phase θ_k (fixed snapshot of the time-variant channel). Proakis §10.1.1.
 */
export function channelFreqResponse(taps: Tap[], freqs: number[], rng: Rng): number[] {
  const phases = taps.map(() => 2 * Math.PI * rng());
  const amps = taps.map((t) => Math.sqrt(t.power));
  return freqs.map((f) => {
    let re = 0;
    let im = 0;
    for (let k = 0; k < taps.length; k++) {
      const phi = phases[k] - 2 * Math.PI * f * taps[k].delay;
      re += amps[k] * Math.cos(phi);
      im += amps[k] * Math.sin(phi);
    }
    return Math.hypot(re, im);
  });
}

/** Rayleigh envelope PDF f(r) = (r/σ²)·exp(-r²/2σ²), r ≥ 0. Proakis Eq. (10.1.19). */
export function rayleighPdf(r: number, sigma: number): number {
  if (r < 0) return 0;
  const s2 = sigma * sigma;
  return (r / s2) * Math.exp(-(r * r) / (2 * s2));
}

/** Modified Bessel function I0(x) via series expansion (adequate for |x| ≲ 20). */
function besselI0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 40; k++) {
    term *= (x * x) / (4 * k * k);
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}

/**
 * Rician envelope PDF with K-factor (ratio of LOS power to scatter power).
 * s = sqrt(2·K)·sigma is the LOS amplitude. K = 0 ⇒ Rayleigh.
 * f(r) = (r/σ²)·exp(-(r²+s²)/2σ²)·I0(r·s/σ²). Proakis §10.1.1.
 */
export function ricianPdf(r: number, sigma: number, K: number): number {
  if (r < 0) return 0;
  const s = Math.sqrt(2 * K) * sigma;
  const s2 = sigma * sigma;
  return (
    (r / s2) *
    Math.exp(-(r * r + s * s) / (2 * s2)) *
    besselI0((r * s) / s2)
  );
}

export interface EnvelopeParams {
  /** Maximum Doppler shift f_D (Hz). */
  fD: number;
  /** Rician K-factor (0 ⇒ Rayleigh). */
  K: number;
  /** Number of time samples. */
  nSamples: number;
  /** Sampling rate (Hz). */
  fs: number;
}

/**
 * Clarke/Jakes sum-of-sinusoids fading envelope. The scatter component is a sum
 * of M sinusoids with Doppler-shifted frequencies f_D·cos(α_m) and seeded phases;
 * a Rician LOS term is added per the K-factor. Returns |r(t)| over nSamples.
 * Proakis §10.1.1 (statistical characterization of the time-variant channel).
 */
export function envelopeSeries(p: EnvelopeParams, rng: Rng): Float64Array {
  const M = 16; // number of scatterers
  const alphas = Array.from({ length: M }, (_, m) => (2 * Math.PI * (m + 1)) / M);
  const phases = Array.from({ length: M }, () => 2 * Math.PI * rng());
  const losPhase = 2 * Math.PI * rng();
  const losAng = 2 * Math.PI * rng(); // LOS arrival angle
  const scatterScale = Math.sqrt(1 / (M * (p.K + 1)));
  const losAmp = Math.sqrt(p.K / (p.K + 1));
  const out = new Float64Array(p.nSamples);
  for (let n = 0; n < p.nSamples; n++) {
    const t = n / p.fs;
    let re = 0;
    let im = 0;
    for (let m = 0; m < M; m++) {
      const phi = 2 * Math.PI * p.fD * Math.cos(alphas[m]) * t + phases[m];
      re += Math.cos(phi);
      im += Math.sin(phi);
    }
    re *= scatterScale;
    im *= scatterScale;
    // Rician line-of-sight component at Doppler f_D·cos(losAng)
    const lp = 2 * Math.PI * p.fD * Math.cos(losAng) * t + losPhase;
    re += losAmp * Math.cos(lp);
    im += losAmp * Math.sin(lp);
    out[n] = Math.hypot(re, im);
  }
  return out;
}
