/* eslint-disable react-refresh/only-export-components */

export interface BinTree {
  symbol?: string;
  left?: BinTree;
  right?: BinTree;
}

export interface TreeNode {
  id: number;
  x: number;
  y: number;
  label: string;
  isLeaf: boolean;
  path: string;
}

export interface TreeEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bit: string;
  path: string;
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
