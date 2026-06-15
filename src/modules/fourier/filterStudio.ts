/**
 * Filter Studio model (Filters tab). Pure functions only.
 *
 * Filtering is Y(f) = H(f)·X(f) (Proakis & Salehi §2.4, p. 85), applied
 * uniformly via the FFT: sample the source → fft → multiply each bin by the
 * (real, zero-phase) magnitude |H(f_k)| → ifft. Zero-phase keeps the surface
 * story about *which frequencies survive* clean, with no group-delay distortion.
 */

import { fft, ifft, type Complex } from '@/lib/dsp/fft';
import { transferMag } from '@/lib/dsp/fourier';
import { butterworthResponse } from '@/lib/dsp/analogfilters';
import { periodicWave } from '@/lib/dsp/signals';

export type StudioSource = 'square' | 'sawtooth' | 'triangle' | 'pulse' | 'multitone' | 'white' | 'pink';
export type StudioFilterType = 'lpf' | 'hpf' | 'bpf' | 'bsf';
export type StudioResponse = 'ideal' | 'butterworth';

export interface MultiTone { freq: number; amp: number; }

export interface FilterStudioParams {
  source: StudioSource;
  f0: number;            // fundamental for waves (Hz)
  duty: number;          // pulse duty cycle
  tones: MultiTone[];    // for the multitone source
  filterType: StudioFilterType;
  response: StudioResponse;
  fc: number;            // cutoff / lower edge (Hz)
  fc2: number;           // upper edge (Hz) for BPF/BSF
  order: number;         // Butterworth order N
  tStart: number;        // animation scroll (s)
}

export interface FilterStudioView {
  fs: number;
  time: number[];
  xInput: number[];
  yOutput: number[];
  freqs: number[];   // one-sided grid (Hz)
  magX: number[];
  magH: number[];
  magY: number[];
  fMax: number;
}

const N = 1024;                // FFT length
export const STUDIO_FS = 1000; // sample rate (Hz) → Nyquist 500 Hz

export const DEFAULT_STUDIO: FilterStudioParams = {
  source: 'square', f0: 50, duty: 0.5,
  tones: [{ freq: 50, amp: 1 }, { freq: 150, amp: 0.7 }, { freq: 350, amp: 0.5 }],
  filterType: 'lpf', response: 'ideal', fc: 100, fc2: 300, order: 4, tStart: 0,
};

/** Deterministic [-1,1] noise via a mulberry32-style PRNG (stable display). */
function seededNoise(count: number, pink: boolean): number[] {
  let s = 0x9e3779b9 >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const white = Array.from({ length: count }, () => 2 * rnd() - 1);
  if (!pink) return white;
  // Simple one-pole pink-ish shaping (low-frequency leaning): y[n] = 0.97·y[n-1] + 0.03·x[n].
  const out = new Array<number>(count).fill(0);
  let prev = 0;
  for (let i = 0; i < count; i++) { prev = 0.97 * prev + 0.03 * white[i]; out[i] = prev * 3; }
  return out;
}

/** Sample the chosen source over the display window (scrolled by tStart). */
function sampleSource(p: FilterStudioParams): number[] {
  const dt = 1 / STUDIO_FS;
  if (p.source === 'white' || p.source === 'pink') return seededNoise(N, p.source === 'pink');
  if (p.source === 'multitone') {
    return Array.from({ length: N }, (_, i) => {
      const t = p.tStart + i * dt;
      return p.tones.reduce((s, tone) => s + tone.amp * Math.cos(2 * Math.PI * tone.freq * t), 0);
    });
  }
  const kind = p.source; // narrowed to Periodic: 'square' | 'sawtooth' | 'triangle' | 'pulse'
  return Array.from({ length: N }, (_, i) => periodicWave(kind, p.f0, p.tStart + i * dt, p.duty));
}

/** |H(f)| for the selected type + response. */
export function studioMagH(p: FilterStudioParams, f: number): number {
  if (p.response === 'ideal') return transferMag(p.filterType, f, p.fc, p.fc2);
  return butterworthResponse(p.filterType, f, p.fc, p.fc2, p.order);
}

export function buildFilterStudio(p: FilterStudioParams): FilterStudioView {
  const x = sampleSource(p);
  const X = fft(x);
  const half = N / 2;

  // Apply H to the full (two-sided) spectrum; H(|f|) preserves conjugate
  // symmetry so the inverse transform stays real.
  const Y: Complex[] = X.map((c, k) => {
    const f = (k <= half ? k : k - N) * (STUDIO_FS / N);
    const h = studioMagH(p, f);
    return { re: c.re * h, im: c.im * h };
  });

  const freqs: number[] = [];
  const magX: number[] = [];
  const magH: number[] = [];
  const magY: number[] = [];
  for (let k = 0; k <= half; k++) {
    const f = k * (STUDIO_FS / N);
    const h = studioMagH(p, f);
    const mx = Math.hypot(X[k].re, X[k].im) / N; // normalized for display
    freqs.push(f);
    magX.push(mx);
    magH.push(h);
    magY.push(mx * h);
  }

  const yOutput = ifft(Y).map((c) => c.re);
  const dt = 1 / STUDIO_FS;
  const time = Array.from({ length: N }, (_, i) => i * dt);

  return { fs: STUDIO_FS, time, xInput: x, yOutput, freqs, magX, magH, magY, fMax: STUDIO_FS / 2 };
}
