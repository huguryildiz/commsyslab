// src/lib/dsp/eye.ts — eye-diagram traces and quantitative margins (Proakis §8.3, Fig 8.7).

export interface EyeTrace {
  samples: number[];
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
