// src/lib/dsp/eye.ts — eye-diagram traces and quantitative margins (Proakis §8.3, Fig 8.7).
import { pulseWaveform } from '@/lib/dsp/pulse';
import { convolve } from '@/lib/dsp/matchedfilter';

export interface EyeTrace {
  samples: number[];
  /** Symbol-pattern label for the formation build-up (e.g. "0 1 0"). */
  label?: string;
}

/** Slice a sampled baseband signal into overlapping windows of `spanSymbols` symbols (step = sps). */
export function eyeTraces(signal: number[], sps: number, spanSymbols: number): EyeTrace[] {
  const win = spanSymbols * sps;
  const traces: EyeTrace[] = [];
  for (let start = 0; start + win <= signal.length; start += sps) {
    traces.push({ samples: signal.slice(start, start + win) });
  }
  return traces;
}

export interface EyeMetrics {
  eyeHeight: number;
  noiseMargin: number;
  timingMargin: number;
}

/** Vertical opening at the center column, and how wide (in time) the eye stays open. */
export function eyeMetrics(traces: EyeTrace[], sps: number): EyeMetrics {
  if (traces.length === 0) return { eyeHeight: 0, noiseMargin: 0, timingMargin: 0 };
  const cols = traces[0].samples.length;
  const mid = Math.floor(cols / 2);

  const openingAt = (col: number): number => {
    let minUpper = Infinity;
    let maxLower = -Infinity;
    let sawUpper = false;
    let sawLower = false;
    for (const tr of traces) {
      const v = tr.samples[col];
      if (v >= 0) {
        sawUpper = true;
        if (v < minUpper) minUpper = v;
      } else {
        sawLower = true;
        if (v > maxLower) maxLower = v;
      }
    }
    if (!sawUpper || !sawLower) return 0;
    return minUpper - maxLower;
  };

  const eyeHeight = Math.max(0, openingAt(mid));
  let open = 0;
  for (let c = 0; c < cols; c++) if (openingAt(c) > 0) open++;
  return { eyeHeight, noiseMargin: eyeHeight / 2, timingMargin: Math.min(1, open / sps) };
}

// ── §10.3 Eye-pattern formation & ISI interpretation ────────────────────────

// Roll-off of the raised-cosine base pulse used for the ISI eye demonstration.
const ISI_ROLLOFF = 0.35;

/** M-ary PAM amplitude levels (Proakis §10.3): binary ±1, quaternary ±1, ±3. */
function pamLevelSet(M: 2 | 4): number[] {
  return M === 2 ? [-1, 1] : [-3, -1, 1, 3];
}

/**
 * Eye-pattern realizations for EVERY symbol sequence of length L = 2K+1 (Proakis §10.3,
 * Fig. 10.8). Each trace is the 2-symbol display window of y(t)=Σ_n a_n x(t−nT), where
 * the effective pulse x is a raised cosine passed through a one-symbol echo channel
 * [1, isiGain] — the ISI term of Eq. 10.3.3. isiGain=0 ⇒ Nyquist (eye open); larger
 * isiGain smears each symbol into its neighbour's sampling instant and closes the eye.
 */
export function isiEyePatterns(
  sps: number,
  M: 2 | 4,
  neighborK: number,
  isiGain: number,
): EyeTrace[] {
  const levels = pamLevelSet(M);
  const L = 2 * neighborK + 1;
  const span = neighborK + 1;
  const p = pulseWaveform('rc', ISI_ROLLOFF, sps, span);
  const pCenter = (p.length - 1) / 2;
  // One-symbol echo at symbol spacing: h[0]=1 (main pulse), h[sps]=isiGain (ISI tail).
  const h = new Array<number>(sps + 1).fill(0);
  h[0] = 1;
  h[sps] = isiGain;
  const x = convolve(p, h); // effective ISI pulse

  const win = 2 * sps; // 2-symbol display window (one open eye)
  const symbolName = (a: number): string => (M === 2 ? (a > 0 ? '1' : '0') : String(a));

  const traces: EyeTrace[] = [];
  const seq = new Array<number>(L).fill(levels[0]);
  const total = Math.pow(levels.length, L);

  for (let s = 0; s < total; s++) {
    let rem = s;
    for (let i = 0; i < L; i++) {
      seq[i] = levels[rem % levels.length];
      rem = Math.floor(rem / levels.length);
    }
    // Impulse train: symbol i at sample i*sps, convolved with the effective pulse.
    const impulses = new Array<number>(L * sps).fill(0);
    for (let i = 0; i < L; i++) impulses[i * sps] = seq[i];
    const sig = convolve(impulses, x);
    // Centre symbol (index K) peaks at sample K*sps + pCenter; window = ±1 symbol around it.
    const centerSample = neighborK * sps + pCenter;
    const start = Math.round(centerSample - sps);
    const samples = sig.slice(start, start + win);
    if (samples.length === win) {
      traces.push({ samples, label: seq.map(symbolName).join(' ') });
    }
  }
  return traces;
}
