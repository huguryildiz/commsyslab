// Ref: Proakis & Salehi §9.7 (Convolutional Codes) & §9.7.2 (Viterbi Algorithm).
// A (2,1,L) rate-1/2 code. Register = [u_t, u_{t-1}, ..., u_{t-L+1}] (length L).
// State = the L-1 memory bits as an integer; register[i] = (state >> (L-1-i)) & 1 for i>=1,
// register[0] = input. Output b_j = XOR_i g_j[i]*register[i].  Sums are mod 2.
import { qfunc } from './math';

export interface ConvCode {
  L: number; // constraint length
  g1: number[]; // generator taps, length L
  g2: number[]; // generator taps, length L
  nStates: number; // 2^(L-1)
}

export interface Branch {
  input: number;
  next: number;
  out: number[]; // [b1, b2]
}

/** Construct a (2,1,L) code; validates the generator lengths. */
export function makeConvCode(L: number, g1: number[], g2: number[]): ConvCode {
  if (g1.length !== L || g2.length !== L) throw new Error('generator length must equal L');
  return { L, g1, g2, nStates: 1 << (L - 1) };
}

/** The two output bits for a (state, input) transition. §9.7 Eq. 9.7.1. */
export function branchOutputs(state: number, input: number, code: ConvCode): number[] {
  const { L, g1, g2 } = code;
  // register[0] = input; register[i] = (state >> (L-1-i)) & 1
  const reg = new Array<number>(L);
  reg[0] = input & 1;
  for (let i = 1; i < L; i++) reg[i] = (state >> (L - 1 - i)) & 1;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < L; i++) {
    b1 ^= g1[i] & reg[i];
    b2 ^= g2[i] & reg[i];
  }
  return [b1, b2];
}

/** Next encoder state after shifting `input` into the register. §9.7.1. */
export function nextState(state: number, input: number, L: number): number {
  const mask = (1 << (L - 1)) - 1;
  return (((input & 1) << (L - 2)) | (state >> 1)) & mask;
}

/** Per-state branch table: trellis[state][input] = Branch. §9.7.1 (Fig 9.26/9.27). */
export function buildTrellis(code: ConvCode): Branch[][] {
  const tr: Branch[][] = [];
  for (let s = 0; s < code.nStates; s++) {
    tr.push([
      { input: 0, next: nextState(s, 0, code.L), out: branchOutputs(s, 0, code) },
      { input: 1, next: nextState(s, 1, code.L), out: branchOutputs(s, 1, code) },
    ]);
  }
  return tr;
}

/** Encode info bits; append L-1 tail zeros to flush the encoder back to state 0. §9.7. */
export function encodeConv(bits: number[], code: ConvCode): number[] {
  const seq = bits.concat(new Array<number>(code.L - 1).fill(0));
  let state = 0;
  const out: number[] = [];
  for (const u of seq) {
    const [b1, b2] = branchOutputs(state, u, code);
    out.push(b1, b2);
    state = nextState(state, u, code.L);
  }
  return out;
}

// Proakis Example 9.7.1 (Fig 9.25): (2,1,3), d_free = 5, non-catastrophic.
export const BOOK_CODE: ConvCode = makeConvCode(3, [1, 0, 1], [1, 1, 1]);

/** Hamming weight of a bit vector. */
function bitWeight(v: number[]): number {
  let w = 0;
  for (const b of v) w += b & 1;
  return w;
}

/**
 * Free distance: min output Hamming weight of a path that leaves state 0 and first
 * returns to state 0 (Dijkstra over branch output-weights). §9.7.1 / Eq. 9.7.5.
 * Returns Infinity if no remerge within the search bound (e.g. catastrophic input).
 */
export function freeDistance(code: ConvCode): number {
  const { nStates, L } = code;
  const CAP = 8 * L * nStates; // generous bound; non-catastrophic codes remerge quickly
  // dist[s] = min output weight to reach s having diverged from state 0.
  const dist = new Array<number>(nStates).fill(Infinity);
  // Diverge via input 1 (input 0 keeps state 0 = the all-zero codeword, excluded).
  const s1 = nextState(0, 1, L);
  dist[s1] = bitWeight(branchOutputs(0, 1, code));
  let best = Infinity;
  // Simple bounded Dijkstra with a visited-pop loop.
  const done = new Array<boolean>(nStates).fill(false);
  for (let iter = 0; iter < CAP; iter++) {
    // pick the unfinished state with the smallest dist
    let s = -1;
    let d = Infinity;
    for (let i = 0; i < nStates; i++) {
      if (!done[i] && dist[i] < d) {
        d = dist[i];
        s = i;
      }
    }
    if (s === -1) break;
    done[s] = true;
    for (let input = 0; input < 2; input++) {
      const ns = nextState(s, input, L);
      const w = d + bitWeight(branchOutputs(s, input, code));
      if (ns === 0) {
        if (w < best) best = w; // remerged
      } else if (w < dist[ns] && !done[ns]) {
        dist[ns] = w;
      }
    }
  }
  return best;
}

/**
 * Info-weight spectrum {d -> beta_d} for first-return paths of output weight <= maxD,
 * where beta_d sums the input weights (info-bit errors) of weight-d paths. §9.7.3.
 * Used for the leading union-bound term. DFS, pruned by output weight and a depth cap.
 */
export function weightSpectrum(code: ConvCode, maxD: number): Map<number, number> {
  const { L } = code;
  const beta = new Map<number, number>();
  const CAP = 64;
  const visit = (state: number, outW: number, inW: number, depth: number): void => {
    if (depth > CAP) return;
    for (let input = 0; input < 2; input++) {
      const ns = nextState(state, input, L);
      const no = outW + bitWeight(branchOutputs(state, input, code));
      const ni = inW + input;
      if (no > maxD) continue;
      if (ns === 0) {
        if (state !== 0) beta.set(no, (beta.get(no) ?? 0) + ni); // real first-return
      } else {
        visit(ns, no, ni, depth + 1);
      }
    }
  };
  // Start by diverging via input 1 (input 0 -> state 0 is the trivial all-zero path).
  const s1 = nextState(0, 1, L);
  visit(s1, bitWeight(branchOutputs(0, 1, code)), 1, 1);
  return beta;
}

/** GF(2) polynomial from taps: bit i = coefficient of D^i. */
function polyOf(taps: number[]): number {
  let p = 0;
  for (let i = 0; i < taps.length; i++) p |= (taps[i] & 1) << i;
  return p;
}

/** GF(2) polynomial gcd via Euclid (XOR division). */
function gf2Gcd(a: number, b: number): number {
  const deg = (x: number) => (x === 0 ? -1 : 31 - Math.clz32(x));
  while (b !== 0) {
    while (deg(a) >= deg(b) && a !== 0) a ^= b << (deg(a) - deg(b));
    [a, b] = [b, a];
  }
  return a;
}

/**
 * A code is catastrophic iff gcd(g1(D), g2(D)) over GF(2) is not a monomial D^a
 * (equivalently, a zero-output-weight loop through a nonzero state exists). §9.7.1.
 */
export function isCatastrophic(code: ConvCode): boolean {
  const g = gf2Gcd(polyOf(code.g1), polyOf(code.g2));
  if (g === 0) return true; // both generators zero — degenerate
  const isMonomial = (g & (g - 1)) === 0; // single bit set => D^a
  return !isMonomial;
}

function hammingBits(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += (a[i] ^ b[i]) & 1;
  return d;
}

export interface ViterbiStep {
  t: number; // branch index
  recv: number[]; // n received bits this branch
  branchMetric: number[][]; // [fromState][input] = Hamming(branchOut, recv)
  metric: number[]; // accumulated path metric per state AFTER this branch (Infinity = unreachable)
  survivor: (number | null)[]; // predecessor state on the surviving path into each state
}

export interface ViterbiResult {
  steps: ViterbiStep[];
  mlPath: number[]; // state sequence (length steps+1), starts and ends at state 0
  decoded: number[]; // recovered info bits (tail removed)
  finalMetric: number;
}

/** Hard-decision Viterbi (Hamming metric). Assumes the encoder was flushed to state 0. §9.7.2. */
export function viterbiDecode(received: number[], code: ConvCode): ViterbiResult {
  const { nStates, L } = code;
  const m = received.length / 2; // branches
  let metric = new Array<number>(nStates).fill(Infinity);
  metric[0] = 0;
  const steps: ViterbiStep[] = [];
  const survivorsByT: (number | null)[][] = [];

  for (let t = 0; t < m; t++) {
    const recv = [received[2 * t], received[2 * t + 1]];
    const next = new Array<number>(nStates).fill(Infinity);
    const survivor = new Array<number | null>(nStates).fill(null);
    const branchMetric: number[][] = Array.from({ length: nStates }, () => [0, 0]);
    for (let s = 0; s < nStates; s++) {
      if (metric[s] === Infinity) continue;
      for (let input = 0; input < 2; input++) {
        const ns = nextState(s, input, L);
        const bw = hammingBits(branchOutputs(s, input, code), recv);
        branchMetric[s][input] = bw;
        const cand = metric[s] + bw;
        if (cand < next[ns]) {
          next[ns] = cand;
          survivor[ns] = s;
        }
      }
    }
    steps.push({ t, recv, branchMetric, metric: next.slice(), survivor: survivor.slice() });
    survivorsByT.push(survivor);
    metric = next;
  }

  // Traceback from state 0 (flushed). input = top memory bit of the next state.
  const mlPath = new Array<number>(m + 1);
  mlPath[m] = 0;
  const decodedFull: number[] = [];
  let s = 0;
  for (let t = m - 1; t >= 0; t--) {
    const prev = survivorsByT[t][s] ?? 0;
    mlPath[t] = prev;
    decodedFull[t] = (s >> (L - 2)) & 1; // the input that produced state s
    s = prev;
  }
  const decoded = decodedFull.slice(0, m - (L - 1)); // drop L-1 tail bits
  return { steps, mlPath, decoded, finalMetric: metric[0] };
}

/** C(n,k) via a numerically gentle product. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

const RATE = 0.5; // R_c = k/n = 1/2

/**
 * Soft-decision leading union-bound term: beta_dfree * Q(sqrt(2*R_c*d_free*Eb/N0)). §9.7.3.
 * Asymptotic coding gain ~ 10*log10(R_c*d_free) dB over uncoded BPSK.
 */
export function convBerSoftBound(code: ConvCode, ebN0Db: number): number {
  const d = freeDistance(code);
  if (!isFinite(d)) return NaN;
  const beta = weightSpectrum(code, d).get(d) ?? 1;
  const g = 10 ** (ebN0Db / 10);
  return beta * qfunc(Math.sqrt(2 * RATE * d * g));
}

/**
 * Hard-decision leading union-bound term: beta_dfree * P2(d_free), with the BSC pairwise
 * error probability P2(d) = sum_{e>d/2} C(d,e) p^e (1-p)^(d-e) (+ half the e=d/2 term if d
 * even), p = Q(sqrt(2*R_c*Eb/N0)). §9.7.3.
 */
export function convBerHardBound(code: ConvCode, ebN0Db: number): number {
  const d = freeDistance(code);
  if (!isFinite(d)) return NaN;
  const beta = weightSpectrum(code, d).get(d) ?? 1;
  const g = 10 ** (ebN0Db / 10);
  const p = qfunc(Math.sqrt(2 * RATE * g));
  let p2 = 0;
  for (let e = Math.floor(d / 2) + 1; e <= d; e++) {
    p2 += binom(d, e) * p ** e * (1 - p) ** (d - e);
  }
  if (d % 2 === 0) {
    p2 += 0.5 * binom(d, d / 2) * p ** (d / 2) * (1 - p) ** (d / 2);
  }
  return beta * p2;
}
