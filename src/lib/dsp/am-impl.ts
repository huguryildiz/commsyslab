/**
 * AM modulator/demodulator implementations — Proakis & Salehi §3.3.
 * Pure DSP: square-wave carriers, the four modulator chains, an FFT bandpass
 * filter (to extract the desired AM signal from the wideband product), and an
 * RC envelope detector. UI-free and unit-tested.
 */
import { fft, ifft, type Complex } from './fft';
import type { Tone } from './signals';
import { evalSignal, signalPeak } from './signals';

/**
 * Square-wave carrier from its Fourier series (Proakis Eq 3.3.7 / 3.3.11).
 * - unipolar (bipolar=false): switching-modulator s(t) = ½ + (2/π)Σ … ∈ {0,1}.
 * - bipolar  (bipolar=true):  ring-modulator c(t) = (4/π)Σ … ∈ {−1,+1}.
 */
export function squareWave(fc: number, t: number, nHarmonics: number, bipolar: boolean): number {
  let series = 0;
  for (let n = 1; n <= nHarmonics; n++) {
    const k = 2 * n - 1;
    series += (((-1) ** (n - 1)) / k) * Math.cos(2 * Math.PI * fc * t * k);
  }
  series *= 2 / Math.PI;
  return bipolar ? 2 * series : 0.5 + series;
}

/**
 * Ideal brick-wall FFT bandpass filter: zero every bin whose |frequency| falls
 * outside [fLow, fHigh], then inverse-transform. Recovers the desired AM signal
 * centred at f_c from a modulator's wideband output (Proakis §3.3).
 */
export function bandpassFilterFFT(x: number[], fs: number, fLow: number, fHigh: number): number[] {
  const N = x.length;
  if (N === 0) return [];
  const X = fft(x);
  const filtered: Complex[] = X.map((c, k) => {
    const f = k <= N / 2 ? (k * fs) / N : ((k - N) * fs) / N;
    const af = Math.abs(f);
    return af >= fLow && af <= fHigh ? c : { re: 0, im: 0 };
  });
  return ifft(filtered).map((c) => c.re);
}

/** Normalized message value mₙ(t) ∈ [−1,1] for a tone list. */
function msgNorm(msg: Tone[], t: number): number {
  const peak = signalPeak(msg);
  return peak > 1e-10 ? evalSignal(msg, t) / peak : 0;
}

/** Default brick-wall passband: ~one message bandwidth either side of the carrier. */
function passband(fc: number, msg: Tone[]): [number, number] {
  const w = Math.max(...msg.map((m) => m.freq)) * 1.5 || fc * 0.1;
  return [fc - w, fc + w];
}

/**
 * Power-law modulator (Proakis Eq 3.3.1–3.3.4): nonlinear device v_o = a1·v_i +
 * a2·v_i², v_i = m + A_c cos(2πf_c t). BPF around f_c keeps the conventional AM
 * term and discards DC, baseband, and 2f_c products.
 */
export function powerLawModulator(
  msg: Tone[], fc: number, Ac: number, a1: number, a2: number, t: number[],
): { vi: number[]; vo: number[]; uBpf: number[] } {
  const fs = t.length > 1 ? 1 / (t[1] - t[0]) : 1;
  const vi = t.map((tt) => msgNorm(msg, tt) + Ac * Math.cos(2 * Math.PI * fc * tt));
  const vo = vi.map((v) => a1 * v + a2 * v * v);
  const [lo, hi] = passband(fc, msg);
  return { vi, vo, uBpf: bandpassFilterFFT(vo, fs, lo, hi) };
}

/** Switching modulator (Proakis Eq 3.3.5–3.3.9): v_i × unipolar square wave s(t); BPF extracts AM. */
export function switchingModulator(
  msg: Tone[], fc: number, Ac: number, t: number[], nHarmonics: number,
): { s: number[]; vo: number[]; uBpf: number[] } {
  const fs = t.length > 1 ? 1 / (t[1] - t[0]) : 1;
  const s = t.map((tt) => squareWave(fc, tt, nHarmonics, false));
  const vo = t.map((tt, i) => (msgNorm(msg, tt) + Ac * Math.cos(2 * Math.PI * fc * tt)) * s[i]);
  const [lo, hi] = passband(fc, msg);
  return { s, vo, uBpf: bandpassFilterFFT(vo, fs, lo, hi) };
}

/** Balanced modulator (Proakis Fig 3.25): two AM modulators (+m, −m) differenced → DSB-SC = 2 A_c m cos. */
export function balancedModulator(
  msg: Tone[], fc: number, Ac: number, t: number[],
): { upper: number[]; lower: number[]; uOut: number[] } {
  const upper = t.map((tt) => Ac * (1 + msgNorm(msg, tt)) * Math.cos(2 * Math.PI * fc * tt));
  const lower = t.map((tt) => Ac * (1 - msgNorm(msg, tt)) * Math.cos(2 * Math.PI * fc * tt));
  const uOut = upper.map((u, i) => u - lower[i]);
  return { upper, lower, uOut };
}

/** Ring modulator (Proakis Eq 3.3.10–3.3.11): m(t) × bipolar square carrier c(t); BPF extracts DSB-SC. */
export function ringModulator(
  msg: Tone[], fc: number, t: number[], nHarmonics: number,
): { c: number[]; vo: number[]; uBpf: number[] } {
  const fs = t.length > 1 ? 1 / (t[1] - t[0]) : 1;
  const c = t.map((tt) => squareWave(fc, tt, nHarmonics, true));
  const vo = t.map((tt, i) => msgNorm(msg, tt) * c[i]);
  const [lo, hi] = passband(fc, msg);
  return { c, vo, uBpf: bandpassFilterFFT(vo, fs, lo, hi) };
}

/**
 * RC envelope detector (Proakis Fig 3.27): a diode charges the capacitor to the
 * input peak; between peaks the capacitor discharges through R with time constant
 * RC. Good tracking requires 1/f_c ≪ RC ≪ 1/W (Fig 3.28).
 */
export function envelopeDetect(u: number[], fs: number, rc: number): number[] {
  const dt = 1 / fs;
  const decay = Math.exp(-dt / Math.max(rc, dt));
  const out = new Array<number>(u.length).fill(0);
  let cap = 0;
  for (let n = 0; n < u.length; n++) {
    const rect = Math.abs(u[n]);
    if (rect >= cap) cap = rect;
    else cap *= decay;
    out[n] = cap;
  }
  return out;
}
