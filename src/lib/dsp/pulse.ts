// src/lib/dsp/pulse.ts — baseband pulse shaping. Proakis §8.3 (Nyquist pulse-shaping, raised cosine).
import { sinc } from './math';

export type PulseKind = 'rc' | 'rrc' | 'sinc';

/**
 * Raised-cosine time-domain pulse, normalized so x(0)=1 (Proakis §8.3):
 *   x(t) = sinc(t/T) · cos(π α t/T) / (1 − (2 α t/T)²)
 * α=0 → sinc(t/T). Has exact zeros at every non-zero integer multiple of T (zero ISI).
 */
export function raisedCosine(t: number, alpha: number, T: number): number {
  const x = t / T;
  if (alpha <= 0) return sinc(x);
  const denom = 1 - (2 * alpha * x) ** 2;
  if (Math.abs(denom) < 1e-9) {
    return (Math.PI / 4) * sinc(1 / (2 * alpha));
  }
  return (sinc(x) * Math.cos(Math.PI * alpha * x)) / denom;
}

/**
 * Root-raised-cosine (square-root RC) time-domain pulse, normalized to h(0)=1−α+4α/π.
 * Two RRC pulses convolved = a raised-cosine (Nyquist) pulse ⇒ matched filter that is also zero-ISI.
 */
export function rootRaisedCosine(t: number, alpha: number, T: number): number {
  const tau = t / T;
  if (Math.abs(tau) < 1e-12) return 1 - alpha + (4 * alpha) / Math.PI;
  if (alpha > 0 && Math.abs(Math.abs(4 * alpha * tau) - 1) < 1e-9) {
    const a = (1 + 2 / Math.PI) * Math.sin(Math.PI / (4 * alpha));
    const b = (1 - 2 / Math.PI) * Math.cos(Math.PI / (4 * alpha));
    return (alpha / Math.SQRT2) * (a + b);
  }
  const num =
    Math.sin(Math.PI * tau * (1 - alpha)) +
    4 * alpha * tau * Math.cos(Math.PI * tau * (1 + alpha));
  const den = Math.PI * tau * (1 - (4 * alpha * tau) ** 2);
  return num / den;
}

/** Sampled pulse over t ∈ [−span·T, span·T] at `sps` samples per symbol (T=1). Length 2·span·sps+1. */
export function pulseWaveform(kind: PulseKind, alpha: number, sps: number, span: number): number[] {
  const T = 1;
  const out: number[] = [];
  for (let i = -span * sps; i <= span * sps; i++) {
    const t = i / sps;
    out.push(
      kind === 'rrc' ? rootRaisedCosine(t, alpha, T) : kind === 'sinc' ? sinc(t / T) : raisedCosine(t, alpha, T),
    );
  }
  return out;
}

/**
 * Raised-cosine magnitude spectrum, normalized to 1 at f=0 (Proakis §8.3):
 *   |f| ≤ (1−α)/2T            : 1
 *   (1−α)/2T < |f| ≤ (1+α)/2T : ½[1 + cos( πT/α · (|f| − (1−α)/2T) )]
 *   |f| > (1+α)/2T            : 0
 */
export function raisedCosineSpectrum(f: number, alpha: number, T: number): number {
  const af = Math.abs(f);
  const f1 = (1 - alpha) / (2 * T);
  const f2 = (1 + alpha) / (2 * T);
  if (af <= f1) return 1;
  if (af > f2) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * T / alpha) * (af - f1)));
}

/** Raised-cosine first-null / absolute bandwidth W = (1+α)/(2T). */
export function raisedCosineBandwidth(alpha: number, T: number): number {
  return (1 + alpha) / (2 * T);
}

/** Sample values at t = nT for n≠0 (the off-center symbol instants); ~0 ⇒ zero ISI. */
export function nyquistOffCenterSamples(pulse: number[], sps: number): number[] {
  const center = (pulse.length - 1) / 2;
  const out: number[] = [];
  for (let k = 1; center + k * sps < pulse.length; k++) {
    out.push(pulse[center + k * sps]);
    out.push(pulse[center - k * sps]);
  }
  return out;
}
