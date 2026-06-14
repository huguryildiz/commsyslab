// Editor-side helpers for the optimum-receiver "Custom signals" path (Proakis §7.1).
// Pure data/array utilities; no React. The signal-space math lives in @/lib/dsp/gram-schmidt.

/** A named, fully-specified custom signal set for the preset menu. */
export interface CustomPreset {
  id: string;
  /** i18n key for the menu label. */
  labelKey: string;
  /** M rows (signals) × L columns (segment amplitudes). */
  amplitudes: number[][];
}

/**
 * Proakis Example 7.1.1 (Figure 7.1a): four piecewise-constant waveforms over three
 * unit segments. s₄ = s₁+s₂+s₃ is linearly dependent ⇒ N = 3.
 */
export const DEFAULT_CUSTOM_AMPLITUDES: number[][] = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 1],
  [1, 1, 1],
];

export const CUSTOM_PRESETS: CustomPreset[] = [
  {
    id: 'example711',
    labelKey: 'modulation.optrx.custom.preset.example711',
    amplitudes: DEFAULT_CUSTOM_AMPLITUDES,
  },
  {
    id: 'orthogonal',
    labelKey: 'modulation.optrx.custom.preset.orthogonal',
    amplitudes: [
      [1, 1],
      [1, -1],
    ],
  },
  {
    id: 'simplex3',
    labelKey: 'modulation.optrx.custom.preset.simplex3',
    amplitudes: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
];

/**
 * Expand an M×L piecewise-constant amplitude grid into M sampled waveforms of length `sps`.
 * Each segment is held constant over ⌊sps/L⌋ samples; any remainder is appended to the last
 * segment so every output row has exactly `sps` samples.
 */
export function expandPiecewise(amplitudes: number[][], sps: number): number[][] {
  return amplitudes.map((row) => {
    const L = row.length;
    const base = Math.floor(sps / L);
    const out: number[] = [];
    for (let i = 0; i < L; i++) {
      const count = i === L - 1 ? sps - base * (L - 1) : base;
      for (let j = 0; j < count; j++) out.push(row[i]);
    }
    return out;
  });
}

const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/** Symbol labels s₁, s₂, … sₙ (Proakis §7.1 notation). */
export function signalLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const sub = String(i + 1)
      .split('')
      .map((dgt) => SUBSCRIPTS[Number(dgt)])
      .join('');
    return `s${sub}`;
  });
}
