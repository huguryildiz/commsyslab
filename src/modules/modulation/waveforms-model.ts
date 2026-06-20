// Waveform synthesis for digital modulation schemes. §8.1–8.4 Proakis & Salehi.
import { makeRng } from '@/lib/sim/sources';
import { gaussian } from '@/lib/dsp/awgn';

export type WaveScheme = 'bpsk' | 'qpsk' | '8psk' | '2fsk' | '4fsk' | '4qam' | '16qam' | '64qam' | 'msk';

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

export function buildWaveforms(params: {
  scheme: WaveScheme;
  N: number;
  ebN0Db: number;
  seed?: number;
}): WaveformData {
  const { scheme, N, ebN0Db, seed = 42 } = params;
  const { family, M, bitsPerSymbol } = getSchemeInfo(scheme);
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

  if (family === 'psk') {
    for (let k = 0; k < N; k++) {
      const symIdx = Math.floor(rng() * M);
      const theta = (2 * Math.PI * symIdx) / M;
      const ik = Math.cos(theta);
      const qk = Math.sin(theta);
      // Wrap to (-π, π] for the phase plot
      const thetaWrapped = theta > Math.PI ? theta - 2 * Math.PI : theta;
      for (let n = k * SPS; n < (k + 1) * SPS; n++) {
        I[n] = ik;
        Q[n] = qk;
        phaseOrFreq[n] = thetaWrapped;
      }
      symbolBoundaries.push(k * SPS);
    }
  } else if (family === 'fsk') {
    // Δf = 1/SPS cycles/sample = 1 cycle/symbol; frequencies centered at 0
    const df = 1 / SPS;
    for (let k = 0; k < N; k++) {
      const symIdx = Math.floor(rng() * M);
      const fk = (symIdx - (M - 1) / 2) * df;
      for (let n = k * SPS; n < (k + 1) * SPS; n++) {
        const tau = n - k * SPS;
        I[n] = Math.cos(2 * Math.PI * fk * tau);
        Q[n] = Math.sin(2 * Math.PI * fk * tau);
        phaseOrFreq[n] = fk * SPS; // in cycles/symbol for display
      }
      symbolBoundaries.push(k * SPS);
    }
  } else if (family === 'qam') {
    const L = Math.round(Math.sqrt(M));
    // Normalize so max amplitude = 1: levels {-(L-1), ..., L-1}/(L-1)
    const scale = 1 / (L - 1);
    for (let k = 0; k < N; k++) {
      const mi = Math.floor(rng() * L);
      const mq = Math.floor(rng() * L);
      const ik = (2 * mi - (L - 1)) * scale;
      const qk = (2 * mq - (L - 1)) * scale;
      for (let n = k * SPS; n < (k + 1) * SPS; n++) {
        I[n] = ik;
        Q[n] = qk;
        phaseOrFreq[n] = Math.sqrt(ik * ik + qk * qk);
      }
      symbolBoundaries.push(k * SPS);
    }
  } else {
    // MSK — continuous-phase FSK with modulation index h = 1/2
    // θ(t) = θ(kT) + b_k·π·τ/T for τ ∈ [0,T)
    let phaseAcc = 0;
    for (let k = 0; k < N; k++) {
      const bk = rng() < 0.5 ? -1 : 1;
      const phaseStart = phaseAcc;
      for (let n = k * SPS; n < (k + 1) * SPS; n++) {
        const tau = n - k * SPS;
        const phi = phaseStart + (bk * Math.PI * tau) / SPS;
        I[n] = Math.cos(phi);
        Q[n] = Math.sin(phi);
        phaseOrFreq[n] = phi;
      }
      phaseAcc = phaseStart + bk * Math.PI;
      symbolBoundaries.push(k * SPS);
    }
  }

  // Add AWGN
  const Inoisy = I.map((v) => v + sigma * gaussian(rng));
  const Qnoisy = Q.map((v) => v + sigma * gaussian(rng));

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
    // msk: phase is unbounded ramp — find actual range
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
    symbolBoundaries, eyeFolds, sps: SPS, N,
  };
}
