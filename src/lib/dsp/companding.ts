// Proakis §7.4.1 — companding (non-uniform PCM).
// μ-law ref: CCSM mulaw.m / invmulaw.m (Eq. 7.4.8). A-law: Book Eq. 7.4.9.
import { quantize } from './quantize';

export type CompandingLaw = 'mu' | 'A' | 'none';

/** μ-law compressor g(x) = sgn(x)·ln(1+μ|x|)/ln(1+μ), domain x ∈ [-1, 1]. Eq. 7.4.8. */
export function muLawCompress(x: number, mu = 255): number {
  return (Math.sign(x) * Math.log(1 + mu * Math.abs(x))) / Math.log(1 + mu);
}

/** Inverse μ-law expander (Eq. 7.4.8 solved for x). CCSM invmulaw.m. */
export function muLawExpand(y: number, mu = 255): number {
  return (Math.sign(y) * ((1 + mu) ** Math.abs(y) - 1)) / mu;
}

/** A-law compressor (Eq. 7.4.9), domain x ∈ [-1, 1]; A = 87.56 standard.
 *  Linear for |x| < 1/A, logarithmic above; continuous at |x| = 1/A. */
export function aLawCompress(x: number, A = 87.56): number {
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const denom = 1 + Math.log(A);
  if (ax < 1 / A) return (s * A * ax) / denom;
  return (s * (1 + Math.log(A * ax))) / denom;
}

/** Inverse A-law expander. */
export function aLawExpand(y: number, A = 87.56): number {
  const s = Math.sign(y);
  const ay = Math.abs(y);
  const denom = 1 + Math.log(A);
  const thr = 1 / denom; // |y| value at the |x| = 1/A breakpoint
  if (ay < thr) return (s * ay * denom) / A;
  return (s * Math.exp(ay * denom - 1)) / A;
}

/** Companded PCM: normalize → compress → uniform quantize → expand → denormalize.
 *  Proakis §7.4.1, Fig 7.8. Ref CCSM mula_pcm.m. */
export function compandedQuantize(
  x: number,
  mMax: number,
  bits: number,
  law: CompandingLaw,
  param: number,
): number {
  const xn = x / mMax; // normalize to [-1, 1]
  const c =
    law === 'mu' ? muLawCompress(xn, param) : law === 'A' ? aLawCompress(xn, param) : xn;
  const cq = quantize(c, 1, bits, 'midrise'); // uniform quantize on [-1, 1]
  const xe =
    law === 'mu' ? muLawExpand(cq, param) : law === 'A' ? aLawExpand(cq, param) : cq;
  return xe * mMax; // denormalize
}

/** SQNR (dB) of a full-period sinusoid at each amplitude (fraction of full scale)
 *  under the given companding law. Shows companding flattening SQNR vs input level. */
export function sqnrVsAmplitude(
  amplitudes: number[],
  bits: number,
  law: CompandingLaw,
  param: number,
  samples = 2000,
): number[] {
  return amplitudes.map((amp) => {
    let sig = 0;
    let err = 0;
    for (let i = 0; i < samples; i++) {
      const x = amp * Math.sin((2 * Math.PI * i) / samples);
      const q = compandedQuantize(x, 1, bits, law, param);
      sig += x * x;
      err += (x - q) * (x - q);
    }
    return err === 0 ? Infinity : 10 * Math.log10(sig / err);
  });
}
