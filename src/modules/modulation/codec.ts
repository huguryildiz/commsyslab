import type { Constellation } from '@/lib/dsp/modulation';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from '@/lib/dsp/awgn';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import { makeRng, bitsToSymbols, symbolsToBits, type Bit } from '@/lib/sim/sources';
export { bitsToSymbols, symbolsToBits };

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
