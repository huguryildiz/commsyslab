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
