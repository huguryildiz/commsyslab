import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { useZoom } from '@/lib/plot/useZoom';
import { lloydMaxDesign, type SourcePdf } from '@/lib/dsp/lloydmax';

const COL = {
  level: '#46c93a', // reconstruction levels (staircase)
  boundary: 'rgba(124,140,255,0.6)', // decision boundaries
  ref: 'rgba(154,167,180,0.3)', // identity diagonal
  pdf: '#ffb454', // source density (bottom band)
};

// Room for tick labels + LaTeX axis labels.
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

/** Unit-variance source densities (mirror lloydmax.ts). */
function pdfVal(kind: SourcePdf, x: number): number {
  switch (kind) {
    case 'gaussian':
      return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
    case 'uniform': {
      const hh = Math.sqrt(3);
      return Math.abs(x) <= hh ? 1 / (2 * hh) : 0;
    }
    case 'laplacian': {
      const b = 1 / Math.SQRT2;
      return Math.exp(-Math.abs(x) / b) / (2 * b);
    }
  }
}

/** Lloyd-Max staircase Q(x): non-uniform level segments + decision boundaries,
 *  with the source pdf drawn faintly in a bottom band. */
export function LloydMaxPanel({ pdf, levels }: { pdf: SourcePdf; levels: number }) {
  const r = lloydMaxDesign(pdf, levels);
  const b = Math.max(Math.abs(r.boundaries[0]), Math.abs(r.boundaries[r.boundaries.length - 1]));
  const [xLo, xHi, onWheel, , onPan] = useZoom(-b, b, { minSpan: 0.2, maxSpan: b * 3 });
  return (
    <Canvas
      height={260}
      ariaLabel="Lloyd-Max quantizer levels over the source pdf"
      deps={[pdf, levels, xLo, xHi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [xLo, xHi], [-b, b]);
        drawAxes(ctx, ax, [xLo, xHi], { xLabel: '$x$', yLabel: '$Q(x)$' });
        drawLine(ctx, ax, [-b, b], [-b, b], COL.ref, 1); // identity reference
        for (let k = 0; k < levels; k++) {
          const x0 = r.boundaries[k];
          const x1 = r.boundaries[k + 1];
          drawLine(ctx, ax, [x0, x1], [r.levels[k], r.levels[k]], COL.level, 2.5);
          if (k > 0) drawVLine(ctx, ax, x0, -b, b, COL.boundary, true, 1);
        }
        // faint source pdf in the bottom band (its own y-scale)
        const M = 200;
        const xs = Array.from({ length: M }, (_, i) => -b + (2 * b * i) / (M - 1));
        const ys = xs.map((x) => pdfVal(pdf, x));
        const pdfMax = Math.max(...ys) || 1;
        const band: Axes = {
          x: ax.x,
          y: linScale([0, pdfMax], [h - PAD.b, h - PAD.b - 0.28 * (h - PAD.t - PAD.b)]),
        };
        drawLine(ctx, band, xs, ys, COL.pdf, 1.5);
      }}
    />
  );
}
