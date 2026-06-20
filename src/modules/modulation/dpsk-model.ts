import { dpskSymbolErrorProb } from '@/lib/dsp/dpsk';
import { theoreticalSer } from '@/lib/dsp/ser';
import { toGray, toNBC } from '@/lib/dsp/pcm';

export interface DpskParams {
  M: number;
  ebN0Db: number;
}

export interface DpskView {
  M: number;
  bitsPerSymbol: number;
  phaseStep: number;
  phasePoints: { x: number; y: number; label: string }[];
  theoryNow: number;
  dpskCurve: { ebN0Db: number; pe: number }[];
  pskCurve: { ebN0Db: number; pe: number }[];
}

/** Build plot-ready DPSK data for a given M and Eb/N0. */
export function buildDpskView(p: DpskParams): DpskView {
  const { M, ebN0Db } = p;
  const bits = Math.round(Math.log2(M));
  const step = (2 * Math.PI) / M;
  const phasePoints = Array.from({ length: M }, (_, i) => ({
    x: Math.cos(step * i),
    y: Math.sin(step * i),
    label: toNBC(toGray(i), bits).join(''),
  }));
  // Coherent reference: BPSK uses its own branch; M≥4 uses M-PSK.
  const scheme = M === 2 ? 'bpsk' : 'mpsk';
  const dpskCurve: { ebN0Db: number; pe: number }[] = [];
  const pskCurve: { ebN0Db: number; pe: number }[] = [];
  for (let db = 0; db <= 14; db += 1) {
    dpskCurve.push({ ebN0Db: db, pe: dpskSymbolErrorProb(M, db) });
    pskCurve.push({ ebN0Db: db, pe: theoreticalSer(scheme, M, db) });
  }
  return {
    M,
    bitsPerSymbol: bits,
    phaseStep: step,
    phasePoints,
    theoryNow: dpskSymbolErrorProb(M, ebN0Db),
    dpskCurve,
    pskCurve,
  };
}
