// Waveform synthesis for digital modulation schemes. §8.1–8.4 Proakis & Salehi.
// Symbols are driven by a user-supplied bit stream (deterministic signal); the
// seed only randomizes the AWGN noise.
import { makeRng, bitsToSymbols, type Bit } from '@/lib/sim/sources';
import { gaussian } from '@/lib/dsp/awgn';

export type WaveScheme = 'bpsk' | 'qpsk' | '8psk' | '2fsk' | '4fsk' | '4qam' | '16qam' | '64qam' | 'msk';

/** Per-symbol metadata for on-plot labels and the hover readout. */
export interface SymbolInfo {
  startSample: number; // first sample index of the symbol
  midT: number;        // center time in symbol units (label x-position)
  bitStr: string;      // exact bit group, e.g. "10"
  index: number;       // symbol index (0..M-1); tone index for FSK
  detail: string;      // family readout in book notation, e.g. "θ=90°"
}

export interface WaveformData {
  t: number[];
  I: number[];
  Q: number[];
  Inoisy: number[];
  Qnoisy: number[];
  rf: number[];
  phaseOrFreq: number[];
  phaseLabel: string;
  phaseDomain: [number, number];
  symbolBoundaries: number[];
  symbols: SymbolInfo[];
  eyeFolds: number[][];
  sps: number;
  N: number;
}

export interface WaveSchemeInfo {
  label: string;
  family: 'psk' | 'fsk' | 'qam' | 'msk';
  bitsPerSymbol: number;
  M: number;
}

const SCHEME_INFO: Record<WaveScheme, WaveSchemeInfo> = {
  bpsk:   { label: 'BPSK',    family: 'psk', bitsPerSymbol: 1, M: 2  },
  qpsk:   { label: 'QPSK',    family: 'psk', bitsPerSymbol: 2, M: 4  },
  '8psk': { label: '8-PSK',   family: 'psk', bitsPerSymbol: 3, M: 8  },
  '2fsk': { label: '2-FSK',   family: 'fsk', bitsPerSymbol: 1, M: 2  },
  '4fsk': { label: '4-FSK',   family: 'fsk', bitsPerSymbol: 2, M: 4  },
  '4qam': { label: '4-QAM',   family: 'qam', bitsPerSymbol: 2, M: 4  },
  '16qam':{ label: '16-QAM',  family: 'qam', bitsPerSymbol: 4, M: 16 },
  '64qam':{ label: '64-QAM',  family: 'qam', bitsPerSymbol: 6, M: 64 },
  msk:    { label: 'MSK',     family: 'msk', bitsPerSymbol: 1, M: 2  },
};

export function getSchemeInfo(scheme: WaveScheme): WaveSchemeInfo {
  return SCHEME_INFO[scheme];
}

export const WAVE_SCHEME_OPTIONS: { value: WaveScheme; label: string }[] = [
  { value: 'bpsk',   label: 'BPSK'    },
  { value: 'qpsk',   label: 'QPSK'    },
  { value: '8psk',   label: '8-PSK'   },
  { value: '2fsk',   label: '2-FSK'   },
  { value: '4fsk',   label: '4-FSK'   },
  { value: '4qam',   label: '4-QAM'   },
  { value: '16qam',  label: '16-QAM'  },
  { value: '64qam',  label: '64-QAM'  },
  { value: 'msk',    label: 'MSK'     },
];

export const SPS = 32; // samples per symbol

/** Group a bit stream into symbol bit-strings, k bits/symbol, zero-padded (MSB-first). */
function groupBitStrings(bits: Bit[], k: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < bits.length; i += k) {
    let s = '';
    for (let b = 0; b < k; b++) s += i + b < bits.length ? String(bits[i + b]) : '0';
    out.push(s);
  }
  return out;
}

export function buildWaveforms(params: {
  scheme: WaveScheme;
  bits: Bit[];
  ebN0Db: number;
  seed?: number;
}): WaveformData {
  const { scheme, bits, ebN0Db, seed = 42 } = params;
  const { family, M, bitsPerSymbol } = getSchemeInfo(scheme);

  // Symbols from the bit stream (zero-padded trailing group).
  const symIndices = bits.length > 0 ? bitsToSymbols(bits, bitsPerSymbol) : [];
  const bitGroups = groupBitStrings(bits, bitsPerSymbol);
  const N = symIndices.length;
  const len = N * SPS;
  const rng = makeRng(seed);

  // Noise: unit Eb = 1, N0 = Eb / (bitsPerSymbol * 10^(ebN0Db/10))
  const ebN0Linear = Math.pow(10, ebN0Db / 10);
  const N0 = 1 / (bitsPerSymbol * ebN0Linear);
  const sigma = Math.sqrt(N0 / 2);

  const I = new Array<number>(len).fill(0);
  const Q = new Array<number>(len).fill(0);
  const phaseOrFreq = new Array<number>(len).fill(0);
  const symbolBoundaries: number[] = [];
  const symbols: SymbolInfo[] = [];

  const df = 1 / SPS; // FSK tone spacing: 1 cycle/symbol
  const L = Math.round(Math.sqrt(M)); // QAM levels per axis
  const qamScale = L > 1 ? 1 / (L - 1) : 1;

  // MSK phase accumulator (continuous phase across symbols)
  let mskPhase = 0;

  for (let k = 0; k < N; k++) {
    const v = symIndices[k];
    const start = k * SPS;
    let detail = '';
    let displayIndex = v;

    if (family === 'psk') {
      // BPSK is antipodal (bit 1 → +1) to match the textbook figure; M-PSK uses θ=2πv/M.
      const theta = M === 2 ? (v === 1 ? 0 : Math.PI) : (2 * Math.PI * v) / M;
      const ik = Math.cos(theta);
      const qk = Math.sin(theta);
      const thetaWrapped = theta > Math.PI ? theta - 2 * Math.PI : theta;
      for (let n = start; n < start + SPS; n++) {
        I[n] = ik;
        Q[n] = qk;
        phaseOrFreq[n] = thetaWrapped;
      }
      detail = `θ=${Math.round((thetaWrapped * 180) / Math.PI)}°`;
    } else if (family === 'fsk') {
      const fk = (v - (M - 1) / 2) * df;
      for (let n = start; n < start + SPS; n++) {
        const tau = n - start;
        I[n] = Math.cos(2 * Math.PI * fk * tau);
        Q[n] = Math.sin(2 * Math.PI * fk * tau);
        phaseOrFreq[n] = fk * SPS; // cycles/symbol for display
      }
      detail = `f=${fmtSigned(fk * SPS)}/T`;
    } else if (family === 'qam') {
      const mi = Math.floor(v / L);
      const mq = v % L;
      const ik = (2 * mi - (L - 1)) * qamScale;
      const qk = (2 * mq - (L - 1)) * qamScale;
      for (let n = start; n < start + SPS; n++) {
        I[n] = ik;
        Q[n] = qk;
        phaseOrFreq[n] = Math.sqrt(ik * ik + qk * qk);
      }
      detail = `(I,Q)=(${ik.toFixed(2)},${qk.toFixed(2)})`;
    } else {
      // MSK — CPFSK with h=1/2: bit 1 → b=+1, bit 0 → b=−1
      const bk = v === 1 ? 1 : -1;
      const phaseStart = mskPhase;
      for (let n = start; n < start + SPS; n++) {
        const tau = n - start;
        const phi = phaseStart + (bk * Math.PI * tau) / SPS;
        I[n] = Math.cos(phi);
        Q[n] = Math.sin(phi);
        phaseOrFreq[n] = phi;
      }
      mskPhase = phaseStart + bk * Math.PI;
      detail = `b=${bk > 0 ? '+1' : '−1'}`;
      displayIndex = bk > 0 ? 1 : 0;
    }

    symbolBoundaries.push(start);
    symbols.push({
      startSample: start,
      midT: k + 0.5,
      bitStr: bitGroups[k] ?? '',
      index: displayIndex,
      detail,
    });
  }

  // Add AWGN
  const Inoisy = I.map((vv) => vv + sigma * gaussian(rng));
  const Qnoisy = Q.map((vv) => vv + sigma * gaussian(rng));

  // RF bandpass: fc = 4 cycles/symbol = 4/SPS cycles/sample
  const fc = 4 / SPS;
  const rf = Inoisy.map((iv, n) => iv * Math.cos(2 * Math.PI * fc * n) - Qnoisy[n] * Math.sin(2 * Math.PI * fc * n));

  // Phase/freq axis metadata
  let phaseLabel: string;
  let phaseDomain: [number, number];
  if (family === 'psk') {
    phaseLabel = '\\theta(t)\\ (\\mathrm{rad})';
    phaseDomain = [-Math.PI - 0.2, Math.PI + 0.2];
  } else if (family === 'fsk') {
    const halfM = (M - 1) / 2 + 0.3;
    phaseLabel = 'f\\ (\\mathrm{cyc/sym})';
    phaseDomain = [-halfM, halfM];
  } else if (family === 'qam') {
    phaseLabel = '|A(t)|';
    phaseDomain = [0, 1.6];
  } else {
    // msk: phase is an unbounded ramp — find actual range
    const maxAbs = phaseOrFreq.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const pd = (Math.ceil(maxAbs / Math.PI) + 0.5) * Math.PI;
    phaseLabel = '\\theta(t)\\ (\\mathrm{rad})';
    phaseDomain = [-pd, pd];
  }

  // Eye diagram folds: 2·SPS wide windows starting at each symbol boundary
  const winLen = 2 * SPS;
  const eyeFolds: number[][] = [];
  for (let k = 0; k < N - 1; k++) {
    const start = k * SPS;
    if (start + winLen <= len) {
      eyeFolds.push(Inoisy.slice(start, start + winLen));
    }
  }

  // Time axis: sample index as symbol periods
  const t = Array.from({ length: len }, (_, n) => n / SPS);

  return {
    t, I, Q, Inoisy, Qnoisy, rf, phaseOrFreq, phaseLabel, phaseDomain,
    symbolBoundaries, symbols, eyeFolds, sps: SPS, N,
  };
}

function fmtSigned(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r >= 0 ? `+${r}` : `${r}`;
}
