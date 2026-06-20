// Ref: Proakis & Salehi §13.4.1 (Product Codes, p.725). Two linear block codes arranged in a
// matrix form produce an (n1·n2, k1·k2) code with d_min = d_min1·d_min2, decodable iteratively by
// rows then columns ("like a crossword"). The interactive demo uses the product of two
// single-parity-check (SPC) codes — d_min = 2·2 = 4, so it corrects t = ⌊(4−1)/2⌋ = 1 error by
// locating the failing row and column and flipping their intersection.

/** General product-code parameters from two component (n,k,d) codes (Eq. §13.4.1). */
export function productParams(
  n1: number,
  k1: number,
  d1: number,
  n2: number,
  k2: number,
  d2: number,
): { n: number; k: number; dmin: number; t: number; rate: number } {
  const n = n1 * n2;
  const k = k1 * k2;
  const dmin = d1 * d2;
  return { n, k, dmin, t: Math.floor((dmin - 1) / 2), rate: k / n };
}

const xor = (bits: number[]): number => bits.reduce((a, b) => a ^ (b & 1), 0);

/**
 * Encode an m×n data grid with two single-parity-check codes: append one parity bit per row
 * (right column) and per column (bottom row); the corner is the parity of parities. Returns the
 * (m+1)×(n+1) product codeword grid.
 */
export function spcProductEncode(data: number[][]): number[][] {
  const m = data.length;
  const n = data[0]?.length ?? 0;
  const grid: number[][] = data.map((row) => {
    const r = row.slice();
    r.push(xor(r)); // row parity
    return r;
  });
  const parityRow: number[] = [];
  for (let c = 0; c <= n; c++) parityRow.push(xor(grid.map((r) => r[c])));
  grid.push(parityRow); // column parities + corner
  return grid;
}

/** Row syndromes: true where a row's XOR (data + its parity bit) is nonzero. */
export function rowSyndromes(grid: number[][]): boolean[] {
  return grid.map((row) => xor(row) === 1);
}

/** Column syndromes: true where a column's XOR is nonzero. */
export function colSyndromes(grid: number[][]): boolean[] {
  const cols = grid[0]?.length ?? 0;
  const out: boolean[] = [];
  for (let c = 0; c < cols; c++) out.push(xor(grid.map((r) => r[c])) === 1);
  return out;
}

export interface ProductDecode {
  grid: number[][]; // corrected grid (copy)
  pos: [number, number] | null; // [row, col] of the corrected bit, if any
  status: 'clean' | 'corrected' | 'uncorrectable';
}

/**
 * Iterative SPC-product decode (single-error correcting). Exactly one failing row syndrome and
 * one failing column syndrome pinpoint a single bit error at their intersection; flip it.
 * No failures → clean. Any other pattern (≥2 errors) → uncorrectable (detected). §13.4.1.
 */
export function spcProductDecode(grid: number[][]): ProductDecode {
  const rs = rowSyndromes(grid);
  const cs = colSyndromes(grid);
  const badRows = rs.flatMap((b, i) => (b ? [i] : []));
  const badCols = cs.flatMap((b, i) => (b ? [i] : []));
  const out = grid.map((r) => r.slice());
  if (badRows.length === 0 && badCols.length === 0) {
    return { grid: out, pos: null, status: 'clean' };
  }
  if (badRows.length === 1 && badCols.length === 1) {
    const [r, c] = [badRows[0], badCols[0]];
    out[r][c] ^= 1;
    return { grid: out, pos: [r, c], status: 'corrected' };
  }
  return { grid: out, pos: null, status: 'uncorrectable' };
}
