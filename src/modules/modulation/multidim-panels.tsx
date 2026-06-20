import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, logScale, drawAxes, drawLine, drawVLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { MultidimView } from './multidim-model';

const PAD = { l: 42, r: 14, t: 14, b: 34 };
const PE_FLOOR = 1e-6;

type Pt = { ebN0Db: number; pe: number };

function curveYs(curve: Pt[]): number[] {
  return curve.map((p) => Math.max(p.pe, PE_FLOOR));
}

export interface MultidimPePanelProps {
  view: MultidimView;
  ebN0Db: number;
}

/**
 * Error probability of the selected family (exact) with its union bound overlaid
 * (§8.4.2 / §9.1.2) — the bound sits at or above the exact curve. Scroll-zoom +
 * drag-pan on the SNR axis.
 */
export function MultidimPePanel({ view, ebN0Db }: MultidimPePanelProps) {
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, 14, {
    minSpan: 2,
    maxSpan: 14,
    clampMin: 0,
  });
  const yDom: [number, number] = [PE_FLOOR, 1];
  return (
    <Canvas
      height={280}
      ariaLabel="Selected family error probability with union bound overlay"
      deps={[view, ebN0Db, lo, hi]}
      onWheel={handleWheel}
      onPan={handlePan}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([lo, hi], [PAD.l, w - PAD.r]),
          y: logScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$E_b/N_0\\,(\\mathrm{dB})$',
          yLabel: '$P_e$',
          domainY: yDom,
        });
        const xs = view.exactCurve.map((p) => p.ebN0Db);
        // Union bound (dashed pink) over the exact curve (blue).
        drawLine(ctx, ax, xs, curveYs(view.unionCurve), alpha(CHART.pink, 0.9), 1.5, true);
        drawLine(ctx, ax, xs, curveYs(view.exactCurve), CHART.blue, 2);
        drawVLine(ctx, ax, ebN0Db, PE_FLOOR, 1, alpha(CHART.pink, 0.7), true, 1);
      }}
    />
  );
}

export interface SimplexGainPanelProps {
  view: MultidimView;
}

/**
 * Simplex energy-saving visual: orthogonal vs simplex Pe. The simplex curve sits
 * left of orthogonal by exactly 10·log10(M/(M−1)) dB (Eq. 9.3.8).
 */
export function SimplexGainPanel({ view }: SimplexGainPanelProps) {
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, 14, {
    minSpan: 2,
    maxSpan: 14,
    clampMin: 0,
  });
  const yDom: [number, number] = [PE_FLOOR, 1];
  return (
    <Canvas
      height={260}
      ariaLabel="Orthogonal versus simplex error probability showing the energy saving"
      deps={[view, lo, hi]}
      onWheel={handleWheel}
      onPan={handlePan}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([lo, hi], [PAD.l, w - PAD.r]),
          y: logScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$E_b/N_0\\,(\\mathrm{dB})$',
          yLabel: '$P_e$',
          domainY: yDom,
        });
        const xs = view.orthRefCurve.map((p) => p.ebN0Db);
        drawLine(ctx, ax, xs, curveYs(view.orthRefCurve), CHART.orange, 2);
        drawLine(ctx, ax, xs, curveYs(view.simplexCurve), CHART.green, 2);
        // Annotate the horizontal gap (gain) at a mid Pe level.
        const peRef = 1e-3;
        const yPx = ax.y(peRef);
        if (yPx > PAD.t && yPx < h - PAD.b) {
          drawText(
            ctx,
            { x: ax.x, y: () => yPx },
            (lo + hi) / 2,
            0,
            `${view.simplexGainDb.toFixed(2)} dB`,
            CHART.green,
            0,
            -6,
          );
        }
      }}
    />
  );
}
