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
