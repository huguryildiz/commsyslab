import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import type { Vec2, VqResult } from '@/lib/dsp/vq';

const PALETTE = ['#39ff85', '#ff9f45', '#7c8cff', '#ff5c8a', '#46d6c9', '#e0c84a', '#b07cff', '#7cffd4'];
const PAD = { l: 8, r: 8, t: 10, b: 10 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

/** Training points colored by their codeword assignment, with codebook ✕ markers,
 *  at iteration `step` of the LBG run. */
export function ScatterVoronoiPanel({
  data,
  result,
  step,
}: {
  data: Vec2[];
  result: VqResult;
  step: number;
}) {
  const snap = result.snapshots[Math.min(step, result.snapshots.length - 1)];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of data) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const padX = (maxX - minX) * 0.1 || 1;
  const padY = (maxY - minY) * 0.1 || 1;
  return (
    <Canvas
      height={300}
      ariaLabel="VQ codebook and Voronoi regions"
      deps={[data, result, step]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [minX - padX, maxX + padX], [minY - padY, maxY + padY]);
        drawAxes(ctx, ax, [minX - padX, maxX + padX]);
        for (let i = 0; i < data.length; i++) {
          ctx.fillStyle = PALETTE[snap.assignments[i] % PALETTE.length];
          ctx.beginPath();
          ctx.arc(ax.x(data[i][0]), ax.y(data[i][1]), 2.2, 0, 2 * Math.PI);
          ctx.fill();
        }
        for (let j = 0; j < snap.codebook.length; j++) {
          const px = ax.x(snap.codebook[j][0]);
          const py = ax.y(snap.codebook[j][1]);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#0b1020';
          ctx.beginPath();
          ctx.moveTo(px - 7, py - 7);
          ctx.lineTo(px + 7, py + 7);
          ctx.moveTo(px - 7, py + 7);
          ctx.lineTo(px + 7, py - 7);
          ctx.stroke();
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = PALETTE[j % PALETTE.length];
          ctx.beginPath();
          ctx.moveTo(px - 7, py - 7);
          ctx.lineTo(px + 7, py + 7);
          ctx.moveTo(px - 7, py + 7);
          ctx.lineTo(px + 7, py - 7);
          ctx.stroke();
        }
      }}
    />
  );
}

/** Mean distortion versus LBG iteration. */
export function DistortionPanel({ history }: { history: number[] }) {
  const xs = history.map((_, i) => i);
  const yMax = (history.length ? Math.max(...history) : 1) * 1.1 || 1;
  const xMax = Math.max(history.length - 1, 1);
  return (
    <Canvas
      height={180}
      ariaLabel="VQ distortion versus iteration"
      deps={[history]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [0, xMax], [0, yMax]);
        drawAxes(ctx, ax, [0, xMax]);
        drawLine(ctx, ax, xs, history, '#46c93a', 2);
      }}
    />
  );
}
