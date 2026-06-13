import type { Constellation } from '@/lib/dsp/modulation';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from '@/lib/dsp/awgn';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import { makeRng, type Bit } from '@/lib/sim/sources';

/** Pack bits into symbol indices, k bits per symbol, MSB-first, zero-padded. */
export function bitsToSymbols(bits: Bit[], k: number): number[] {
  const syms: number[] = [];
  for (let i = 0; i < bits.length; i += k) {
    let v = 0;
    for (let b = 0; b < k; b++) v = (v << 1) | (i + b < bits.length ? bits[i + b] : 0);
    syms.push(v);
  }
  return syms;
}

/** Unpack symbol indices back into bits, k bits per symbol, MSB-first. */
export function symbolsToBits(syms: number[], k: number): Bit[] {
  const bits: Bit[] = [];
  for (const s of syms) for (let b = k - 1; b >= 0; b--) bits.push(((s >> b) & 1) as Bit);
  return bits;
}

export interface TransmitOptions {
  ebN0Db: number;
  decision: 'ml' | 'map';
  priors?: number[];
  seed?: number;
}

export interface TransmitResult {
  rxBits: Bit[];
  bitErrors: number;
  totalBits: number;
  symErrors: number;
  totalSymbols: number;
}

/** Encode bits -> symbols -> AWGN channel -> detect -> decode. */
export function transmit(bits: Bit[], c: Constellation, o: TransmitOptions): TransmitResult {
  const k = c.bitsPerSymbol;
  const eb = c.EsAvg / k;
  const n0 = n0FromEbN0Db(o.ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const rng = makeRng(o.seed ?? 1);
  const txSyms = bitsToSymbols(bits, k);
  const priors = o.priors ?? c.points.map(() => 1 / c.M);

  let symErrors = 0;
  const rxSyms = txSyms.map((tx) => {
    const r = addAwgn(c.points[tx], sigma, rng);
    const rx = o.decision === 'map' ? detectMAP(r, c.points, priors, n0) : detectML(r, c.points);
    if (rx !== tx) symErrors++;
    return rx;
  });

  const rxBits = symbolsToBits(rxSyms, k);
  let bitErrors = 0;
  for (let i = 0; i < bits.length; i++) if (rxBits[i] !== bits[i]) bitErrors++;

  return {
    rxBits,
    bitErrors,
    totalBits: bits.length,
    symErrors,
    totalSymbols: txSyms.length,
  };
}

/** 16x16 row-major 1-bpp smiley face (1 = filled). */
// prettier-ignore
export const SMILEY: Bit[] = [
  0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
  0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
  0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,
  0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,
  0,1,0,0,0,1,1,0,0,1,1,0,0,0,1,0,
  1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1,
  1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,
  1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,
  0,1,0,0,1,0,0,0,0,0,0,1,0,0,1,0,
  0,1,0,0,0,1,1,1,1,1,1,0,0,0,1,0,
  0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,
  0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
  0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
] as Bit[];
