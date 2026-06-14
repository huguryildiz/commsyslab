/** A single sinusoidal component: amp * cos(2*pi*freq*t + phase). */
export interface Tone {
  freq: number;
  amp: number;
  phase?: number;
}

/** Evaluate the sum-of-sinusoids signal at time t (seconds). */
export function evalSignal(tones: Tone[], t: number): number {
  let v = 0;
  for (const tone of tones) {
    v += tone.amp * Math.cos(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
  }
  return v;
}

/** Bandwidth W = highest component frequency (Hz). 0 for an empty signal. */
export function signalBandwidth(tones: Tone[]): number {
  let w = 0;
  for (const tone of tones) w = Math.max(w, Math.abs(tone.freq));
  return w;
}

/** Peak amplitude bound m_max = sum of |amp| (worst-case alignment). */
export function signalPeak(tones: Tone[]): number {
  let p = 0;
  for (const tone of tones) p += Math.abs(tone.amp);
  return p;
}

/** Average power P_M = sum of amp^2 / 2 (distinct nonzero frequencies). */
export function signalPower(tones: Tone[]): number {
  let p = 0;
  for (const tone of tones) p += (tone.amp * tone.amp) / 2;
  return p;
}

/** Periodic non-sinusoidal waveform kinds (Fourier-series sources). */
export type Periodic = 'square' | 'triangle' | 'sawtooth' | 'pulse';

/**
 * Value of a unit-amplitude periodic waveform at time t (s), fundamental f0 (Hz).
 * square/triangle/sawtooth swing in [-1, 1]; pulse is {0, 1} with `duty` (default 0.5).
 * Proakis & Salehi §2.1 (Fourier-series example waveforms).
 */
export function periodicWave(kind: Periodic, f0: number, t: number, duty = 0.5): number {
  let ph = (t * f0) % 1; // fractional position in [0,1)
  if (ph < 0) ph += 1;
  switch (kind) {
    case 'square':
      return ph < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * ph - 1;
    case 'triangle':
      return ph < 0.5 ? -1 + 4 * ph : 3 - 4 * ph;
    case 'pulse':
      return ph < duty ? 1 : 0;
  }
}

// --- Basic signals (Proakis & Salehi §2.1.1–§2.1.3) ---

/** Rectangular pulse Π(t/width): 1 for |t| ≤ width/2, else 0. */
export function rectPulse(t: number, width: number): number {
  return Math.abs(t) <= width / 2 ? 1 : 0;
}

/** Triangular pulse Λ(t/width): 1 at t=0, linearly to 0 at |t|=width. */
export function triPulse(t: number, width: number): number {
  const a = Math.abs(t) / width;
  return a < 1 ? 1 - a : 0;
}

/** Unit step u(t): 1 for t ≥ 0, else 0. */
export function unitStep(t: number): number {
  return t >= 0 ? 1 : 0;
}

/** Signum sgn(t): −1, 0, +1. */
export function sgn(t: number): number {
  return t > 0 ? 1 : t < 0 ? -1 : 0;
}

/** One-sided decaying exponential e^{−t/τ}·u(t). */
export function expSignal(t: number, tau: number): number {
  return t >= 0 ? Math.exp(-t / tau) : 0;
}

export interface SignalClass {
  type: 'energy' | 'power';
  even: boolean;
  odd: boolean;
}

/**
 * Classify a sampled signal as energy- vs power-type and even/odd.
 * Proakis §2.1.2. Energy-type if total energy is finite (here: bounded and
 * decaying toward the window edges); symmetry tested numerically.
 */
export function classifySignal(_t: number[], x: number[]): SignalClass {
  const n = x.length;
  const edge = Math.max(Math.abs(x[0]), Math.abs(x[n - 1]));
  const peak = Math.max(...x.map(Math.abs), 1e-12);
  const type: SignalClass['type'] = edge < 0.05 * peak ? 'energy' : 'power';
  let even = true;
  let odd = true;
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i;
    if (Math.abs(x[i] - x[j]) > 1e-6 * peak) even = false;
    if (Math.abs(x[i] + x[j]) > 1e-6 * peak) odd = false;
  }
  return { type, even, odd };
}

/** Built-in example signals. */
export const PRESETS: Record<string, Tone[]> = {
  singleTone: [{ freq: 2, amp: 1 }],
  twoTone: [
    { freq: 2, amp: 1 },
    { freq: 5, amp: 0.6 },
  ],
  threeTone: [
    { freq: 1, amp: 1 },
    { freq: 3, amp: 0.5 },
    { freq: 6, amp: 0.35 },
  ],
};
