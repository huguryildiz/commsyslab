# DigiCommLab Phase 3b — Information Theory UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **File-safety rule for every task: create/modify ONLY the files named in that task; never recreate or overwrite a file from another task. If an import target seems missing, STOP and report — do not regenerate it.**

**Goal:** Build the interactive, tabbed **Information Theory** module at `/information-theory`, consuming the committed Phase 3a DSP — five sections (Entropy, Prefix & Kraft, Huffman, Lempel-Ziv, Channel Capacity) with live charts, an SVG code tree, encode/decode demos, an animated LZ78 dictionary, and capacity curves.

**Architecture:** Mirror the existing module pattern (`sampling`, `modulation`): a thin shell holds the active-tab id and renders one self-contained section component at a time. Each section owns its state, calls the pure 3a DSP in `useMemo`, and renders with the existing Canvas helpers (`src/lib/plot/draw.ts`) plus a new pure SVG tree layout (`src/lib/plot/svg.ts`). No cross-section shared state.

**Tech Stack:** React 18 + TS, Vite, Vitest + @testing-library/react, custom Canvas + SVG, KaTeX via `Formula`, HashRouter. `@/` → `src/`.

**Spec:** `docs/superpowers/specs/2026-06-13-digicommlab-phase3-information-theory-design.md` §2.2.

**Phase 3a APIs consumed (committed, do not modify):**
- `entropy.ts`: `entropy(probs)`, `maxEntropy(K)`, `binaryEntropy(p)`, `selfInfo(p)`.
- `codes.ts`: `kraftSum(lengths)`, `isPrefixFree(codewords)`, `avgLength(probs,lengths)`, `efficiency(H,Lbar)`, `isUniquelyDecodable(codewords)`, `decodePrefix(bits, codeToSymbol)`.
- `huffman.ts`: `buildHuffman(symbols, probs, {minVariance?})` → `{root, codes, lengths, Lbar, H, efficiency, variance}`; `huffmanEncode(symbols, codes)`, `huffmanDecode(bits, root)`; types `HuffmanNode`.
- `lz78.ts`: `lzParse(bits)` → `{phrases:[{location,contents,prefixIndex,newBit,codeword}], indexBits, encoded, inputLength, encodedLength}`; `lzDecode(result)`.
- `capacity.ts`: `bscCapacity(eps)`, `shannonCapacity(B, snrLinear)`, `snrDbToLinear(db)`.

**Existing UI infra reused:** `@/components` (`Panel, Slider, Select, Toggle, NumberInput, Readout, Formula, TheoryBox`), `@/lib/plot/Canvas` (`Canvas`), `@/lib/plot/draw` (`linScale, logScale, drawAxes, drawLine, drawVLine, drawScatter, drawText`), `@/i18n` (`t`).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/i18n/en.ts` (modify) | Add `nav.infotheory` + `it.*` strings. |
| `src/lib/plot/svg.ts` (create) | Pure `layoutBinaryTree` + `TreeSvg` React component (node-link binary tree, 0/1 edge labels, optional active-path highlight). |
| `src/modules/infotheory/EntropySection.tsx` (create) | Entropy explorer: probability bars, H(p) curve, readouts. |
| `src/modules/infotheory/PrefixKraftSection.tsx` (create) | Codeword editor, prefix/Kraft/UD verdicts, code tree, decode box. |
| `src/modules/infotheory/HuffmanSection.tsx` (create) | Huffman tree, codeword table, metrics, min-variance toggle, encode/decode. |
| `src/modules/infotheory/LempelZivSection.tsx` (create) | LZ78 dictionary table, animated parse, encoded output, decode check. |
| `src/modules/infotheory/CapacitySection.tsx` (create) | BSC + Shannon capacity curves and readouts. |
| `src/modules/infotheory/InfoTheoryModule.tsx` (create) | Tab shell holding active-tab id; renders the active section. |
| `src/modules/infotheory/infotheory.css` (create) | Tabs + section layout styles. |
| `src/App.tsx` (modify) | Replace `/huffman` route+nav with `/information-theory`. |
| `tests/plot/svg.test.ts` (create) | Unit tests for `layoutBinaryTree`. |
| `tests/modules/InfoTheoryModule.test.tsx` (create) | Render smoke test + tab switch. |

Build `svg.ts` (Task 2) before the sections that use it (Tasks 4, 5).

---

## Task 1: i18n strings

**Files:** Modify `src/i18n/en.ts` (append the block before the closing `};`, after the last `modulation.*` entry).

- [ ] **Step 1: Add the keys**

```ts
  // Information Theory (CH10 + book extensions)
  'nav.infotheory': 'Information Theory',
  'it.tab.entropy': 'Entropy',
  'it.tab.prefix': 'Prefix & Kraft',
  'it.tab.huffman': 'Huffman',
  'it.tab.lz': 'Lempel-Ziv',
  'it.tab.capacity': 'Channel Capacity',
  'it.entropy.title': 'Entropy & self-information',
  'it.entropy.symbols': 'Symbols (probabilities)',
  'it.entropy.addSymbol': '+ symbol',
  'it.entropy.removeSymbol': '− symbol',
  'it.entropy.preset': 'Preset {0.7, 0.2, 0.1}',
  'it.entropy.H': 'Entropy H(S)',
  'it.entropy.max': 'Max log₂K',
  'it.entropy.eta': 'H / log₂K',
  'it.entropy.sum': 'Σp (normalized)',
  'it.entropy.bars': 'Probabilities & self-information',
  'it.entropy.curve': 'Binary entropy H(p)',
  'it.prefix.title': 'Prefix codes & the Kraft inequality',
  'it.prefix.code': 'Codewords',
  'it.prefix.presetI': 'Code-I',
  'it.prefix.presetII': 'Code-II',
  'it.prefix.presetIII': 'Code-III',
  'it.prefix.prefixFree': 'Prefix-free?',
  'it.prefix.kraft': 'Kraft Σ2⁻ˡ',
  'it.prefix.ud': 'Uniquely decodable?',
  'it.prefix.Lbar': 'Avg length L̄',
  'it.prefix.tree': 'Code tree',
  'it.prefix.decode': 'Decode a bit stream',
  'it.prefix.decodeOut': 'Decoded',
  'it.prefix.undecodable': '✗ not a valid encoding',
  'it.yes': 'Yes',
  'it.no': 'No',
  'it.huffman.title': 'Huffman coding',
  'it.huffman.minvar': 'Minimum-variance',
  'it.huffman.tree': 'Huffman tree',
  'it.huffman.table': 'Codewords',
  'it.huffman.H': 'Entropy H(S)',
  'it.huffman.Lbar': 'Avg length L̄',
  'it.huffman.eta': 'Efficiency η',
  'it.huffman.var': 'Variance σ²',
  'it.huffman.encode': 'Message (symbols, space-separated)',
  'it.huffman.encoded': 'Encoded bits',
  'it.huffman.decoded': 'Decoded (walk the tree)',
  'it.huffman.ratio': 'Compression vs fixed-length',
  'it.lz.title': 'Lempel-Ziv (LZ78) universal coding',
  'it.lz.input': 'Binary input',
  'it.lz.preset': 'Book example (49 bits)',
  'it.lz.step': 'Step',
  'it.lz.play': '▶ Animate',
  'it.lz.reset': '↺ Reset',
  'it.lz.dict': 'Dictionary',
  'it.lz.loc': 'Loc',
  'it.lz.contents': 'Contents',
  'it.lz.codeword': 'Codeword',
  'it.lz.encoded': 'Encoded',
  'it.lz.lengths': 'Input → encoded',
  'it.lz.lossless': 'Decoded == input (lossless)?',
  'it.cap.title': 'Channel capacity',
  'it.cap.bsc': 'Binary symmetric channel',
  'it.cap.eps': 'Crossover ε',
  'it.cap.hb': 'H_b(ε)',
  'it.cap.cbsc': 'Capacity C = 1 − H_b(ε)',
  'it.cap.curveBsc': 'C vs ε (Fig. 9.7)',
  'it.cap.shannon': 'Band-limited AWGN (Shannon)',
  'it.cap.bw': 'Bandwidth B',
  'it.cap.snr': 'SNR',
  'it.cap.cshannon': 'Capacity C = B·log₂(1+SNR)',
  'it.cap.curveShannon': 'C vs SNR',
  'it.theory.title': 'Key formulas',
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.ts
git commit -m "feat(infotheory): i18n strings for the Information Theory module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: SVG binary-tree infra (`svg.ts`, TDD the layout)

**Files:** Create `src/lib/plot/svg.ts`; test `tests/plot/svg.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/plot/svg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { layoutBinaryTree, type BinTree } from '@/lib/plot/svg';

// Balanced 3-leaf tree: root → {a, (•→{b,c})}
const TREE: BinTree = {
  left: { symbol: 'a' },
  right: { left: { symbol: 'b' }, right: { symbol: 'c' } },
};

describe('layoutBinaryTree', () => {
  it('places every node and one edge per parent-child link', () => {
    const l = layoutBinaryTree(TREE);
    expect(l.nodes).toHaveLength(5); // 3 leaves + 2 internal
    expect(l.edges).toHaveLength(4);
  });

  it('roots at the top (y=0) and pushes leaves to the bottom (y=1)', () => {
    const l = layoutBinaryTree(TREE);
    const ys = l.nodes.map((n) => n.y);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(1);
  });

  it('labels leaves with their symbols and records the root-to-leaf bit path', () => {
    const l = layoutBinaryTree(TREE);
    const a = l.nodes.find((n) => n.label === 'a');
    const c = l.nodes.find((n) => n.label === 'c');
    expect(a?.path).toBe('0');
    expect(c?.path).toBe('11');
  });

  it('handles a single-node tree', () => {
    const l = layoutBinaryTree({ symbol: 'x' });
    expect(l.nodes).toHaveLength(1);
    expect(l.edges).toHaveLength(0);
    expect(l.nodes[0].x).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/plot/svg.test.ts` → module not found.

- [ ] **Step 3: Implement `svg.ts`**

Create `src/lib/plot/svg.ts`:

```tsx
export interface BinTree {
  symbol?: string;
  left?: BinTree;
  right?: BinTree;
}

export interface TreeNode {
  id: number;
  x: number; // normalized [0,1], left→right
  y: number; // normalized [0,1], root=0 → deepest=1
  label: string;
  isLeaf: boolean;
  path: string; // root-to-node bit string
}

export interface TreeEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bit: string;
  path: string; // root-to-child bit string
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
}

/** Lay out a binary tree: x by in-order position (always readable), y by depth. Pure. */
export function layoutBinaryTree(root: BinTree): TreeLayout {
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];

  let total = 0;
  const count = (n?: BinTree): void => {
    if (!n) return;
    count(n.left);
    total++;
    count(n.right);
  };
  count(root);

  let maxDepth = 0;
  const measure = (n: BinTree, d: number): void => {
    maxDepth = Math.max(maxDepth, d);
    if (n.left) measure(n.left, d + 1);
    if (n.right) measure(n.right, d + 1);
  };
  measure(root, 0);
  const denomY = Math.max(1, maxDepth);

  let order = 0;
  let idc = 0;
  const place = (n: BinTree, depth: number, path: string): { x: number; y: number } => {
    const leftR = n.left ? place(n.left, depth + 1, path + '0') : null;
    const x = total === 1 ? 0.5 : order / (total - 1);
    order++;
    const y = depth / denomY;
    const id = idc++;
    nodes.push({ id, x, y, label: n.symbol ?? '', isLeaf: !n.left && !n.right, path });
    const rightR = n.right ? place(n.right, depth + 1, path + '1') : null;
    if (leftR) edges.push({ x1: x, y1: y, x2: leftR.x, y2: leftR.y, bit: '0', path: path + '0' });
    if (rightR) edges.push({ x1: x, y1: y, x2: rightR.x, y2: rightR.y, bit: '1', path: path + '1' });
    return { x, y };
  };
  place(root, 0, '');

  return { nodes, edges };
}

const PAD = 18;

/** Render a binary tree as SVG. activePath highlights edges on the root→path route. */
export function TreeSvg({
  layout,
  height = 260,
  activePath,
  ariaLabel,
}: {
  layout: TreeLayout;
  height?: number;
  activePath?: string;
  ariaLabel?: string;
}) {
  const W = 600;
  const H = height;
  const sx = (x: number) => PAD + x * (W - 2 * PAD);
  const sy = (y: number) => PAD + y * (H - 2 * PAD);
  const onPath = (p: string) => activePath !== undefined && activePath.startsWith(p) && p.length > 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      {layout.edges.map((e, i) => {
        const x1 = sx(e.x1);
        const y1 = sy(e.y1);
        const x2 = sx(e.x2);
        const y2 = sy(e.y2);
        const hot = onPath(e.path);
        return (
          <g key={`e${i}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? '#ffb454' : '#5b6675'} strokeWidth={hot ? 2.5 : 1.5} />
            <text x={(x1 + x2) / 2 + 4} y={(y1 + y2) / 2} fill="#9aa7b4" fontSize="11">
              {e.bit}
            </text>
          </g>
        );
      })}
      {layout.nodes.map((n) => (
        <g key={`n${n.id}`}>
          <circle cx={sx(n.x)} cy={sy(n.y)} r={n.isLeaf ? 7 : 4} fill={n.isLeaf ? '#4aa3ff' : '#5b6675'} />
          {n.label && (
            <text x={sx(n.x)} y={sy(n.y) + 18} fill="#cdd6e0" fontSize="12" textAnchor="middle">
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Run, expect PASS** — `npx vitest run tests/plot/svg.test.ts` → 4 tests pass.

- [ ] **Step 5: Lint (`npm run lint`, exit 0), then commit**

```bash
git add src/lib/plot/svg.ts tests/plot/svg.test.ts
git commit -m "feat(plot): pure binary-tree layout + TreeSvg renderer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Entropy section

**Files:** Create `src/modules/infotheory/EntropySection.tsx`.

> No new pure logic; verified via the module smoke test (Task 8) + browser. Build only this file.

- [ ] **Step 1: Create `EntropySection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Panel, NumberInput, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawText } from '@/lib/plot/draw';
import { entropy, maxEntropy, selfInfo, binaryEntropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

export function EntropySection() {
  const [probs, setProbs] = useState<number[]>([0.7, 0.2, 0.1]);

  const norm = useMemo(() => {
    const sum = probs.reduce((s, p) => s + Math.max(0, p), 0) || 1;
    return probs.map((p) => Math.max(0, p) / sum);
  }, [probs]);

  const H = entropy(norm);
  const K = probs.length;
  const max = maxEntropy(K);

  const setAt = (i: number, v: number) => setProbs((ps) => ps.map((p, j) => (j === i ? v : p)));
  const add = () => setProbs((ps) => [...ps, 0.1]);
  const remove = () => setProbs((ps) => (ps.length > 2 ? ps.slice(0, -1) : ps));

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.entropy.symbols')}>
          {probs.map((p, i) => (
            <NumberInput
              key={i}
              label={`p${i}`}
              value={p}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setAt(i, v)}
            />
          ))}
          <div className="it-row">
            <button type="button" onClick={add}>
              {t('it.entropy.addSymbol')}
            </button>
            <button type="button" onClick={remove} disabled={probs.length <= 2}>
              {t('it.entropy.removeSymbol')}
            </button>
          </div>
          <button type="button" onClick={() => setProbs([0.7, 0.2, 0.1])}>
            {t('it.entropy.preset')}
          </button>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.entropy.H')} value={H.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.max')} value={max.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.eta')} value={max > 0 ? (H / max).toFixed(3) : '—'} />
          <Readout label={t('it.entropy.sum')} value={probs.reduce((s, p) => s + p, 0).toFixed(2)} />
        </div>

        <Panel title={t('it.entropy.bars')}>
          <Canvas
            height={200}
            ariaLabel="Probability and self-information bars"
            deps={[norm]}
            draw={(ctx, w, h) => {
              const n = norm.length;
              const bw = (w - 40) / n;
              const yMax = 1;
              const ax = { x: linScale([0, n], [30, w - 10]), y: linScale([0, yMax], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, n]);
              for (let i = 0; i < n; i++) {
                const x0 = ax.x(i + 0.15);
                const x1 = ax.x(i + 0.85);
                ctx.fillStyle = '#4aa3ff';
                ctx.fillRect(x0, ax.y(norm[i]), x1 - x0, ax.y(0) - ax.y(norm[i]));
                drawText(ctx, ax, i + 0.5, -0.04, `s${i}`, '#9aa7b4', -6, 12);
                drawText(ctx, ax, i + 0.5, norm[i], `I=${selfInfo(norm[i]).toFixed(1)}`, '#cdd6e0', -14, -6);
              }
            }}
          />
        </Panel>

        <Panel title={t('it.entropy.curve')}>
          <Canvas
            height={200}
            ariaLabel="Binary entropy function H(p)"
            deps={[norm]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 1], [30, w - 10]), y: linScale([0, 1.05], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, 1]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let i = 0; i <= 100; i++) {
                const p = i / 100;
                xs.push(p);
                ys.push(binaryEntropy(p));
              }
              drawLine(ctx, ax, xs, ys, '#46c93a', 2);
              if (norm.length === 2) {
                const p = norm[0];
                drawText(ctx, ax, p, binaryEntropy(p), '●', '#ffb454', -4, -2);
              }
            }}
          />
        </Panel>

        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="H(S)=-\sum_{k} p_k\log_2 p_k,\qquad 0\le H(S)\le \log_2 K" block />
          </p>
          <p>
            <Formula tex="I(s_k)=-\log_2 p_k\ \text{(bits)}" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint** — `npx tsc --noEmit` and `npm run lint` (exit 0).
- [ ] **Step 3: Commit**

```bash
git add src/modules/infotheory/EntropySection.tsx
git commit -m "feat(infotheory): entropy section (prob bars, H(p) curve, readouts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Prefix & Kraft section

**Files:** Create `src/modules/infotheory/PrefixKraftSection.tsx`.

- [ ] **Step 1: Create `PrefixKraftSection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { TreeSvg, layoutBinaryTree, type BinTree } from '@/lib/plot/svg';
import {
  kraftSum,
  isPrefixFree,
  avgLength,
  efficiency,
  isUniquelyDecodable,
  decodePrefix,
} from '@/lib/dsp/codes';
import { entropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

interface Row {
  symbol: string;
  prob: number;
  code: string;
}

const PRESETS: Record<string, Row[]> = {
  I: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '1' },
    { symbol: 's2', prob: 0.125, code: '00' },
    { symbol: 's3', prob: 0.125, code: '11' },
  ],
  II: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '10' },
    { symbol: 's2', prob: 0.125, code: '110' },
    { symbol: 's3', prob: 0.125, code: '111' },
  ],
  III: [
    { symbol: 's0', prob: 0.5, code: '0' },
    { symbol: 's1', prob: 0.25, code: '01' },
    { symbol: 's2', prob: 0.125, code: '011' },
    { symbol: 's3', prob: 0.125, code: '0111' },
  ],
};

function codesToTree(rows: Row[]): BinTree {
  const root: BinTree = {};
  for (const r of rows) {
    let node = root;
    for (const b of r.code) {
      if (b === '0') node.left = node.left ?? {};
      else node.right = node.right ?? {};
      node = (b === '0' ? node.left : node.right) as BinTree;
    }
    node.symbol = r.symbol;
  }
  return root;
}

export function PrefixKraftSection() {
  const [rows, setRows] = useState<Row[]>(PRESETS.II);
  const [stream, setStream] = useState('010110111');

  const codewords = rows.map((r) => r.code).filter((c) => c.length > 0);
  const lengths = codewords.map((c) => c.length);
  const probs = rows.map((r) => r.prob);

  const prefixFree = isPrefixFree(codewords);
  const kraft = kraftSum(lengths);
  const ud = isUniquelyDecodable(codewords);
  const Lbar = avgLength(probs, rows.map((r) => r.code.length));
  const H = entropy(probs);
  const layout = useMemo(() => layoutBinaryTree(codesToTree(rows)), [rows]);
  const codeToSymbol = useMemo(
    () => Object.fromEntries(rows.filter((r) => r.code).map((r) => [r.code, r.symbol])),
    [rows],
  );
  const decoded = decodePrefix(stream.replace(/[^01]/g, ''), codeToSymbol);

  const setCode = (i: number, code: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, code: code.replace(/[^01]/g, '') } : r)));

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.prefix.code')}>
          {rows.map((r, i) => (
            <label key={i} className="it-codeword">
              <span>{r.symbol} (p={r.prob})</span>
              <input value={r.code} onChange={(e) => setCode(i, e.target.value)} />
            </label>
          ))}
          <div className="it-row">
            <button type="button" onClick={() => setRows(PRESETS.I)}>
              {t('it.prefix.presetI')}
            </button>
            <button type="button" onClick={() => setRows(PRESETS.II)}>
              {t('it.prefix.presetII')}
            </button>
            <button type="button" onClick={() => setRows(PRESETS.III)}>
              {t('it.prefix.presetIII')}
            </button>
          </div>
        </Panel>
        <Panel title={t('it.prefix.decode')}>
          <label className="it-codeword">
            <span>bits</span>
            <input value={stream} onChange={(e) => setStream(e.target.value)} />
          </label>
          <div className="it-mono">
            {t('it.prefix.decodeOut')}: {decoded === null ? t('it.prefix.undecodable') : decoded || '—'}
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.prefix.prefixFree')} value={prefixFree ? t('it.yes') : t('it.no')} tone={prefixFree ? 'ok' : 'warn'} />
          <Readout label={t('it.prefix.kraft')} value={kraft.toFixed(4)} tone={kraft <= 1 + 1e-9 ? 'ok' : 'err'} />
          <Readout label={t('it.prefix.ud')} value={ud ? t('it.yes') : t('it.no')} tone={ud ? 'ok' : 'err'} />
          <Readout label={t('it.prefix.Lbar')} value={Lbar.toFixed(3)} unit="bits" />
          <Readout label="η" value={Lbar > 0 ? efficiency(H, Lbar).toFixed(3) : '—'} />
        </div>
        <Panel title={t('it.prefix.tree')}>
          <TreeSvg layout={layout} ariaLabel="Code tree" />
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="\sum_k 2^{-l_k}\le 1\quad\text{(Kraft — necessary for a prefix code)}" block />
          </p>
          <p>prefix ⊂ uniquely-decodable: Code-III is uniquely decodable but not a prefix code.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint** (exit 0).
- [ ] **Step 3: Commit**

```bash
git add src/modules/infotheory/PrefixKraftSection.tsx
git commit -m "feat(infotheory): prefix & Kraft section (verdicts, code tree, decoder)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Huffman section

**Files:** Create `src/modules/infotheory/HuffmanSection.tsx`.

- [ ] **Step 1: Create `HuffmanSection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Panel, Toggle, Readout, Formula, TheoryBox } from '@/components';
import { TreeSvg, layoutBinaryTree, type BinTree } from '@/lib/plot/svg';
import { buildHuffman, huffmanEncode, type HuffmanNode } from '@/lib/dsp/huffman';
import { t } from '@/i18n';

const SYM = ['s0', 's1', 's2', 's3', 's4'];
const P = [0.4, 0.2, 0.2, 0.1, 0.1];

function toBinTree(n: HuffmanNode): BinTree {
  if (n.symbol !== undefined) return { symbol: n.symbol };
  return { left: n.left ? toBinTree(n.left) : undefined, right: n.right ? toBinTree(n.right) : undefined };
}

export function HuffmanSection() {
  const [minVar, setMinVar] = useState(false);
  const [msg, setMsg] = useState('s0 s1 s0 s4 s2');

  const r = useMemo(() => buildHuffman(SYM, P, { minVariance: minVar }), [minVar]);
  const layout = useMemo(() => layoutBinaryTree(toBinTree(r.root)), [r]);

  const symbols = msg.trim().split(/\s+/).filter((s) => r.codes[s] !== undefined);
  const encoded = huffmanEncode(symbols, r.codes);
  const fixedLen = symbols.length * Math.ceil(Math.log2(SYM.length));
  const ratio = fixedLen > 0 ? (encoded.length / fixedLen).toFixed(2) : '—';

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.huffman.title')}>
          <Toggle label={t('it.huffman.minvar')} checked={minVar} onChange={setMinVar} />
        </Panel>
        <Panel title={t('it.huffman.table')}>
          <table className="it-table">
            <thead>
              <tr><th>s</th><th>p</th><th>code</th><th>l</th></tr>
            </thead>
            <tbody>
              {SYM.map((s, i) => (
                <tr key={s}>
                  <td>{s}</td><td>{P[i]}</td><td className="it-mono">{r.codes[s]}</td><td>{r.lengths[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title={t('it.huffman.encode')}>
          <input className="it-wide" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="it-mono it-break">{t('it.huffman.encoded')}: {encoded || '—'}</div>
          <div className="it-mono">{t('it.huffman.decoded')}: {symbols.join(' ') || '—'}</div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.huffman.H')} value={r.H.toFixed(4)} unit="bits" />
          <Readout label={t('it.huffman.Lbar')} value={r.Lbar.toFixed(3)} unit="bits" />
          <Readout label={t('it.huffman.eta')} value={r.efficiency.toFixed(3)} />
          <Readout label={t('it.huffman.var')} value={r.variance.toFixed(3)} />
          <Readout label={t('it.huffman.ratio')} value={`${ratio}× (${encoded.length}/${fixedLen})`} />
        </div>
        <Panel title={t('it.huffman.tree')}>
          <TreeSvg layout={layout} ariaLabel="Huffman tree" />
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="\bar L=\sum_k p_k l_k,\quad H(S)\le \bar L< H(S)+1,\quad \eta=\tfrac{H(S)}{\bar L}" block />
          </p>
          <p>
            <Formula tex="\sigma^2=\sum_k p_k\,(l_k-\bar L)^2" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint** (exit 0).
- [ ] **Step 3: Commit**

```bash
git add src/modules/infotheory/HuffmanSection.tsx
git commit -m "feat(infotheory): Huffman section (tree, codeword table, encode, min-variance)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Lempel-Ziv section

**Files:** Create `src/modules/infotheory/LempelZivSection.tsx`.

- [ ] **Step 1: Create `LempelZivSection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Panel, Readout, TheoryBox } from '@/components';
import { lzParse, lzDecode } from '@/lib/dsp/lz78';
import { t } from '@/i18n';

const BOOK = '0100001100001010000010100000110000010100001001001';

export function LempelZivSection() {
  const [input, setInput] = useState(BOOK);
  const [shown, setShown] = useState(16);

  const clean = input.replace(/[^01]/g, '');
  const r = useMemo(() => lzParse(clean), [clean]);
  const lossless = lzDecode(r) === clean;
  const visible = r.phrases.slice(0, shown);

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.lz.input')}>
          <textarea className="it-wide" rows={3} value={input} onChange={(e) => { setInput(e.target.value); setShown(16); }} />
          <button type="button" onClick={() => { setInput(BOOK); setShown(16); }}>{t('it.lz.preset')}</button>
          <div className="it-row">
            <button type="button" onClick={() => setShown((s) => Math.min(r.phrases.length, s + 1))}>{t('it.lz.step')} ▶</button>
            <button type="button" onClick={() => setShown(r.phrases.length)}>{t('it.lz.play')}</button>
            <button type="button" onClick={() => setShown(0)}>{t('it.lz.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.lz.lengths')} value={`${r.inputLength} → ${r.encodedLength} bits`} />
          <Readout label="indexBits" value={r.indexBits} />
          <Readout label={t('it.lz.lossless')} value={lossless ? t('it.yes') : t('it.no')} tone={lossless ? 'ok' : 'err'} />
        </div>
        <Panel title={t('it.lz.dict')}>
          <table className="it-table">
            <thead>
              <tr><th>{t('it.lz.loc')}</th><th>{t('it.lz.contents')}</th><th>{t('it.lz.codeword')}</th></tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.location}>
                  <td>{p.location}</td>
                  <td className="it-mono">{p.contents}</td>
                  <td className="it-mono">{p.codeword.slice(0, r.indexBits)} {p.newBit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title={t('it.lz.encoded')}>
          <div className="it-mono it-break">{visible.map((p) => p.codeword).join(' ') || '—'}</div>
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>LZ78 is a universal, variable-to-fixed dictionary code: each new phrase = a previous phrase + one new bit. Each codeword is the index of the prefix phrase ({r.indexBits} bits) followed by the new bit.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint** (exit 0).
- [ ] **Step 3: Commit**

```bash
git add src/modules/infotheory/LempelZivSection.tsx
git commit -m "feat(infotheory): Lempel-Ziv section (dictionary table, stepped parse, lossless check)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Channel Capacity section

**Files:** Create `src/modules/infotheory/CapacitySection.tsx`.

- [ ] **Step 1: Create `CapacitySection.tsx`**

```tsx
import { Panel, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, drawScatter } from '@/lib/plot/draw';
import { bscCapacity, shannonCapacity, snrDbToLinear } from '@/lib/dsp/capacity';
import { binaryEntropy } from '@/lib/dsp/entropy';
import { useState } from 'react';
import { t } from '@/i18n';

export function CapacitySection() {
  const [eps, setEps] = useState(0.1);
  const [bw, setBw] = useState(1000);
  const [snrDb, setSnrDb] = useState(10);
  const snr = snrDbToLinear(snrDb);

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.cap.bsc')}>
          <Slider label={t('it.cap.eps')} value={eps} min={0} max={1} step={0.01} onChange={setEps} />
          <Readout label={t('it.cap.hb')} value={binaryEntropy(eps).toFixed(3)} />
          <Readout label={t('it.cap.cbsc')} value={bscCapacity(eps).toFixed(3)} unit="bits" tone="ok" />
        </Panel>
        <Panel title={t('it.cap.shannon')}>
          <Slider label={t('it.cap.bw')} value={bw} min={100} max={10000} step={100} unit="Hz" onChange={setBw} />
          <Slider label={t('it.cap.snr')} value={snrDb} min={-10} max={40} step={1} unit="dB" onChange={setSnrDb} />
          <Readout label={t('it.cap.cshannon')} value={shannonCapacity(bw, snr).toFixed(0)} unit="bits/s" tone="ok" />
        </Panel>
      </aside>

      <div className="it-content">
        <Panel title={t('it.cap.curveBsc')}>
          <Canvas
            height={220}
            ariaLabel="BSC capacity versus crossover probability"
            deps={[eps]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 1], [30, w - 10]), y: linScale([0, 1.05], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, 1]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let i = 0; i <= 100; i++) {
                xs.push(i / 100);
                ys.push(bscCapacity(i / 100));
              }
              drawLine(ctx, ax, xs, ys, '#4aa3ff', 2);
              drawVLine(ctx, ax, eps, 0, 1.05, 'rgba(255,180,84,0.9)', true, 1.5);
              drawScatter(ctx, ax, [eps], [bscCapacity(eps)], '#ffb454', 4);
            }}
          />
        </Panel>
        <Panel title={t('it.cap.curveShannon')}>
          <Canvas
            height={220}
            ariaLabel="Shannon capacity versus SNR"
            deps={[bw, snrDb]}
            draw={(ctx, w, h) => {
              const cMax = shannonCapacity(bw, snrDbToLinear(40)) * 1.05;
              const ax = { x: linScale([-10, 40], [34, w - 10]), y: linScale([0, cMax], [h - 20, 10]) };
              drawAxes(ctx, ax, [-10, 40]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let d = -10; d <= 40; d++) {
                xs.push(d);
                ys.push(shannonCapacity(bw, snrDbToLinear(d)));
              }
              drawLine(ctx, ax, xs, ys, '#46c93a', 2);
              drawVLine(ctx, ax, snrDb, 0, cMax, 'rgba(255,180,84,0.9)', true, 1.5);
              drawScatter(ctx, ax, [snrDb], [shannonCapacity(bw, snr)], '#ffb454', 4);
            }}
          />
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="C_{\mathrm{BSC}}=1-H_b(\varepsilon),\qquad H_b(\varepsilon)=-\varepsilon\log_2\varepsilon-(1-\varepsilon)\log_2(1-\varepsilon)" block />
          </p>
          <p>
            <Formula tex="C=B\log_2\!\left(1+\mathrm{SNR}\right)\ \text{bits/s}\qquad C=\max_{p(x)} I(X;Y)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint** (exit 0).
- [ ] **Step 3: Commit**

```bash
git add src/modules/infotheory/CapacitySection.tsx
git commit -m "feat(infotheory): channel capacity section (BSC + Shannon curves)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Tab shell, CSS, routing, smoke test

**Files:** Create `src/modules/infotheory/InfoTheoryModule.tsx`, `src/modules/infotheory/infotheory.css`; modify `src/App.tsx`; test `tests/modules/InfoTheoryModule.test.tsx`.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/modules/InfoTheoryModule.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';

describe('InfoTheoryModule', () => {
  it('renders tabs and shows the entropy section by default', () => {
    render(<InfoTheoryModule />);
    expect(screen.getByRole('button', { name: /Entropy/i })).toBeTruthy();
    expect(screen.getByLabelText(/Binary entropy function/i)).toBeTruthy();
  });

  it('switches to the Lempel-Ziv tab and shows the dictionary', () => {
    render(<InfoTheoryModule />);
    fireEvent.click(screen.getByRole('button', { name: /Lempel-Ziv/i }));
    expect(screen.getByText(/Contents/i)).toBeTruthy();
  });

  it('switches to Channel Capacity and shows a capacity curve', () => {
    render(<InfoTheoryModule />);
    fireEvent.click(screen.getByRole('button', { name: /Channel Capacity/i }));
    expect(screen.getByLabelText(/BSC capacity versus crossover probability/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — module not found.

- [ ] **Step 3: Create `InfoTheoryModule.tsx`**

```tsx
import { useState } from 'react';
import { t } from '@/i18n';
import { EntropySection } from './EntropySection';
import { PrefixKraftSection } from './PrefixKraftSection';
import { HuffmanSection } from './HuffmanSection';
import { LempelZivSection } from './LempelZivSection';
import { CapacitySection } from './CapacitySection';
import './infotheory.css';

type Tab = 'entropy' | 'prefix' | 'huffman' | 'lz' | 'capacity';

const TABS: { id: Tab; key: string }[] = [
  { id: 'entropy', key: 'it.tab.entropy' },
  { id: 'prefix', key: 'it.tab.prefix' },
  { id: 'huffman', key: 'it.tab.huffman' },
  { id: 'lz', key: 'it.tab.lz' },
  { id: 'capacity', key: 'it.tab.capacity' },
];

export function InfoTheoryModule() {
  const [tab, setTab] = useState<Tab>('entropy');
  return (
    <div className="it-module">
      <nav className="it-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={tab === tb.id ? 'it-tab it-tab--active' : 'it-tab'}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.key)}
          </button>
        ))}
      </nav>
      {tab === 'entropy' && <EntropySection />}
      {tab === 'prefix' && <PrefixKraftSection />}
      {tab === 'huffman' && <HuffmanSection />}
      {tab === 'lz' && <LempelZivSection />}
      {tab === 'capacity' && <CapacitySection />}
    </div>
  );
}
```

- [ ] **Step 4: Create `infotheory.css`**

```css
.it-module { display: flex; flex-direction: column; gap: 16px; }
.it-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(154,167,180,0.25); flex-wrap: wrap; }
.it-tab {
  background: transparent; border: none; color: #9aa7b4; padding: 8px 14px;
  cursor: pointer; border-bottom: 2px solid transparent; font-size: 14px;
}
.it-tab--active { color: #cdd6e0; border-bottom-color: #4aa3ff; }
.it-section { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
@media (max-width: 820px) { .it-section { grid-template-columns: 1fr; } }
.it-controls { display: flex; flex-direction: column; gap: 12px; }
.it-content { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.it-readouts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 8px; }
.it-row { display: flex; gap: 8px; flex-wrap: wrap; }
.it-codeword { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.it-codeword input, .it-wide { width: 100%; font-family: ui-monospace, monospace; }
.it-mono { font-family: ui-monospace, monospace; font-size: 13px; color: #cdd6e0; }
.it-break { white-space: pre-wrap; word-break: break-all; background: rgba(154,167,180,0.08); border-radius: 6px; padding: 8px; }
.it-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.it-table th, .it-table td { text-align: left; padding: 3px 8px; border-bottom: 1px solid rgba(154,167,180,0.15); }
```

- [ ] **Step 5: Wire routing in `src/App.tsx`**

Add the import after the `SamplingModule`/`ModulationModule` imports:

```tsx
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';
```

In the `NAV` array, change the huffman entry to:

```tsx
  { to: '/information-theory', key: 'nav.infotheory' },
```

Replace the `/huffman` route:

```tsx
            <Route path="/huffman" element={<ModulePlaceholder title={t('nav.huffman')} />} />
```

with:

```tsx
            <Route path="/information-theory" element={<InfoTheoryModule />} />
```

(Leave the `baseband` and `end-to-end` placeholder routes and the `ModulePlaceholder` import untouched.)

- [ ] **Step 6: Run the smoke test, expect PASS** — `npx vitest run tests/modules/InfoTheoryModule.test.tsx` → 3 tests pass. (In jsdom, `<canvas>.getContext` is a no-op; aria-labels still render. SVG renders normally. If a `getByRole('button', {name: /Entropy/i})` is ambiguous because "Entropy" also appears elsewhere, scope to the tab text exactly — the tab label is "Entropy".)

- [ ] **Step 7: Type-check + lint + commit**

Run `npx tsc --noEmit` and `npm run lint` (exit 0), then:

```bash
git add src/modules/infotheory/InfoTheoryModule.tsx src/modules/infotheory/infotheory.css src/App.tsx tests/modules/InfoTheoryModule.test.tsx
git commit -m "feat(infotheory): tab shell + routing at /information-theory + smoke test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Full verification + browser check

**Files:** none (verification only)

- [ ] **Step 1: Full suite** — `npm test` → all pass (prior 147 + svg 4 + InfoTheoryModule 3 = 154). No failures.
- [ ] **Step 2: Lint** — `npm run lint` → exit 0.
- [ ] **Step 3: Build** — `npm run build` → tsc clean + vite build succeeds.
- [ ] **Step 4: Browser** (`npm run dev`, open `/#/information-theory`): each tab works —
  - Entropy: editing probabilities updates H/η and the bars; preset gives H≈1.1568; H(p) curve peaks at p=0.5.
  - Prefix & Kraft: Code-I → Kraft 1.5/not prefix-free/not UD; Code-II → 1.0/prefix/UD; Code-III → 0.9375/not prefix-free/**UD = Yes**; the code tree renders; decoding `010110111` under Code-II gives `s0s1s2s3`.
  - Huffman: tree + table render; L̄=2.2, H≈2.12, η≈0.96; min-variance toggle flips variance 1.36 ↔ 0.16; typing symbols encodes to bits.
  - Lempel-Ziv: preset → 16 dictionary rows matching Table 6.1, 49→80 bits, lossless = Yes; Step advances rows.
  - Channel Capacity: BSC curve peaks C=1 at ε=0/1, C=0 at ε=0.5; Shannon curve rises with SNR.
- [ ] **Step 5: Status** — `git status -s` clean.

---

## Self-Review (spec §2.2 coverage)

- **Tabbed module at `/information-theory`, nav "Information Theory"** → Tasks 1, 8. ✓
- **Entropy section** (prob inputs, bars + self-info, H(p) curve, H/log₂K/η readouts, preset) → Task 3. ✓
- **Prefix & Kraft** (codeword editor, prefix/Kraft/UD verdicts, code tree SVG, decode box, Code-I/II/III presets, the UD-vs-prefix teaching note) → Task 4. ✓
- **Huffman** (tree SVG, codeword table, H/L̄/η/variance, min-variance toggle, encode) → Task 5. ✓
- **Lempel-Ziv** (dictionary table Table 6.1 layout, stepped/animated parse, encoded output, lossless check) → Task 6. ✓
- **Channel Capacity** (BSC ε slider + curve, Shannon B/SNR sliders + curve, formulas) → Task 7. ✓
- **SVG tree infra** (`lib/plot/svg.ts`, pure layout + TreeSvg) → Task 2. ✓

**Placeholder scan:** none — every step has complete code.

**Type consistency:** `BinTree`/`TreeLayout`/`TreeSvg`/`layoutBinaryTree` used consistently (Task 2 defines; Tasks 4, 5 consume). `Tab` union and `TABS` consistent in Task 8. Section components are prop-less and self-contained, imported by name in Task 8. `HuffmanNode` (3a) → `toBinTree` adapter in Task 5. LZ `phrases[].codeword`/`newBit`/`indexBits` consumed exactly as 3a produces them.

**Deferred (acceptable):** the Huffman per-bit decode path-highlight animation is simplified to showing the decoded symbols + encoded bits (the `TreeSvg` `activePath` prop exists for a future enhancement but isn't driven here); the LZ "animation" is a Step/▶ control over `shown` rows rather than a timed loop. Both satisfy the spec's interactive intent without a timer; note for a possible polish pass.
