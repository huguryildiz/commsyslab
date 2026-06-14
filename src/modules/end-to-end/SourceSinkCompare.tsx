import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { Readout } from '@/components';
import { t } from '@/i18n';
import type { LinkResult } from '@/lib/sim/link';

export function SourceSinkCompare({ r }: { r: LinkResult }) {
  const berPct = (r.metrics.ber * 100).toFixed(2);
  const sqnr = Number.isFinite(r.metrics.sqnrDb) ? r.metrics.sqnrDb.toFixed(1) : '∞';
  return (
    <div className="e2e-compare">
      <div className="e2e-metrics">
        <Readout label={t('e2e.metric.ber')} value={berPct} unit="%" />
        <Readout label={t('e2e.metric.sqnr')} value={sqnr} unit="dB" />
        <Readout label={t('e2e.metric.rate')} value={String(r.metrics.bitsPerSymbol)} />
      </div>
      <Canvas
        height={180}
        ariaLabel={t('e2e.compare.title')}
        deps={[r]}
        draw={(ctx, w, h) => {
          const n = r.original.length;
          if (n === 0) return;
          const all = [...r.original, ...r.recovered];
          const lo = Math.min(...all);
          const hi = Math.max(...all);
          const ax = { x: linScale([0, n - 1], [8, w - 8]), y: linScale([lo, hi], [h - 8, 8]) };
          const xs = r.original.map((_, i) => i);
          drawAxes(ctx, ax, [0, n - 1]);
          drawLine(ctx, ax, xs, r.original, CHART.green, 2);
          drawLine(ctx, ax, xs.slice(0, r.recovered.length), r.recovered, CHART.blue, 2, true);
        }}
      />
    </div>
  );
}
