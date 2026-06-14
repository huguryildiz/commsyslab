import type { Bit } from '@/lib/sim/sources';

export interface DmResult {
  /** One DM bit per input sample (1 = step up, 0 = step down). */
  bits: Bit[];
  /** Predictor value x̂ after each sample (the staircase approximation). */
  staircase: number[];
}

/**
 * 1-bit linear delta modulation. For each input sample, compare to the predictor
 * x̂ (starting at x0): if x[n] >= x̂ emit 1 and x̂ += step, else emit 0 and x̂ -= step.
 * staircase[n] is x̂ AFTER the update.
 */
export function deltaModulate(signal: number[], step: number, x0 = 0): DmResult {
  const bits: Bit[] = [];
  const staircase: number[] = [];
  let xhat = x0;
  for (const x of signal) {
    if (x >= xhat) {
      bits.push(1);
      xhat += step;
    } else {
      bits.push(0);
      xhat -= step;
    }
    staircase.push(xhat);
  }
  return { bits, staircase };
}

/** Reconstruct the staircase from DM bits: +step for 1, -step for 0, starting at x0. */
export function deltaDemodulate(bits: Bit[], step: number, x0 = 0): number[] {
  const out: number[] = [];
  let xhat = x0;
  for (const b of bits) {
    xhat += b === 1 ? step : -step;
    out.push(xhat);
  }
  return out;
}

/**
 * Maximum signal slope the DM staircase can follow: one step per sampling period,
 * i.e. step * fs. Slope overload occurs when max|dx/dt| exceeds this.
 */
export function slopeOverloadLimit(step: number, fs: number): number {
  return step * fs;
}
