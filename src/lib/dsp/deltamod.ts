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

export interface AdmResult {
  bits: Bit[];
  staircase: number[];
  /** Step size used at each sample (for the step-tracking plot). */
  steps: number[];
}

/**
 * Adaptive delta modulation (Jayant). The step grows by factor K when the last two
 * bits agree (the staircase is chasing a steep slope → fight slope overload) and
 * shrinks by K when they alternate (granular hunting on a flat input), clamped to
 * [stepMin, stepMax]. Proakis §7.4.3, Eq. 7.4.17 (K > 1).
 */
export function adaptiveDeltaModulate(
  signal: number[],
  step0: number,
  K = 1.5,
  x0 = 0,
  stepMin = step0,
  stepMax = step0 * 8,
): AdmResult {
  const bits: Bit[] = [];
  const staircase: number[] = [];
  const steps: number[] = [];
  let xhat = x0;
  let delta = step0;
  let prevBit: Bit | null = null;
  for (const x of signal) {
    const bit: Bit = x >= xhat ? 1 : 0;
    if (prevBit !== null) {
      delta = bit === prevBit ? delta * K : delta / K;
      delta = Math.min(stepMax, Math.max(stepMin, delta));
    }
    xhat += bit === 1 ? delta : -delta;
    bits.push(bit);
    staircase.push(xhat);
    steps.push(delta);
    prevBit = bit;
  }
  return { bits, staircase, steps };
}

/** Reconstruct the ADM staircase from its bits (mirrors adaptiveDeltaModulate). */
export function adaptiveDeltaDemodulate(
  bits: Bit[],
  step0: number,
  K = 1.5,
  x0 = 0,
  stepMin = step0,
  stepMax = step0 * 8,
): number[] {
  const out: number[] = [];
  let xhat = x0;
  let delta = step0;
  let prevBit: Bit | null = null;
  for (const bit of bits) {
    if (prevBit !== null) {
      delta = bit === prevBit ? delta * K : delta / K;
      delta = Math.min(stepMax, Math.max(stepMin, delta));
    }
    xhat += bit === 1 ? delta : -delta;
    out.push(xhat);
    prevBit = bit;
  }
  return out;
}
