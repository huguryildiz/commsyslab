# DigiCommLab Phase 3a — Information Theory DSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, unit-tested DSP layer for the Information Theory module — entropy/self-information, prefix-code & Kraft analysis, Huffman coding, Lempel-Ziv (LZ78), and channel capacity — each verified against the exact EE413-CH10 slide and Proakis & Salehi book numeric examples.

**Architecture:** Five independent, side-effect-free TypeScript modules under `src/lib/dsp/`, mirroring the existing DSP layer (`awgn.ts`, `modulation.ts`, …). Each is consumed later by the Phase 3b UI. `log₂` uses the JS built-in `Math.log2`. Tests live under `tests/dsp/` (Vitest), one file per module, asserting the slide/book reference values.

**Tech Stack:** TypeScript, Vitest. `@/` path alias → `src/`. Verify with `npx vitest run <file>`, `npm run lint` (eslint, `--max-warnings 0`), `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-phase3-information-theory-design.md` §2.1.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/dsp/entropy.ts` (create) | `selfInfo`, `entropy`, `maxEntropy`, `binaryEntropy`, `extendedEntropy`. |
| `src/lib/dsp/codes.ts` (create) | `kraftSum`, `isPrefixFree`, `avgLength`, `efficiency`, `isUniquelyDecodable` (Sardinas–Patterson), `decodePrefix`. |
| `src/lib/dsp/huffman.ts` (create) | `buildHuffman` (+ tie-break/min-variance), `huffmanEncode`, `huffmanDecode`, types. |
| `src/lib/dsp/lz78.ts` (create) | `lzParse`, `lzDecode`, types (book §6.3.2 / Table 6.1). |
| `src/lib/dsp/capacity.ts` (create) | `bscCapacity`, `shannonCapacity`, `gaussianCapacity`, `snrDbToLinear`. |
| `tests/dsp/entropy.test.ts` … `capacity.test.ts` (create) | One test file per module. |

No existing files are modified. `huffman.ts` and `capacity.ts` import `binaryEntropy`/helpers from `entropy.ts` — build `entropy.ts` first.

---

## Task 1: entropy.ts

**Files:**
- Create: `src/lib/dsp/entropy.ts`
- Test: `tests/dsp/entropy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/entropy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selfInfo, entropy, maxEntropy, binaryEntropy, extendedEntropy } from '@/lib/dsp/entropy';

describe('entropy', () => {
  it('self-information is −log2(p)', () => {
    expect(selfInfo(0.25)).toBeCloseTo(2, 10);
    expect(selfInfo(1)).toBeCloseTo(0, 10);
    expect(selfInfo(0)).toBe(0); // never-occurring symbol contributes no surprise (convention)
  });

  it('matches the slide entropy example {0.7,0.2,0.1} → 1.1568', () => {
    expect(entropy([0.7, 0.2, 0.1])).toBeCloseTo(1.1568, 3);
  });

  it('ignores zero-probability terms (0·log0 = 0)', () => {
    expect(entropy([0.5, 0.5, 0])).toBeCloseTo(1, 10);
  });

  it('binary entropy is 1 at p=0.5 and 0 at the endpoints', () => {
    expect(binaryEntropy(0.5)).toBeCloseTo(1, 10);
    expect(binaryEntropy(0)).toBe(0);
    expect(binaryEntropy(1)).toBe(0);
  });

  it('max entropy is log2(K)', () => {
    expect(maxEntropy(4)).toBeCloseTo(2, 10);
    expect(maxEntropy(8)).toBeCloseTo(3, 10);
  });

  it('extended-source entropy is n·H(S) (slide: 2.3136 for n=2)', () => {
    expect(extendedEntropy([0.7, 0.2, 0.1], 2)).toBeCloseTo(2.3136, 3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/entropy.test.ts`
Expected: FAIL ("Cannot find module '@/lib/dsp/entropy'").

- [ ] **Step 3: Implement `entropy.ts`**

Create `src/lib/dsp/entropy.ts`:

```ts
/** Self-information I(p) = −log2(p), in bits. p≤0 returns 0 (a never-occurring symbol conveys no surprise). */
export function selfInfo(p: number): number {
  return p <= 0 ? 0 : -Math.log2(p);
}

/** Entropy H(S) = −Σ p·log2(p), bits/symbol. Zero-probability terms are skipped (0·log0 = 0). */
export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) if (p > 0) h -= p * Math.log2(p);
  return h;
}

/** Maximum entropy log2(K) for a K-symbol alphabet (equiprobable). */
export function maxEntropy(K: number): number {
  return Math.log2(K);
}

/** Binary entropy H_b(p) = −p log2 p − (1−p) log2(1−p); 0 at p∈{0,1}. */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/** Entropy of the n-th extension of a DMS: H(Sⁿ) = n·H(S). */
export function extendedEntropy(probs: number[], n: number): number {
  return n * entropy(probs);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/entropy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (expect exit 0).

```bash
git add src/lib/dsp/entropy.ts tests/dsp/entropy.test.ts
git commit -m "feat(infotheory): entropy, self-information, binary & extended entropy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: codes.ts (prefix codes, Kraft, unique decodability)

**Files:**
- Create: `src/lib/dsp/codes.ts`
- Test: `tests/dsp/codes.test.ts`

> Reference (slide Code-I/II/III): Code-I `{0,1,00,11}`, Code-II `{0,10,110,111}`, Code-III `{0,01,011,0111}`.
> Per the spec, Code-III is **uniquely decodable but not prefix** (the slide's "not uniquely decodable" refers only to the invalid demo stream `1011111000`, which starts with `1` while every Code-III codeword starts with `0`).

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/codes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  kraftSum,
  isPrefixFree,
  avgLength,
  efficiency,
  isUniquelyDecodable,
  decodePrefix,
} from '@/lib/dsp/codes';

const CODE_I = ['0', '1', '00', '11'];
const CODE_II = ['0', '10', '110', '111'];
const CODE_III = ['0', '01', '011', '0111'];

describe('kraftSum', () => {
  it('matches the slide values for Code-I/II/III', () => {
    expect(kraftSum([1, 1, 2, 2])).toBeCloseTo(1.5, 10); // Code-I
    expect(kraftSum([1, 2, 3, 3])).toBeCloseTo(1.0, 10); // Code-II
    expect(kraftSum([1, 2, 3, 4])).toBeCloseTo(0.9375, 10); // Code-III
  });
});

describe('isPrefixFree', () => {
  it('Code-I and Code-III are not prefix-free; Code-II is', () => {
    expect(isPrefixFree(CODE_I)).toBe(false);
    expect(isPrefixFree(CODE_II)).toBe(true);
    expect(isPrefixFree(CODE_III)).toBe(false);
  });
});

describe('isUniquelyDecodable (Sardinas–Patterson)', () => {
  it('Code-I is not UD, Code-II is UD, Code-III is UD (but non-prefix)', () => {
    expect(isUniquelyDecodable(CODE_I)).toBe(false);
    expect(isUniquelyDecodable(CODE_II)).toBe(true);
    expect(isUniquelyDecodable(CODE_III)).toBe(true);
  });
  it('catches a classic non-UD code {0,01,10}', () => {
    expect(isUniquelyDecodable(['0', '01', '10'])).toBe(false);
  });
});

describe('avgLength & efficiency', () => {
  it('computes L̄ and η for a dyadic Code-II (η = 1)', () => {
    const p = [0.5, 0.25, 0.125, 0.125];
    const L = avgLength(p, [1, 2, 3, 3]);
    expect(L).toBeCloseTo(1.75, 10);
    expect(efficiency(1.75, L)).toBeCloseTo(1, 10);
  });
});

describe('decodePrefix', () => {
  const map = { '0': 's0', '10': 's1', '110': 's2', '111': 's3' };
  it('decodes a valid Code-II stream', () => {
    expect(decodePrefix('010110111', map)).toBe('s0s1s2s3');
  });
  it('returns null on an undecodable tail', () => {
    expect(decodePrefix('01', map)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/codes.test.ts`
Expected: FAIL ("Cannot find module '@/lib/dsp/codes'").

- [ ] **Step 3: Implement `codes.ts`**

Create `src/lib/dsp/codes.ts`:

```ts
/** Kraft sum Σ 2^(−lₖ). A prefix code requires this to be ≤ 1 (necessary, not sufficient). */
export function kraftSum(lengths: number[]): number {
  return lengths.reduce((s, l) => s + 2 ** -l, 0);
}

/** True if no codeword is a prefix of any other (instantaneous / prefix code). */
export function isPrefixFree(codewords: string[]): boolean {
  for (let i = 0; i < codewords.length; i++) {
    for (let j = 0; j < codewords.length; j++) {
      if (i !== j && codewords[j].startsWith(codewords[i])) return false;
    }
  }
  return true;
}

/** Average codeword length L̄ = Σ pₖ·lₖ. */
export function avgLength(probs: number[], lengths: number[]): number {
  let s = 0;
  for (let i = 0; i < probs.length; i++) s += probs[i] * lengths[i];
  return s;
}

/** Coding efficiency η = H / L̄. */
export function efficiency(H: number, Lbar: number): number {
  return Lbar === 0 ? 0 : H / Lbar;
}

/**
 * Unique decodability via the Sardinas–Patterson algorithm.
 * Builds successive dangling-suffix sets; the code is NOT uniquely decodable
 * iff some dangling suffix is itself a codeword.
 */
export function isUniquelyDecodable(codewords: string[]): boolean {
  const inC = new Set(codewords);
  let S = new Set<string>();
  // S1: proper-prefix dangling suffixes within C.
  for (const a of codewords) {
    for (const b of codewords) {
      if (a !== b && b.startsWith(a)) S.add(b.slice(a.length));
    }
  }
  const seen = new Set<string>();
  while (S.size > 0) {
    for (const s of S) if (inC.has(s)) return false;
    const key = [...S].sort().join('|');
    if (seen.has(key)) break; // cycle → stabilized without finding a codeword
    seen.add(key);
    const next = new Set<string>();
    for (const w of codewords) {
      for (const s of S) {
        if (w !== s && w.startsWith(s)) next.add(w.slice(s.length));
        if (w !== s && s.startsWith(w)) next.add(s.slice(w.length));
      }
    }
    S = next;
  }
  return true;
}

/**
 * Greedy prefix-code decode of a bit string. Returns the concatenated symbols,
 * or null if the bit string is not a valid encoding (leftover undecoded bits).
 */
export function decodePrefix(bits: string, codeToSymbol: Record<string, string>): string | null {
  let out = '';
  let cur = '';
  for (const b of bits) {
    cur += b;
    const sym = codeToSymbol[cur];
    if (sym !== undefined) {
      out += sym;
      cur = '';
    }
  }
  return cur === '' ? out : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/codes.test.ts`
Expected: PASS (7 tests). In particular `isUniquelyDecodable(CODE_III) === true`.

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (expect exit 0).

```bash
git add src/lib/dsp/codes.ts tests/dsp/codes.test.ts
git commit -m "feat(infotheory): prefix/Kraft analysis + Sardinas-Patterson unique decodability

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: huffman.ts

**Files:**
- Create: `src/lib/dsp/huffman.ts`
- Test: `tests/dsp/huffman.test.ts`

> Reference (slide 5-symbol example, p = {0.4,0.2,0.2,0.1,0.1}): L̄ = 2.2, H ≈ 2.12, η ≈ 0.96.
> Two valid Huffman codes exist with the SAME L̄ but different variance: the skewed code has length-multiset {1,2,3,4,4}, variance 1.36; the balanced (minimum-variance) code has length-multiset {2,2,2,3,3}, variance 0.16.
> **Exact codeword bit-strings are NOT asserted** — Huffman's 0/1 assignment and child ordering are arbitrary, so only invariants (sorted length multiset, L̄, H, η, variance, round-trip) are tested.
> **Insertion rule that fixes the variance outcome** (verified by hand against the slide): keep the working list sorted ascending by probability and always combine the two front (lowest) nodes. When inserting the combined node among equal-probability nodes — default inserts it **before** equals (strict `<` scan), giving the skewed code (variance 1.36); `minVariance:true` inserts it **after** equals (`<=` scan), giving the balanced code (variance 0.16).

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/huffman.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildHuffman, huffmanEncode, huffmanDecode } from '@/lib/dsp/huffman';

const SYM = ['s0', 's1', 's2', 's3', 's4'];
const P = [0.4, 0.2, 0.2, 0.1, 0.1];

function sortedLengths(lengths: Record<string, number>): number[] {
  return Object.values(lengths).sort((a, b) => a - b);
}

describe('buildHuffman', () => {
  it('reproduces the slide L̄ = 2.2, H ≈ 2.12, η ≈ 0.96', () => {
    const r = buildHuffman(SYM, P);
    expect(r.Lbar).toBeCloseTo(2.2, 10);
    expect(r.H).toBeCloseTo(2.12, 2);
    expect(r.efficiency).toBeCloseTo(0.96, 2);
  });

  it('default build is the skewed code: lengths {1,2,3,4,4}, variance 1.36', () => {
    const r = buildHuffman(SYM, P);
    expect(sortedLengths(r.lengths)).toEqual([1, 2, 3, 4, 4]);
    expect(r.variance).toBeCloseTo(1.36, 10);
  });

  it('minVariance build is balanced: lengths {2,2,2,3,3}, variance 0.16', () => {
    const r = buildHuffman(SYM, P, { minVariance: true });
    expect(sortedLengths(r.lengths)).toEqual([2, 2, 2, 3, 3]);
    expect(r.variance).toBeCloseTo(0.16, 10);
  });

  it('produces a valid prefix code (Kraft = 1 for a full binary Huffman tree)', () => {
    const r = buildHuffman(SYM, P);
    const k = Object.values(r.lengths).reduce((s, l) => s + 2 ** -l, 0);
    expect(k).toBeCloseTo(1, 10);
  });
});

describe('huffman encode/decode round-trip', () => {
  it('round-trips an arbitrary symbol sequence', () => {
    const r = buildHuffman(SYM, P);
    const msg = ['s0', 's4', 's2', 's1', 's3', 's0', 's0'];
    const bits = huffmanEncode(msg, r.codes);
    expect(/^[01]+$/.test(bits)).toBe(true);
    expect(huffmanDecode(bits, r.root)).toEqual(msg);
  });

  it('handles a single-symbol alphabet (code "0")', () => {
    const r = buildHuffman(['a'], [1]);
    expect(r.codes.a).toBe('0');
    expect(huffmanDecode(huffmanEncode(['a', 'a'], r.codes), r.root)).toEqual(['a', 'a']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/huffman.test.ts`
Expected: FAIL ("Cannot find module '@/lib/dsp/huffman'").

- [ ] **Step 3: Implement `huffman.ts`**

Create `src/lib/dsp/huffman.ts`:

```ts
import { entropy } from './entropy';

export interface HuffmanNode {
  symbol?: string;
  prob: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

export interface HuffmanResult {
  root: HuffmanNode;
  codes: Record<string, string>; // symbol → codeword (0 = left, 1 = right)
  lengths: Record<string, number>;
  Lbar: number;
  H: number;
  efficiency: number;
  variance: number; // σ² = Σ p·(l − L̄)²
}

export interface HuffmanOptions {
  /** Place a combined node after equal-probability nodes → minimum-variance code. */
  minVariance?: boolean;
}

export function buildHuffman(
  symbols: string[],
  probs: number[],
  opts: HuffmanOptions = {},
): HuffmanResult {
  const afterEquals = opts.minVariance ?? false;
  const nodes: HuffmanNode[] = symbols.map((s, i) => ({ symbol: s, prob: probs[i] }));
  nodes.sort((a, b) => a.prob - b.prob);

  const insert = (node: HuffmanNode): void => {
    let i = 0;
    while (i < nodes.length && (afterEquals ? nodes[i].prob <= node.prob : nodes[i].prob < node.prob)) {
      i++;
    }
    nodes.splice(i, 0, node);
  };

  while (nodes.length > 1) {
    const a = nodes.shift() as HuffmanNode;
    const b = nodes.shift() as HuffmanNode;
    insert({ prob: a.prob + b.prob, left: a, right: b });
  }
  const root = nodes[0];

  const codes: Record<string, string> = {};
  const lengths: Record<string, number> = {};
  const walk = (n: HuffmanNode, prefix: string): void => {
    if (n.symbol !== undefined) {
      const code = prefix === '' ? '0' : prefix; // single-symbol alphabet → "0"
      codes[n.symbol] = code;
      lengths[n.symbol] = code.length;
      return;
    }
    if (n.left) walk(n.left, prefix + '0');
    if (n.right) walk(n.right, prefix + '1');
  };
  walk(root, '');

  let Lbar = 0;
  for (let i = 0; i < symbols.length; i++) Lbar += probs[i] * lengths[symbols[i]];
  let variance = 0;
  for (let i = 0; i < symbols.length; i++) {
    variance += probs[i] * (lengths[symbols[i]] - Lbar) ** 2;
  }
  const H = entropy(probs);

  return { root, codes, lengths, Lbar, H, efficiency: Lbar === 0 ? 0 : H / Lbar, variance };
}

/** Encode a sequence of symbols to a bit string using the codeword map. */
export function huffmanEncode(symbols: string[], codes: Record<string, string>): string {
  let bits = '';
  for (const s of symbols) bits += codes[s];
  return bits;
}

/** Decode a bit string by walking the Huffman tree; returns the symbol sequence. */
export function huffmanDecode(bits: string, root: HuffmanNode): string[] {
  const out: string[] = [];
  if (root.symbol !== undefined) {
    // single-symbol alphabet: every bit maps back to the one symbol
    for (let i = 0; i < bits.length; i++) out.push(root.symbol);
    return out;
  }
  let node = root;
  for (const b of bits) {
    node = (b === '0' ? node.left : node.right) as HuffmanNode;
    if (node.symbol !== undefined) {
      out.push(node.symbol);
      node = root;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/huffman.test.ts`
Expected: PASS (6 tests). If the variance/length assertions fail, the insertion inequality is swapped — re-read the insertion rule note above (default = strict `<`, minVariance = `<=`); do NOT change the tests.

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (expect exit 0).

```bash
git add src/lib/dsp/huffman.ts tests/dsp/huffman.test.ts
git commit -m "feat(infotheory): Huffman coding with min-variance option + encode/decode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: lz78.ts (Lempel-Ziv, book §6.3.2 / Table 6.1)

**Files:**
- Create: `src/lib/dsp/lz78.ts`
- Test: `tests/dsp/lz78.test.ts`

> Reference (book §6.3.2): input `0100001100001010000010100000110000010100001001001` (49 bits) parses into 16 phrases. Each phrase's codeword = (`indexBits`-wide binary of the previous-phrase dictionary location, 0 for the empty prefix) concatenated with the new bit. With 16 phrases, `indexBits = 4`, and the encoded length is 16·(4+1) = 80 bits. The 16 contents and codewords below are Table 6.1, verified bit-for-bit.

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/lz78.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lzParse, lzDecode } from '@/lib/dsp/lz78';

const INPUT = '0100001100001010000010100000110000010100001001001';
const CONTENTS = [
  '0', '1', '00', '001', '10', '000', '101', '0000',
  '01', '010', '00001', '100', '0001', '0100', '0010', '01001',
];
const CODEWORDS = [
  '00000', '00001', '00010', '00111', '00100', '00110', '01011', '01100',
  '00011', '10010', '10001', '01010', '01101', '10100', '01000', '11101',
];

describe('lzParse (book Table 6.1)', () => {
  const r = lzParse(INPUT);

  it('parses into 16 phrases with 4 index bits', () => {
    expect(r.phrases).toHaveLength(16);
    expect(r.indexBits).toBe(4);
  });

  it('reproduces the dictionary contents', () => {
    expect(r.phrases.map((p) => p.contents)).toEqual(CONTENTS);
  });

  it('reproduces the Table 6.1 codewords', () => {
    expect(r.phrases.map((p) => p.codeword)).toEqual(CODEWORDS);
  });

  it('maps a 49-bit input to an 80-bit encoding', () => {
    expect(r.inputLength).toBe(49);
    expect(r.encodedLength).toBe(80);
    expect(r.encoded).toBe(CODEWORDS.join(''));
  });
});

describe('lzDecode', () => {
  it('losslessly reconstructs the book input', () => {
    expect(lzDecode(lzParse(INPUT))).toBe(INPUT);
  });

  it('round-trips an arbitrary bit string (with a trailing repeated phrase)', () => {
    const x = '011010011001110';
    expect(lzDecode(lzParse(x))).toBe(x);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/lz78.test.ts`
Expected: FAIL ("Cannot find module '@/lib/dsp/lz78'").

- [ ] **Step 3: Implement `lz78.ts`**

Create `src/lib/dsp/lz78.ts`:

```ts
export interface LzPhrase {
  location: number; // 1-based dictionary index
  contents: string; // the phrase bits
  prefixIndex: number; // dictionary location of the prefix phrase (0 = empty prefix)
  newBit: string; // the appended bit ('' for a trailing phrase that repeats an existing entry)
  codeword: string; // indexBits-wide binary of prefixIndex, then newBit
}

export interface LzResult {
  phrases: LzPhrase[];
  indexBits: number;
  encoded: string;
  inputLength: number;
  encodedLength: number;
}

function toBinary(value: number, width: number): string {
  return value.toString(2).padStart(width, '0');
}

/**
 * Lempel-Ziv (LZ78) parse: split the bit string into phrases of smallest length
 * not seen before; each new phrase = an existing phrase + one new bit.
 * indexBits is sized to the final phrase count, matching the book's fixed-width scheme.
 */
export function lzParse(bits: string): LzResult {
  // First pass: discover phrases (contents, prefixIndex, newBit).
  interface Raw {
    contents: string;
    prefixIndex: number;
    newBit: string;
  }
  const dict = new Map<string, number>(); // contents → location (1-based)
  const raw: Raw[] = [];
  let cur = '';
  for (const b of bits) {
    cur += b;
    if (!dict.has(cur)) {
      const prefix = cur.slice(0, -1);
      const prefixIndex = prefix === '' ? 0 : (dict.get(prefix) as number);
      dict.set(cur, raw.length + 1);
      raw.push({ contents: cur, prefixIndex, newBit: cur.slice(-1) });
      cur = '';
    }
  }
  // Trailing partial phrase: it equals an already-seen phrase; emit it with no new bit.
  if (cur !== '') {
    raw.push({ contents: cur, prefixIndex: dict.get(cur) as number, newBit: '' });
  }

  const indexBits = Math.max(1, Math.ceil(Math.log2(raw.length)));
  const phrases: LzPhrase[] = raw.map((p, i) => ({
    location: i + 1,
    contents: p.contents,
    prefixIndex: p.prefixIndex,
    newBit: p.newBit,
    codeword: toBinary(p.prefixIndex, indexBits) + p.newBit,
  }));
  const encoded = phrases.map((p) => p.codeword).join('');

  return {
    phrases,
    indexBits,
    encoded,
    inputLength: bits.length,
    encodedLength: encoded.length,
  };
}

/** Reconstruct the original bit string from a parse result (lossless). */
export function lzDecode(result: LzResult): string {
  const byLocation: Record<number, string> = { 0: '' };
  let out = '';
  for (const p of result.phrases) {
    const contents = byLocation[p.prefixIndex] + p.newBit;
    byLocation[p.location] = contents;
    out += contents;
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/lz78.test.ts`
Expected: PASS (6 tests) — contents and codewords match Table 6.1 exactly, encoded length 80, both decodes round-trip.

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (expect exit 0).

```bash
git add src/lib/dsp/lz78.ts tests/dsp/lz78.test.ts
git commit -m "feat(infotheory): Lempel-Ziv (LZ78) parse/encode/decode per book Table 6.1

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: capacity.ts (channel capacity, book Ch. 9.2)

**Files:**
- Create: `src/lib/dsp/capacity.ts`
- Test: `tests/dsp/capacity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/capacity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bscCapacity, shannonCapacity, gaussianCapacity, snrDbToLinear } from '@/lib/dsp/capacity';

describe('bscCapacity = 1 − H_b(ε)', () => {
  it('is 1 at ε=0 and ε=1, and 0 at ε=0.5 (book Fig. 9.7)', () => {
    expect(bscCapacity(0)).toBeCloseTo(1, 10);
    expect(bscCapacity(1)).toBeCloseTo(1, 10);
    expect(bscCapacity(0.5)).toBeCloseTo(0, 10);
  });
  it('is symmetric about ε=0.5', () => {
    expect(bscCapacity(0.1)).toBeCloseTo(bscCapacity(0.9), 10);
  });
});

describe('shannonCapacity = B·log2(1+SNR)', () => {
  it('equals B at SNR=1 (one bit per Hz)', () => {
    expect(shannonCapacity(1, 1)).toBeCloseTo(1, 10);
    expect(shannonCapacity(1000, 1)).toBeCloseTo(1000, 10);
  });
  it('increases monotonically with SNR', () => {
    expect(shannonCapacity(1, 10)).toBeGreaterThan(shannonCapacity(1, 1));
  });
});

describe('gaussianCapacity = 0.5·log2(1+P/Pn)', () => {
  it('is 0.5 bit/use at P=Pn', () => {
    expect(gaussianCapacity(1, 1)).toBeCloseTo(0.5, 10);
  });
});

describe('snrDbToLinear', () => {
  it('converts dB to linear power ratio', () => {
    expect(snrDbToLinear(0)).toBeCloseTo(1, 10);
    expect(snrDbToLinear(10)).toBeCloseTo(10, 10);
    expect(snrDbToLinear(20)).toBeCloseTo(100, 10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/dsp/capacity.test.ts`
Expected: FAIL ("Cannot find module '@/lib/dsp/capacity'").

- [ ] **Step 3: Implement `capacity.ts`**

Create `src/lib/dsp/capacity.ts`:

```ts
import { binaryEntropy } from './entropy';

/** Capacity of a binary symmetric channel with crossover probability ε: C = 1 − H_b(ε). */
export function bscCapacity(eps: number): number {
  return 1 - binaryEntropy(eps);
}

/** Shannon capacity of a band-limited AWGN channel: C = B·log2(1 + SNR), bits/s. */
export function shannonCapacity(bandwidthHz: number, snrLinear: number): number {
  return bandwidthHz * Math.log2(1 + snrLinear);
}

/** Capacity of the discrete-time AWGN channel: C = 0.5·log2(1 + P/Pn), bits/use. */
export function gaussianCapacity(P: number, Pn: number): number {
  return 0.5 * Math.log2(1 + P / Pn);
}

/** Convert an SNR in decibels to a linear power ratio. */
export function snrDbToLinear(db: number): number {
  return 10 ** (db / 10);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/dsp/capacity.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (expect exit 0).

```bash
git add src/lib/dsp/capacity.ts tests/dsp/capacity.test.ts
git commit -m "feat(infotheory): channel capacity (BSC, Shannon, Gaussian)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass — prior 116 + new entropy (6) + codes (7) + huffman (6) + lz78 (6) + capacity (6) = 147 tests. No failures.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0, no warnings.

- [ ] **Step 3: Type-check / build**

Run: `npm run build`
Expected: `tsc --noEmit` clean, `vite build` succeeds.

- [ ] **Step 4: Status check**

Run: `git status -s`
Expected: clean (all five modules + tests committed across Tasks 1–5).

---

## Self-Review (spec §2.1 coverage)

- **entropy.ts** (`selfInfo`, `entropy`, `maxEntropy`, `binaryEntropy`, `extendedEntropy`; H{0.7,0.2,0.1}=1.1568, Hb(0.5)=1, H(S²)=2.3136) → Task 1. ✓
- **codes.ts** (`kraftSum`, `isPrefixFree`, `avgLength`, `efficiency`, `isUniquelyDecodable`, `decodePrefix`; Code-I/II/III Kraft 1.5/1.0/0.9375, prefix F/T/F, UD F/T/**T**) → Task 2. ✓ Code-III UD-but-not-prefix correction implemented and asserted.
- **huffman.ts** (`buildHuffman` + `minVariance`, `huffmanEncode`, `huffmanDecode`; L̄=2.2, H≈2.12, η≈0.96, variance 1.36 default / 0.16 min-variance) → Task 3. ✓ Exact bit-strings intentionally not asserted (Huffman non-uniqueness); invariants + round-trip tested instead.
- **lz78.ts** (`lzParse`, `lzDecode`; book Table 6.1 contents + codewords, 16 phrases, 80-bit encoding, lossless) → Task 4. ✓
- **capacity.ts** (`bscCapacity`, `shannonCapacity`, `gaussianCapacity`, `snrDbToLinear`; BSC C(0)=C(1)=1/C(0.5)=0, Shannon C(B,1)=B) → Task 5. ✓

**Placeholder scan:** none — every step has complete code/commands.

**Type consistency:** `HuffmanNode`/`HuffmanResult`/`HuffmanOptions` used consistently across Task 3; `LzPhrase`/`LzResult` consistent across Task 4 (and `lzDecode` reads `phrases`/`prefixIndex`/`newBit`/`location` exactly as `lzParse` writes them). `binaryEntropy` imported by `capacity.ts` and `entropy` by `huffman.ts` — both defined in Task 1 (built first). No forward references to undefined symbols.

**Build-order note:** Task 1 (`entropy.ts`) must precede Tasks 3 and 5 (they import from it). The plan orders them 1 → 3 → 5, so subagent-driven execution is safe.
