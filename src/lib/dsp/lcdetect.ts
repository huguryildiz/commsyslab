// Matched-filter / correlator detection of baseband line codes (Proakis §8.3.2,
// Matched-Filter Demodulator, p. 371). Each code maps a bit to a per-bit template
// pulse p(t); the optimum receiver correlates the received signal against p(t) and
// samples at the decision instant.
import { convolve, matchedFilter } from '@/lib/dsp/matchedfilter';
import { qfunc } from '@/lib/dsp/math';
import { ebN0Linear } from '@/lib/dsp/awgn';

/** Antipodal line codes detected by this tab, plus unipolar NRZ (OOK, non-antipodal). */
export type DetectCode = 'polar-nrz' | 'manchester' | 'polar-rz' | 'unipolar-nrz';

/** Per-bit matched-filter template p(t), sampled at `sps` samples/bit, amplitude 1. */
export function lineCodeTemplate(code: DetectCode, sps: number): number[] {
  const half = Math.floor(sps / 2);
  const p = new Array<number>(sps).fill(0);
  switch (code) {
    case 'polar-nrz':
    case 'unipolar-nrz':
      return p.map(() => 1);
    case 'manchester':
      return p.map((_, i) => (i < half ? 1 : -1));
    case 'polar-rz':
      return p.map((_, i) => (i < half ? 1 : 0));
  }
}

/** True if the code is antipodal (decision threshold 0); OOK is on-off (threshold 0.5). */
export function isAntipodal(code: DetectCode): boolean {
  return code !== 'unipolar-nrz';
}

/** Template energy E = Σ p², in sample units. */
export function templateEnergy(code: DetectCode, sps: number): number {
  return lineCodeTemplate(code, sps).reduce((s, v) => s + v * v, 0);
}

/** Sampled transmitted waveform g[n] for a bit stream (sps samples/bit). */
export function lineCodeStream(bits: number[], code: DetectCode, sps: number): number[] {
  const p = lineCodeTemplate(code, sps);
  const antipodal = isAntipodal(code);
  const out: number[] = [];
  for (const bit of bits) {
    const a = antipodal ? (bit ? 1 : -1) : bit ? 1 : 0;
    for (let i = 0; i < sps; i++) out.push(a * p[i]);
  }
  return out;
}

export interface CorrelatorResult {
  /** Running detector output per sample (length = x.length for correlator, x.length+sps−1 for MF). */
  g0: number[];
  /** Decision statistic at each bit's sampling instant. */
  samples: number[];
  /** Index into g0 of each sampling instant. */
  sampleIdx: number[];
  /** Time (in bit periods T) of each sampling instant. */
  sampleT: number[];
}

/**
 * Integrate-and-dump correlator, reset at each bit boundary. Within bit k it accumulates
 * (1/E)∫ x·p; at the bit end the value equals the symbol amplitude for a clean signal.
 */
export function correlatorRun(x: number[], code: DetectCode, sps: number): CorrelatorResult {
  const p = lineCodeTemplate(code, sps);
  const E = templateEnergy(code, sps);
  const nBits = Math.floor(x.length / sps);
  const g0 = new Array<number>(nBits * sps).fill(0);
  const samples: number[] = [];
  const sampleIdx: number[] = [];
  const sampleT: number[] = [];
  for (let k = 0; k < nBits; k++) {
    let acc = 0;
    for (let i = 0; i < sps; i++) {
      const n = k * sps + i;
      acc += x[n] * p[i];
      g0[n] = acc / E;
    }
    const idx = k * sps + sps - 1;
    samples.push(g0[idx]);
    sampleIdx.push(idx);
    sampleT.push(idx / sps);
  }
  return { g0, samples, sampleIdx, sampleT };
}

/**
 * Matched-filter realization: y(t) = (x ∗ h)/E with h(t)=p(T−t). The output sampled at the
 * end of each bit equals the correlator statistic (§8.3.2 equivalence).
 */
export function matchedFilterStream(x: number[], code: DetectCode, sps: number): CorrelatorResult {
  const p = lineCodeTemplate(code, sps);
  const E = templateEnergy(code, sps);
  const h = matchedFilter(p);
  const conv = convolve(x, h).map((v) => v / E);
  const nBits = Math.floor(x.length / sps);
  const samples: number[] = [];
  const sampleIdx: number[] = [];
  const sampleT: number[] = [];
  for (let k = 0; k < nBits; k++) {
    const idx = (k + 1) * sps - 1; // full-overlap instant for bit k
    samples.push(conv[idx]);
    sampleIdx.push(idx);
    sampleT.push(idx / sps);
  }
  return { g0: conv, samples, sampleIdx, sampleT };
}

/** Threshold decision on per-bit statistics → detected bits (0/1). */
export function decide(samples: number[], code: DetectCode): number[] {
  const thr = isAntipodal(code) ? 0 : 0.5;
  return samples.map((s) => (s > thr ? 1 : 0));
}

/** Theoretical bit-error probability: antipodal Q(√(2Eb/N₀)), OOK Q(√(Eb/N₀)). */
export function theoreticalPb(code: DetectCode, ebN0Db: number): number {
  const g = ebN0Linear(ebN0Db);
  return isAntipodal(code) ? qfunc(Math.sqrt(2 * g)) : qfunc(Math.sqrt(g));
}

/**
 * Per-sample AWGN std so the measured BER tracks `theoreticalPb`. The decision statistic
 * noise has variance σ_s²/E; we pick σ_y to match Pb=Q(d/(2σ_y)) then back out σ_s.
 * Antipodal: d=2, arg=√(2·γ) ⇒ σ_y=1/√(2γ). OOK: d=1, arg=√γ ⇒ σ_y=1/(2√γ).
 */
export function sampleNoiseSigma(code: DetectCode, ebN0Db: number, sps: number): number {
  const g = ebN0Linear(ebN0Db);
  const E = templateEnergy(code, sps);
  const sigmaY = isAntipodal(code) ? 1 / Math.sqrt(2 * g) : 1 / (2 * Math.sqrt(g));
  return sigmaY * Math.sqrt(E);
}
