// Ref: Proakis & Salehi §9.2 (Channel Capacity): BSC capacity C = 1 − H_b(ε) and the
// Shannon-Hartley AWGN capacity C = B·log2(1 + SNR). Bkz. docs/book-reference.md.
import { binaryEntropy } from './entropy';
import { qfunc } from './math';

/** Capacity of a binary symmetric channel with crossover probability ε: C = 1 − H_b(ε). */
export function bscCapacity(eps: number): number {
  return 1 - binaryEntropy(eps);
}

/** Shannon capacity of a band-limited AWGN channel: C = B·log2(1 + SNR), bits/s. */
export function shannonCapacity(bandwidthHz: number, snrLinear: number): number {
  return bandwidthHz * Math.log2(1 + snrLinear);
}

/** Capacity of the discrete-time AWGN channel: C = 0.5·log2(1 + P/Pn), bits/use. */
export function gaussianCapacity(P: number, Pn: number): number {
  return 0.5 * Math.log2(1 + P / Pn);
}

/** Convert an SNR in decibels to a linear power ratio. */
export function snrDbToLinear(db: number): number {
  return 10 ** (db / 10);
}

// Ref: Proakis & Salehi §9.2, Problem 9.2 — binary erasure channel.
/** Capacity of a binary erasure channel with erasure probability p: C = 1 − p. */
export function becCapacity(p: number): number {
  return 1 - p;
}

// Ref: §9.1 — channel transition matrices P[x][y] = p(y | x) (rows = input, cols = output).
/** BSC transition matrix, inputs/outputs {0,1}, crossover ε. */
export function bscTransition(eps: number): number[][] {
  return [
    [1 - eps, eps],
    [eps, 1 - eps],
  ];
}

/** BEC transition matrix, inputs {0,1}, outputs {0, erasure, 1}, erasure probability p. */
export function becTransition(p: number): number[][] {
  return [
    [1 - p, p, 0],
    [0, p, 1 - p],
  ];
}

// Ref: §9.2 Eq. 9.2.5 — I(X;Y) = Σ_x Σ_y p(x) p(y|x) log2( p(y|x) / p(y) ).
/**
 * Mutual information I(X;Y) in bits for input distribution `px` (length = #inputs) and
 * transition matrix `P` (P[x][y] = p(y|x)). Terms with p(x)=0, p(y|x)=0 or p(y)=0 are skipped.
 */
export function mutualInformation(px: number[], P: number[][]): number {
  const nOut = P[0].length;
  const py = new Array<number>(nOut).fill(0);
  for (let x = 0; x < px.length; x++) {
    for (let y = 0; y < nOut; y++) py[y] += px[x] * P[x][y];
  }
  let I = 0;
  for (let x = 0; x < px.length; x++) {
    for (let y = 0; y < nOut; y++) {
      const pxy = P[x][y];
      if (px[x] > 0 && pxy > 0 && py[y] > 0) {
        I += px[x] * pxy * Math.log2(pxy / py[y]);
      }
    }
  }
  return I;
}

// Ref: §9.1 Eq. 9.1.2 — antipodal AWGN with hard decisions induces a BSC.
/** BSC crossover from hard-decision antipodal AWGN: ε = Q(√(2·Eb/N0)); ebN0 is linear. */
export function awgnHardCrossover(ebN0: number): number {
  return qfunc(Math.sqrt(2 * ebN0));
}

// Ref: §9.2 Eq. 9.2.15 — unconstrained Gaussian capacity per use; antipodal SNR = 2·Eb/N0.
/** Unconstrained Gaussian capacity per use given Eb/N0 (linear): ½·log2(1 + 2·Eb/N0). */
export function awgnSoftCapacityPerUse(ebN0: number): number {
  return 0.5 * Math.log2(1 + 2 * ebN0);
}

// Ref: §9.2, Problem 9.5 — binary-input continuous-output AWGN capacity.
// y = ±a + n, n~N(0,1), a = √(2·Eb/N0). C = 1 − E_n[ log2(1 + e^{−2a(a+n)}) ] (bits/use).
// Evaluated by composite Simpson integration of the N(0,1)-weighted integrand over n∈[−8,8].
/** Capacity per use of the binary-input AWGN channel given Eb/N0 (linear). */
export function biAwgnCapacityPerUse(ebN0: number): number {
  const a = Math.sqrt(2 * ebN0);
  // Numerically stable softplus in base-2: log2(1 + e^x).
  const log2_1pe = (x: number) => (x > 30 ? x / Math.LN2 : Math.log2(1 + Math.exp(x)));
  const f = (n: number) => {
    const phi = Math.exp(-0.5 * n * n) / Math.sqrt(2 * Math.PI);
    return phi * log2_1pe(-2 * a * (a + n));
  };
  const lo = -8;
  const hi = 8;
  const N = 2000; // even
  const step = (hi - lo) / N;
  let s = f(lo) + f(hi);
  for (let i = 1; i < N; i++) s += (i % 2 === 0 ? 2 : 4) * f(lo + i * step);
  const integral = (step / 3) * s;
  return 1 - integral;
}

// Ref: §9.3 Eq. 9.3.5 / 9.3.7 — minimum Eb/N0 for spectral efficiency r = R/W.
/** Minimum Eb/N0 (linear) for reliable comms at spectral efficiency r: (2^r − 1)/r. */
export function shannonLimitEbN0Min(r: number): number {
  return (2 ** r - 1) / r;
}

/** Minimum Eb/N0 in dB at spectral efficiency r; → −1.59 dB as r→0. */
export function shannonLimitEbN0MinDb(r: number): number {
  return 10 * Math.log10(shannonLimitEbN0Min(r));
}

/** log2(e): the normalized infinite-bandwidth capacity ceiling C/(P/N0) (Eq. 9.3.1). */
export const LOG2E = Math.LOG2E;

/** The absolute Shannon limit Eb/N0 = ln2, in dB ≈ −1.59 dB (Eq. 9.3.7). */
export const SHANNON_LIMIT_DB = 10 * Math.log10(Math.LN2);

// Ref: §9.3 Eq. 9.3.1 / Fig. 9.10 — capacity vs bandwidth, normalized by P/N0.
/** Normalized capacity C/(P/N0) as a function of u = W/(P/N0): u·log2(1+1/u); → log2(e). */
export function capacityVsBandwidthNorm(u: number): number {
  if (u <= 0) return 0;
  return u * Math.log2(1 + 1 / u);
}
