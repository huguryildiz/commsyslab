import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, logScale, drawAxes, drawLine, drawVLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { RepeaterView } from './repeater-model';

const PAD = { l: 44, r: 14, t: 14, b: 34 };
const PE_FLOOR = 1e-8;

export interface RepeaterBerPanelProps {
  view: RepeaterView;
  ebN0Db: number;
}

/**
 * Bit-error rate vs Eb/N0 for a K-hop link: regenerative (green) vs analog
 * (orange). The regenerative curve crosses below analog once errors are rare —
 * the operating regime. Scroll-zoom + drag-pan on the SNR axis.
 */
export function RepeaterBerPanel({ view, ebN0Db }: RepeaterBerPanelProps) {
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, 20, {
    minSpan: 3,
    maxSpan: 20,
    clampMin: 0,
  });
  const yDom: [number, number] = [PE_FLOOR, 1];
  return (
    <Canvas
      height={280}
      ariaLabel="Regenerative versus analog repeater BER over a K-hop link"
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
          yLabel: '$P_b$',
          domainY: yDom,
        });
        const xs = view.analogCurve.map((p) => p.ebN0Db);
        drawLine(ctx, ax, xs, view.analogCurve.map((p) => Math.max(p.pe, PE_FLOOR)), CHART.orange, 2);
        drawLine(ctx, ax, xs, view.regenCurve.map((p) => Math.max(p.pe, PE_FLOOR)), CHART.green, 2);
        drawVLine(ctx, ax, ebN0Db, PE_FLOOR, 1, alpha(CHART.pink, 0.7), true, 1);
      }}
    />
  );
}

export interface HopNoisePanelProps {
  view: RepeaterView;
}

/**
 * Per-hop accumulated noise: analog repeaters add noise every hop (the bars grow),
 * while regenerative repeaters detect and re-transmit clean each hop (flat).
 */
export function HopNoisePanel({ view }: HopNoisePanelProps) {
  const K = view.K;
  const maxA = Math.max(1, view.hops[K - 1]?.analog ?? 1);
  return (
    <Canvas
      height={220}
      ariaLabel="Accumulated noise per hop: analog grows, regenerative stays flat"
      deps={[view]}
      draw={(ctx, w, h) => {
        const yDom: [number, number] = [0, maxA * 1.1];
        const ax: Axes = {
          x: linScale([0.5, K + 0.5], [PAD.l, w - PAD.r]),
          y: linScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [0.5, K + 0.5], {
          xLabel: 'hop',
          yLabel: 'relative noise',
          domainY: yDom,
        });
        const bw = Math.max(3, ((w - PAD.l - PAD.r) / K) * 0.5);
        const y0 = ax.y(0);
        for (const hop of view.hops) {
          const px = ax.x(hop.hop);
          // analog bar (grows)
          ctx.fillStyle = alpha(CHART.orange, 0.5);
          const ay = ax.y(hop.analog);
          ctx.fillRect(px - bw, ay, bw, y0 - ay);
          // regenerative bar (flat)
          ctx.fillStyle = alpha(CHART.green, 0.7);
          const ry = ax.y(hop.regen);
          ctx.fillRect(px, ry, bw, y0 - ry);
        }
        drawText(ctx, ax, K, maxA, 'analog ↑   regen —', CHART.text, -10, -4);
      }}
    />
  );
}
