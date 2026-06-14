import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawScatter } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { LinkResult } from '@/lib/sim/link';
import type { Stage } from './ChainStrip';

export function StageInspector({ stage, r }: { stage: Stage; r: LinkResult }) {
  if (stage === 'mod' || stage === 'detect') {
    const dim0 = r.rxPoints.map((p) => p[0]);
    const dim1 = r.rxPoints.map((p) => p[1] ?? 0);
    const ideal0 = r.constellation.points.map((p) => p[0]);
    const ideal1 = r.constellation.points.map((p) => p[1] ?? 0);
    const m = Math.max(1, ...dim0.map(Math.abs), ...dim1.map(Math.abs), ...ideal0.map(Math.abs), ...ideal1.map(Math.abs));
    return (
      <Canvas
        key="constellation"
        height={260}
        ariaLabel={t('e2e.inspector.mod')}
        deps={[r]}
        draw={(ctx, w, h) => {
          const ax = { x: linScale([-m, m], [8, w - 8]), y: linScale([-m, m], [h - 8, 8]) };
          drawAxes(ctx, ax, [-m, m]);
          drawScatter(ctx, ax, dim0, dim1, CHART.pink);
          drawScatter(ctx, ax, ideal0, ideal1, CHART.green);
        }}
      />
    );
  }

  if (stage === 'channel') {
    if (!r.channelTrace.enabled) return <p className="e2e-empty">{t('e2e.ctrl.bandlimited')}</p>;
    const eye = r.channelTrace.eye;
    return (
      <Canvas
        key="channel"
        height={260}
        ariaLabel={t('e2e.inspector.channel')}
        deps={[r]}
        draw={(ctx, w, h) => {
          if (eye.length === 0) return;
          const ys = eye.flatMap((tr) => tr.samples);
          const m = Math.max(1, ...ys.map(Math.abs));
          const len = eye[0].samples.length;
          const xs = eye[0].samples.map((_, i) => i);
          const ax = { x: linScale([0, len - 1], [8, w - 8]), y: linScale([-m, m], [h - 8, 8]) };
          drawAxes(ctx, ax, [0, len - 1]);
          for (const tr of eye) drawLine(ctx, ax, xs, tr.samples, CHART.blue, 1);
        }}
      />
    );
  }

  // source / sink: sampled original + quantized levels
  return (
    <Canvas
      key="signal"
      height={260}
      ariaLabel={t('e2e.inspector.source')}
      deps={[r]}
      draw={(ctx, w, h) => {
        const n = r.original.length;
        if (n === 0) return;
        const all = [...r.original, ...r.txQuantized];
        const lo = Math.min(...all);
        const hi = Math.max(...all);
        const ax = { x: linScale([0, n - 1], [8, w - 8]), y: linScale([lo, hi], [h - 8, 8]) };
        const xs = r.original.map((_, i) => i);
        drawAxes(ctx, ax, [0, n - 1]);
        drawLine(ctx, ax, xs, r.original, CHART.green, 2);
        drawLine(ctx, ax, xs, r.txQuantized, CHART.orange, 1, true);
      }}
    />
  );
}
