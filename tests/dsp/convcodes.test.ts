import { describe, it, expect } from 'vitest';
import {
  makeConvCode,
  nextState,
  branchOutputs,
  buildTrellis,
  encodeConv,
  BOOK_CODE,
  freeDistance,
  weightSpectrum,
  isCatastrophic,
  viterbiDecode,
  viterbiDecodeSoft,
  bpskMap,
  hardSlice,
  awgnSoftReceive,
  convBerHardBound,
  convBerSoftBound,
  distanceSpectrum,
  convBerSoftBoundFull,
  convBerHardBoundFull,
  trellisStateCount,
} from '@/lib/dsp/convcodes';
import { uncodedBerBpsk } from '@/lib/dsp/blockcodes';
import { makeRng } from '@/lib/dsp/random';

describe('convolutional encoder FSM', () => {
  it('BOOK_CODE is the (2,1,3) g1=[1,0,1], g2=[1,1,1] code', () => {
    expect(BOOK_CODE.L).toBe(3);
    expect(BOOK_CODE.g1).toEqual([1, 0, 1]);
    expect(BOOK_CODE.g2).toEqual([1, 1, 1]);
    expect(BOOK_CODE.nStates).toBe(4);
  });
  it('branchOutputs match the book trellis (state 0, input 1 -> 11)', () => {
    expect(branchOutputs(0, 1, BOOK_CODE)).toEqual([1, 1]);
    expect(branchOutputs(2, 0, BOOK_CODE)).toEqual([0, 1]);
    expect(branchOutputs(1, 1, BOOK_CODE)).toEqual([0, 0]);
  });
  it('nextState shifts the input into the top memory bit', () => {
    expect(nextState(0, 1, 3)).toBe(2);
    expect(nextState(2, 0, 3)).toBe(1);
    expect(nextState(1, 1, 3)).toBe(2);
  });
  it('buildTrellis exposes both branches per state', () => {
    const tr = buildTrellis(BOOK_CODE);
    expect(tr.length).toBe(4);
    expect(tr[0][1]).toEqual({ input: 1, next: 2, out: [1, 1] });
    expect(tr[0][0]).toEqual({ input: 0, next: 0, out: [0, 0] });
  });
  it('encodeConv runs the FSM and flushes with L-1 tail zeros back to state 0', () => {
    // Hand-worked from Fig 9.25: input [1,0,1,1] + tail [0,0]
    expect(encodeConv([1, 0, 1, 1], BOOK_CODE)).toEqual([
      1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1,
    ]);
  });
});

describe('free distance, weight spectrum, catastrophic test', () => {
  it('freeDistance(BOOK_CODE) = 5', () => {
    expect(freeDistance(BOOK_CODE)).toBe(5);
  });
  it('weightSpectrum gives beta_dfree = 1 for the book code', () => {
    expect(weightSpectrum(BOOK_CODE, 5).get(5)).toBe(1);
  });
  it('flags the book Fig 9.30 catastrophic code, accepts the good one', () => {
    const bad = makeConvCode(3, [1, 1, 0], [0, 1, 1]); // gcd = 1+D (not a monomial)
    expect(isCatastrophic(bad)).toBe(true);
    expect(isCatastrophic(BOOK_CODE)).toBe(false);
  });
});

describe('Viterbi decoding', () => {
  const input = [1, 0, 1, 1];
  const code = BOOK_CODE;
  const codeword = encodeConv(input, code); // 12 bits, ends at state 0

  it('decodes an error-free word back to the input, metric 0', () => {
    const r = viterbiDecode(codeword, code);
    expect(r.decoded).toEqual(input);
    expect(r.finalMetric).toBe(0);
    expect(r.mlPath[0]).toBe(0);
    expect(r.mlPath[r.mlPath.length - 1]).toBe(0);
  });
  it('corrects a single channel error (within d_free capability)', () => {
    const recv = codeword.slice();
    recv[3] ^= 1;
    const r = viterbiDecode(recv, code);
    expect(r.decoded).toEqual(input);
    expect(r.finalMetric).toBe(1);
  });
  it('exposes one snapshot per branch with per-state metrics', () => {
    const r = viterbiDecode(codeword, code);
    expect(r.steps.length).toBe(codeword.length / 2);
    expect(r.steps[0].metric.length).toBe(code.nStates);
  });
});

describe('coding-gain BER bounds', () => {
  const code = BOOK_CODE;
  it('soft < hard < uncoded at high Eb/N0', () => {
    const eb = 6;
    expect(convBerSoftBound(code, eb)).toBeLessThan(convBerHardBound(code, eb));
    expect(convBerHardBound(code, eb)).toBeLessThan(uncodedBerBpsk(eb));
  });
  it('all bounds are in (0,1) and decreasing', () => {
    expect(convBerSoftBound(code, 8)).toBeLessThan(convBerSoftBound(code, 2));
    expect(convBerHardBound(code, 8)).toBeLessThan(convBerHardBound(code, 2));
    expect(convBerSoftBound(code, 8)).toBeGreaterThan(0);
    expect(convBerHardBound(code, 2)).toBeLessThan(1);
  });
});

describe('soft-decision Viterbi', () => {
  it('bpskMap maps 0→+1, 1→−1; hardSlice slices on sign', () => {
    expect([0, 1].map(bpskMap)).toEqual([1, -1]);
    expect(hardSlice([0.8, -0.3, -2, 1.5])).toEqual([0, 1, 1, 0]);
  });
  it('decodes the clean BPSK mapping of a codeword exactly (metric ~ 0)', () => {
    const input = [1, 0, 1, 1];
    const cw = encodeConv(input, BOOK_CODE);
    const r = viterbiDecodeSoft(cw.map(bpskMap), BOOK_CODE);
    expect(r.decoded).toEqual(input);
    expect(r.finalMetric).toBeLessThan(1e-9);
  });
});

describe('AWGN soft receive + soft advantage', () => {
  const code = BOOK_CODE;
  it('high Eb/N0 slices back to the codeword', () => {
    const cw = encodeConv([1, 0, 1, 1], code);
    const soft = awgnSoftReceive(cw, 12, makeRng(1));
    expect(hardSlice(soft)).toEqual(cw);
  });
  it('soft-decision recovers more often than hard at low Eb/N0', () => {
    const input = [1, 0, 1, 1, 0, 1];
    const cw = encodeConv(input, code);
    const eq = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
    let softWins = 0;
    let hardWins = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const soft = awgnSoftReceive(cw, 2, makeRng(seed));
      if (eq(viterbiDecodeSoft(soft, code).decoded, input)) softWins++;
      if (eq(viterbiDecode(hardSlice(soft), code).decoded, input)) hardWins++;
    }
    expect(hardWins).toBeGreaterThan(0);
    expect(softWins).toBeGreaterThan(hardWins);
  });
});

describe('distance spectrum & full union bound (§13.3.4)', () => {
  it('spectrum leading term: d_free=5, a_5=1, beta_5=1 for the book (2,1,3) code', () => {
    const spec = distanceSpectrum(BOOK_CODE, 8);
    expect(freeDistance(BOOK_CODE)).toBe(5);
    expect(spec.get(5)).toEqual({ paths: 1, infoErrors: 1 });
    // beta_d matches the existing weightSpectrum
    for (const [d, v] of spec) {
      expect(v.infoErrors).toBe(weightSpectrum(BOOK_CODE, 8).get(d));
    }
  });

  it('1-term full bound equals the leading-term bound', () => {
    expect(convBerSoftBoundFull(BOOK_CODE, 4, 1)).toBeCloseTo(convBerSoftBound(BOOK_CODE, 4), 12);
    expect(convBerHardBoundFull(BOOK_CODE, 4, 1)).toBeCloseTo(convBerHardBound(BOOK_CODE, 4), 12);
  });

  it('adding terms tightens (increases) the union bound', () => {
    const one = convBerSoftBoundFull(BOOK_CODE, 4, 1);
    const five = convBerSoftBoundFull(BOOK_CODE, 4, 5);
    expect(five).toBeGreaterThan(one);
  });

  it('trellis state count is 2^(L-1)', () => {
    expect(trellisStateCount(BOOK_CODE)).toBe(4); // L=3
    expect(trellisStateCount(makeConvCode(4, [1, 1, 1, 1], [1, 0, 1, 1]))).toBe(8);
  });
});
