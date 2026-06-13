# DigiCommLab Phase 3 — Information Theory Module (CH10 + book extensions) Design

**Status:** Approved scope (2026-06-13). Supersedes the narrower "Huffman & Entropy" item (§6.4) of the master design spec `2026-06-13-digicommlab-design.md`.

## 1. Purpose

A single interactive **Information Theory** module covering the EE413 CH10 syllabus plus two book-grounded extensions the instructor requested:

- **CH10 slides (EE413-CH10.pdf, 22 pp):** self-information, entropy & its bounds, the binary-entropy curve, source extension `H(Sⁿ)=nH(S)`, the source-coding theorem (`L̄ ≥ H(S)`, efficiency `η=H(S)/L̄`), prefix codes, unique decodability (Code-I/II/III), the Kraft inequality, and Huffman coding (incl. minimum-variance Huffman and codeword-length variance).
- **Book extensions (Proakis & Salehi, "Communication Systems Engineering"):**
  - **Lempel-Ziv (LZ78)** — §6.3.2, the universal variable-to-fixed dictionary algorithm, reproducing the book's Table 6.1 worked example.
  - **Channel capacity** — Ch. 9.2: the BSC capacity `C = 1 − H_b(ε)` (Fig. 9.7) and the Gaussian/Shannon capacity `C = B·log₂(1+SNR)`; the noisy-channel-coding theorem `C = max_{p(x)} I(X;Y)`.

**References (git-ignored, instructor's private PDFs in `slides/`):** `EE413-CH10.pdf` pp. 1–22; `Book.pdf` §6.1–6.3 (pp. ~268–282) and §9.1–9.2 (pp. ~576–584).

## 2. Architecture

Mirrors the established three-layer pattern (`sampling`, `modulation`): pure unit-tested DSP ↔ Canvas/SVG rendering ↔ a per-section view. Built in **two passes** like Phase 2:

- **Phase 3a — pure DSP** (`src/lib/dsp/`): five files, each unit-tested against the exact slide/book numeric examples. No UI.
- **Phase 3b — UI** (`src/modules/infotheory/`): one tabbed module mounted at `/information-theory`, consuming the 3a APIs.

### 2.1 Phase 3a — DSP layer

All functions pure; `log₂` via existing `src/lib/dsp/math.ts` (`log2`/`linspace`) — reuse, do not redefine.

**`entropy.ts`**
```ts
selfInfo(p: number): number                 // −log2(p); selfInfo(0)=0 by convention
entropy(probs: number[]): number            // −Σ p·log2 p (skip p=0 terms)
maxEntropy(K: number): number               // log2(K)
binaryEntropy(p: number): number            // H_b(p) = −p log2 p −(1−p)log2(1−p); 0 at p∈{0,1}
extendedEntropy(probs: number[], n: number): number   // n·entropy(probs)
```
Verification: `entropy([0.7,0.2,0.1]) ≈ 1.1568`; `binaryEntropy(0.5)=1`, `binaryEntropy(0)=binaryEntropy(1)=0`; `extendedEntropy([0.7,0.2,0.1],2) ≈ 2.3136`; `maxEntropy(4)=2`.

**`codes.ts`** (prefix / source coding)
```ts
kraftSum(lengths: number[]): number                 // Σ 2^(−l)
isPrefixFree(codewords: string[]): boolean          // no codeword is a prefix of another
avgLength(probs: number[], lengths: number[]): number   // L̄ = Σ p·l
efficiency(H: number, Lbar: number): number         // η = H / L̄
isUniquelyDecodable(codewords: string[]): boolean   // Sardinas–Patterson
decodePrefix(bits: string, codeToSymbol: Record<string,string>): string | null  // null on undecodable tail
```
Verification (slide Code-I/II/III, lengths {1,1,2,2}/{1,2,3,3}/{1,2,3,4}):
- Code-I `{0,1,00,11}`: `kraftSum=1.5`, `isPrefixFree=false`, `isUniquelyDecodable=false`.
- Code-II `{0,10,110,111}`: `kraftSum=1.0`, `isPrefixFree=true`, `isUniquelyDecodable=true`.
- Code-III `{0,01,011,0111}`: `kraftSum=0.9375`, `isPrefixFree=false`, **`isUniquelyDecodable=true`** (Sardinas–Patterson dangling suffixes `{1,11,111}`, none a codeword → UD, but *not* instantaneous). **Slide-discrepancy note:** EE413-CH10 slide 14 labels Code-III "Not uniquely decodable", but that is because the demo stream `1011111000` starts with `1` and no Code-III codeword starts with `1` — i.e., that stream is not a valid Code-III encoding at all. The code itself is uniquely decodable but non-prefix; the **Prefix & Kraft** UI surfaces exactly this distinction (UD ✓, prefix ✗, with the "invalid stream" explanation for `1011111000`). This is a deliberate, instructor-acknowledged correction.

**`huffman.ts`**
```ts
interface HuffmanNode { symbol?: string; prob: number; left?: HuffmanNode; right?: HuffmanNode; }
interface HuffmanResult {
  root: HuffmanNode;
  codes: Record<string,string>;     // symbol → codeword (0=left, 1=right)
  lengths: Record<string,number>;
  Lbar: number; H: number; efficiency: number; variance: number;   // σ² = Σ p(l−L̄)²
}
buildHuffman(symbols: string[], probs: number[], opts?: { minVariance?: boolean }): HuffmanResult
huffmanEncode(text: string, codes: Record<string,string>): string
huffmanDecode(bits: string, root: HuffmanNode): string
```
Tie-breaking: combine the two lowest-probability nodes; when the combined node's probability ties with existing nodes, the **default** places it **as low as possible** (reproduces the slide's second code `{1,01,000,0010,0011}`, lengths {1,2,3,4,4}, variance `1.36`); **`minVariance:true`** places it **as high as possible** (the slide's minimum-variance code `{00,10,11,010,011}`, lengths {2,2,2,3,3}, variance `0.16`) — matching the slide note "minimum-variance Huffman is obtained by moving the combined symbol as high as possible." Both give `L̄=2.2`.
Verification (5-symbol slide, p={0.4,0.2,0.2,0.1,0.1}): `Lbar=2.2`, `H≈2.12`, `efficiency≈0.96`; default `variance≈1.36`, min-variance `variance≈0.16`; `huffmanDecode(huffmanEncode(t,codes),root)===t` round-trips.

**`lz78.ts`** (Lempel-Ziv, book §6.3.2)
```ts
interface LzPhrase { location: number; contents: string; prefixIndex: number; newBit: string; codeword: string; }
interface LzResult { phrases: LzPhrase[]; indexBits: number; encoded: string; inputLength: number; encodedLength: number; }
lzParse(bits: string): LzResult        // parse → dictionary (Table 6.1), indexBits = ceil(log2(numPhrases))
lzDecode(result: LzResult): string     // reconstruct the original bit string
```
Codeword = `indexBits`-wide binary of `prefixIndex` (0 = empty prefix) concatenated with `newBit`. Verification (book 49-bit input `0100001100001010000010100000110000010100001001001`): `phrases.length===16`, `indexBits===4`, contents = `["0","1","00","001","10","000","101","0000","01","010","00001","100","0001","0100","0010","01001"]`, the 16 codewords equal Table 6.1 (`00000, 00001, 00010, 00111, 00100, 00110, 01011, 01100, 00011, 10010, 10001, 01010, 01101, 10100, 01000, 11101`), `encodedLength===80`; `lzDecode(lzParse(x))===x`.

**`capacity.ts`** (book Ch. 9.2)
```ts
bscCapacity(eps: number): number                 // 1 − binaryEntropy(eps)
shannonCapacity(bandwidthHz: number, snrLinear: number): number   // B·log2(1+SNR)
gaussianCapacity(P: number, Pn: number): number  // 0.5·log2(1+P/Pn) bits/use
snrDbToLinear(db: number): number                // reuse if present; else 10^(db/10)
```
Verification: `bscCapacity(0)=1`, `bscCapacity(0.5)=0`, `bscCapacity(1)=1`; `shannonCapacity(1, 1)=1` (B=1, SNR=1 → log₂2); monotonic increase in SNR.

### 2.2 Phase 3b — UI module

`src/modules/infotheory/` with `InfoTheoryModule.tsx` (a tab shell holding the active-section state), one component per section, `infotheory.css`, and a small `model.ts` only where a section needs a pure view-builder (Huffman tree layout, LZ table). Tabs across the top: **Entropy · Prefix & Kraft · Huffman · Lempel-Ziv · Channel Capacity**.

New shared infra: **`src/lib/plot/svg.ts`** — pure helpers returning SVG element data (node/edge positions, labels) plus thin React wrappers for: a binary code tree (Huffman + prefix-code), and a generic table renderer is not needed (use HTML tables for LZ/codeword tables). SVG is chosen for the trees (crisp text, structured node-link) per master-spec decision D3; Canvas remains for the curves (entropy H(p), BSC/Shannon capacity, probability bar charts) reusing `lib/plot/draw.ts`.

**Section content:**

1. **Entropy** — K-symbol probability inputs (add/remove symbols; values normalized with the running sum shown), live probability **bar chart** (Canvas) + self-information per symbol, readouts `H(S)`, `log₂K`, `η_max=H/log₂K`; a **binary-entropy curve** `H(p)` (Canvas, marker at current p for a 2-symbol case). Preset: `{0.7,0.2,0.1}`.
2. **Prefix & Kraft** — editable table (symbol · probability · codeword); live readouts: prefix-free?, Kraft sum (with ≤1 verdict), uniquely-decodable?, `L̄`, `η`; the **code tree (SVG)** with 0/1 edge labels; a decode-a-bitstream box (enter bits → decoded symbols or "undecodable"). Presets: Code-I/II/III + the slide's `1011111000` demo.
3. **Huffman** — input as symbols+probabilities **or** derived from typed text (letter frequencies); **step-by-step combine animation** and the final **tree (SVG, 0/1 edges, leaves=symbols)**; codeword table (symbol · p · codeword · length); readouts `H`, `L̄`, `η`, variance; **min-variance toggle**; live **encode** a message + **decode** by walking the tree (highlight the path bit-by-bit — prefix property made visible); compression ratio vs fixed-length `⌈log₂K⌉`. Preset: 5-symbol slide example.
4. **Lempel-Ziv (LZ78)** — binary input (default = book's 49-bit sequence); **animated parsing** into phrases; the **dictionary table** in Table 6.1 layout (location · contents · codeword); concatenated encoded output with `input/encoded` length readout and the asymptotic-compression note; **decode** back to verify losslessness.
5. **Channel Capacity** — **BSC:** ε slider, a small BSC crossover diagram (SVG), readouts `H_b(ε)` and `C=1−H_b(ε)`, the capacity curve over ε∈[0,1] (Canvas, Fig. 9.7, marker at current ε). **Gaussian/Shannon:** bandwidth `B` and `SNR (dB)` sliders, readout `C=B·log₂(1+SNR)`, capacity-vs-SNR curve. A one-line tie-in to source coding (reliable transmission possible iff source rate < C).

### 2.3 Routing / i18n

- `App.tsx`: replace the `/huffman` placeholder route with `/information-theory → <InfoTheoryModule/>`; update the `NAV` entry (`to:'/information-theory'`, label key `nav.infotheory`). Keep other placeholder routes.
- `src/i18n/en.ts`: add `nav.infotheory` ("Information Theory") and an `infotheory.*` block for all section labels, tab names, readouts, presets, and theory strings. Remove/repoint the now-unused `nav.huffman` only if nothing else references it (otherwise leave it).

## 3. Data flow

Each section is self-contained: section state (probabilities / codewords / bit string / ε,B,SNR) → pure DSP call(s) in a `useMemo` → readouts + Canvas/SVG render. Animations (Huffman combine, LZ parse) use the existing `useSimulationLoop` or a simple stepped index in component state; no cross-section shared state. The tab shell holds only the active-tab id.

## 4. Testing

- **3a:** one test file per DSP module asserting every numeric example above (the crux — these are slide/book-exact, not approximate). Round-trip tests for Huffman and LZ decode.
- **3b:** render smoke tests per section (mount, switch tabs, a preset produces expected readouts text), following `ModulationModule.test.tsx` (jsdom `getContext` is a no-op; aria-labels still render). SVG trees assert node/leaf counts via the pure layout function.

## 5. Build order (plans authored per pass)

1. **3a plan** — `math` log2 check → `entropy.ts` → `codes.ts` → `huffman.ts` → `lz78.ts` → `capacity.ts`, each TDD against its verification table; commit per file.
2. **3b plan** — i18n → `lib/plot/svg.ts` → per-section components (Entropy, Prefix&Kraft, Huffman, Lempel-Ziv, Capacity) → `InfoTheoryModule` tab shell + routing → smoke tests → full verify.

Each pass = its own plan + subagent-driven execution + review, ending in a single PR/merge to `master` (Vercel auto-deploys), matching the Phase 2 workflow.

## 6. Out of scope (YAGNI)

Joint/conditional entropy & mutual-information calculators, rate-distortion theory, arithmetic coding, LZ77/LZW variants beyond the book's LZ78, dictionary-purging/overflow handling (note it in the LZ theory text only), and continuous-channel coding theory beyond the two capacity formulas. The end-to-end capstone (Phase 5) will reuse Huffman from here.
