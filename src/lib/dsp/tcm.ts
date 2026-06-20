// Ref: Proakis & Salehi §13.7 (Coding for Bandwidth-Constrained Channels) / §13.7.2 (Trellis-Coded
// Modulation). Ungerboeck (1982): combine coding with constellation expansion (QPSK → 8-PSK at the
// same 2 bits/symbol) and map by SET PARTITIONING — split the constellation into congruent subsets
// whose intra-subset minimum distance grows at each level. A rate-1/2 convolutional code selects
// the subset (coded bits) and an uncoded bit selects the point within it. The 4-state 8-PSK scheme
// yields ~3 dB asymptotic coding gain over uncoded QPSK despite a ~5.33 dB modulation loss.

export interface Point {
  x: number;
  y: number;
}

/** Unit-energy 8-PSK constellation point i (angle i·45°). */
export function psk8(i: number): Point {
  const a = (i * Math.PI) / 4;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Euclidean distance between 8-PSK points i and j. */
export function psk8Distance(i: number, j: number): number {
  const p = psk8(i);
  const q = psk8(j);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/** Minimum pairwise distance within a subset of 8-PSK indices (∞ for singletons). */
export function minIntraDistance(subset: number[]): number {
  let m = Infinity;
  for (let a = 0; a < subset.length; a++) {
    for (let b = a + 1; b < subset.length; b++) {
      m = Math.min(m, psk8Distance(subset[a], subset[b]));
    }
  }
  return m;
}

/**
 * Ungerboeck set partition of 8-PSK (Fig. 13.33): level A = full set, level B = {B0,B1}, level C =
 * {C0..C3}, level D = singletons. Each level halves the subsets and increases the intra distance.
 */
export const SET_PARTITION: { level: string; subsets: number[][] }[] = [
  { level: 'A', subsets: [[0, 1, 2, 3, 4, 5, 6, 7]] },
  {
    level: 'B',
    subsets: [
      [0, 2, 4, 6],
      [1, 3, 5, 7],
    ],
  },
  {
    level: 'C',
    subsets: [
      [0, 4],
      [2, 6],
      [1, 5],
      [3, 7],
    ],
  },
  { level: 'D', subsets: [[0], [1], [2], [3], [4], [5], [6], [7]] },
];

/** Minimum intra-subset distances per partition level [Δ0, Δ1, Δ2] = [2sin(π/8), √2, 2]. */
export function partitionDistances(): number[] {
  return SET_PARTITION.slice(0, 3).map((lvl) => minIntraDistance(lvl.subsets[0]));
}

/** Asymptotic coding gain in dB from squared free distances: 10·log10(d²_coded / d²_ref). */
export function asymptoticGainDb(dCoded2: number, dRef2: number): number {
  return 10 * Math.log10(dCoded2 / dRef2);
}

/** Modulation loss going from uncoded QPSK to 8-PSK at 2 bits/symbol (§13.7.2): ≈ 5.33 dB. */
export const MOD_LOSS_DB = 10 * Math.log10(2 / (2 * Math.sin(Math.PI / 8)) ** 2);

/** Net asymptotic coding gain of the canonical 4-state 8-PSK TCM over uncoded QPSK (Ungerboeck). */
export const TCM_4STATE_GAIN_DB = 3.0;
