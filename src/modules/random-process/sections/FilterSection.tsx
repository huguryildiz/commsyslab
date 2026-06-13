import { useMemo } from 'react';
import { Panel, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { generateEnsemble } from '@/lib/dsp/random';
import type { Derived, ProcessParams } from '../model';

interface Props {
  params: ProcessParams;
  d: Derived;
}

/** Histogram bins (counts) over [-lim, lim]. */
function histogram(values: number[], bins: number, lim: number): number[] {
  const h = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.floor(((v + lim) / (2 * lim)) * bins);
    if (idx >= 0 && idx < bins) h[idx]++;
  }
  return h;
}

export function FilterSection({ params, d }: Props) {
  const freqs = Array.from(d.freqs);
  const magSq = Array.from(d.filterMag);

  // Output amplitude distribution from a colored realization (always Gaussian for filtered noise).
  const hist = useMemo(() => {
    const colored = generateEnsemble({ ...params, kind: 'colored' });
    const flat = colored.slice(0, 20).flatMap((x) => Array.from(x));
    const lim = Math.max(0.1, ...flat.map(Math.abs));
    const bins = 41;
    const counts = histogram(flat, bins, lim);
    const cmax = Math.max(1, ...counts);
    return counts.map((c) => c / cmax);
  }, [params]);

  return (
    <Panel title={t('rp.filter.title')}>
      <Canvas
        height={180}
        ariaLabel="filter magnitude squared response"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, freqs[freqs.length - 1]], [36, w - 8]),
            y: linScale([0, 1.1], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [0, freqs[freqs.length - 1]]);
          drawLine(ctx, ax, freqs, magSq, CHART.orange, 2);
        }}
      />
      <Canvas
        height={150}
        ariaLabel="output amplitude histogram (Gaussian)"
        deps={[hist]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, hist.length - 1], [36, w - 8]),
            y: linScale([0, 1.1], [h - 16, 10]),
          };
          for (let i = 0; i < hist.length; i++) {
            const px = ax.x(i);
            ctx.fillStyle = alpha(CHART.green, 0.5);
            ctx.fillRect(px - 3, ax.y(hist[i]), 6, ax.y(0) - ax.y(hist[i]));
          }
        }}
      />
      <Formula tex="S_Y(f)=|H(f)|^2\,S_X(f)" />
      <TheoryBox>
        An LTI filter shapes the spectrum by |H(f)|². Filtering Gaussian white noise yields a colored
        but still Gaussian process (Theorem 4.4.2) — the amplitude histogram stays bell-shaped.
      </TheoryBox>
    </Panel>
  );
}
