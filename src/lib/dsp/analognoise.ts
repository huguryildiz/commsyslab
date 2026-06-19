// Noise in analog communication systems — Proakis & Salehi, Ch 6. Pure, framework-free.
import { amEfficiency, emphasisSnrGainDb } from './analog';
import { gaussian } from './awgn';

export type AnalogScheme = 'dsb' | 'ssb' | 'am' | 'fm' | 'pm';

export interface SnrParams {
  amIndex: number; // a (conventional AM)
  beta: number; // β (FM/PM modulation index)
  messagePower: number; // normalized message power P_Mn (single tone = 0.5)
  emphasis: boolean; // pre/de-emphasis (FM only)
  W: number; // message bandwidth (Hz)
  f1?: number; // de-emphasis corner frequency (Hz)
}

/** Commercial-FM de-emphasis corner f₁ = 1/(2π·75 µs) ≈ 2122 Hz (Proakis §6.2.2). */
export const DEEMPHASIS_F1_DEFAULT = 1 / (2 * Math.PI * 75e-6);

/** Linear SNR improvement of the demod output over the baseband SNR γ = P_R/(N₀W). */
export function snrImprovement(scheme: AnalogScheme, p: SnrParams): number {
  switch (scheme) {
    case 'dsb':
    case 'ssb':
      return 1; // coherent: (S/N)_o = (S/N)_b  (Proakis §6.1.2 Eq. 6.1.13, §6.1.3 Eq. 6.1.22)
    case 'am':
      return amEfficiency(p.amIndex, p.messagePower); // η  (§6.1.4 Eq. 6.1.28)
    case 'pm':
      return p.beta ** 2 * p.messagePower; // (§6.2 Eq. 6.2.20)
    case 'fm': {
      const base = 3 * p.beta ** 2 * p.messagePower; // (§6.2 Eq. 6.2.21)
      if (!p.emphasis) return base;
      const f1 = p.f1 ?? DEEMPHASIS_F1_DEFAULT;
      return base * 10 ** (emphasisSnrGainDb(f1, p.W) / 10); // ×10^(gain_dB/10) (§6.2.2 Eq. 6.2.42)
    }
  }
}

/** Output SNR (dB) for a scheme at channel SNR γ (dB). */
export function outputSnrDb(scheme: AnalogScheme, channelSnrDb: number, p: SnrParams): number {
  return channelSnrDb + 10 * Math.log10(snrImprovement(scheme, p));
}

/** Demodulation gain (dB) = output SNR − channel SNR = 10log10(improvement). */
export function demodulationGainDb(scheme: AnalogScheme, p: SnrParams): number {
  return 10 * Math.log10(snrImprovement(scheme, p));
}

/** FM threshold baseband-SNR in dB: (S/N)_b,th = 20(β+1). The threshold rises with the
 *  transmission bandwidth B_c = 2(β+1)W, so it grows with β (Proakis §6.2.1 Eq. 6.2.25). */
export function fmThresholdCnrDb(beta: number): number {
  return 10 * Math.log10(20 * (beta + 1));
}

function power(x: Float64Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s / x.length;
}

/** Return reference + white Gaussian noise scaled so the SNR equals snrDb. */
export function addNoiseAtSnr(
  reference: Float64Array,
  snrDb: number,
  rng: () => number,
): Float64Array {
  const sigP = power(reference) || 1e-12;
  const noiseP = sigP / 10 ** (snrDb / 10);
  const sigma = Math.sqrt(noiseP);
  const out = new Float64Array(reference.length);
  for (let i = 0; i < reference.length; i++) out[i] = reference[i] + sigma * gaussian(rng);
  return out;
}

/** Measured SNR (dB) of a noisy signal relative to its clean reference. */
export function measuredSnrDb(noisy: Float64Array, reference: Float64Array): number {
  let errP = 0;
  for (let i = 0; i < reference.length; i++) {
    const e = noisy[i] - reference[i];
    errP += e * e;
  }
  errP /= reference.length;
  const sigP = power(reference);
  if (errP <= 0 || sigP <= 0) return 999; // 999 dB sentinel: perfect or empty reference
  return 10 * Math.log10(sigP / errP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Real signal-chain helpers (for the §6.1 AM noise animations)
// ─────────────────────────────────────────────────────────────────────────────

/** Centered moving-average lowpass over exactly `window` taps; preserves length
 *  (edges average the available samples). */
export function lowpassMA(x: number[], window: number): number[] {
  const w = Math.max(1, Math.round(window));
  const out = new Array<number>(x.length);
  const lo = -Math.floor((w - 1) / 2); // exactly w taps: lo..hi spans w samples
  const hi = Math.floor(w / 2);
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    let c = 0;
    for (let k = lo; k <= hi; k++) {
      const j = i + k;
      if (j >= 0 && j < x.length) {
        s += x[j];
        c++;
      }
    }
    out[i] = s / c;
  }
  return out;
}

/** Coherent (synchronous) demodulator: y(t) = LPF{ 2·r(t)·cos(2π f_c t) }. Proakis §6.1.2. */
export function coherentDemod(rx: number[], fc: number, fs: number, lpWindow: number): number[] {
  const mixed = rx.map((v, i) => 2 * v * Math.cos((2 * Math.PI * fc * i) / fs));
  return lowpassMA(mixed, lpWindow);
}

/** In-phase/quadrature bandpass-noise components n_c, n_s (Gaussian, optionally smoothed to W). */
export function quadratureNoise(
  n: number,
  sigma: number,
  rng: () => number,
  smooth = 1,
): { nc: number[]; ns: number[] } {
  const raw = (): number[] => Array.from({ length: n }, () => sigma * gaussian(rng));
  const nc = smooth > 1 ? lowpassMA(raw(), smooth) : raw();
  const ns = smooth > 1 ? lowpassMA(raw(), smooth) : raw();
  return { nc, ns };
}

/** Demodulator-output noise PSD for angle modulation (Proakis §6.2 Eq. 6.2.13–6.2.15).
 *  FM: parabolic N₀ f²/A_c² ; PM: flat N₀/A_c². */
export function angleNoisePsd(
  freqs: number[],
  scheme: 'fm' | 'pm',
  ac: number,
  n0: number,
): number[] {
  const a2 = ac * ac;
  return freqs.map((f) => (scheme === 'fm' ? (n0 * f * f) / a2 : n0 / a2));
}
