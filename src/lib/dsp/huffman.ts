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
