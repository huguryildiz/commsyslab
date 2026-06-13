// Ref: Proakis & Salehi §9.2 (Channel Capacity): BSC capacity C = 1 − H_b(ε) and the
// Shannon-Hartley AWGN capacity C = B·log2(1 + SNR). Bkz. docs/book-reference.md.
import { binaryEntropy } from './entropy';

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
