import { describe, it, expect } from 'vitest';
import { layoutBinaryTree, type BinTree } from '@/lib/plot/svg';

const TREE: BinTree = {
  left: { symbol: 'a' },
  right: { left: { symbol: 'b' }, right: { symbol: 'c' } },
};

describe('layoutBinaryTree', () => {
  it('places every node and one edge per parent-child link', () => {
    const l = layoutBinaryTree(TREE);
    expect(l.nodes).toHaveLength(5);
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
