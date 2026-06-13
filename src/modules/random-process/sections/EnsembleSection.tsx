import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { Derived, ProcessParams } from '../model';

interface Props {
  params: ProcessParams;
  d: Derived;
}

export function EnsembleSection({ params, d }: Props) {
  const N = params.N;
  const ts = Array.from({ length: N }, (_, n) => n / params.fs);
  const yMax = Math.max(1e-6, ...d.ensemble.slice(0, 30).flatMap((x) => Array.from(x).map(Math.abs)));

  const meanAvg = d.mean.reduce((s, v) => s + v, 0) / d.mean.length;

  return (
    <Panel title={t('rp.ensemble.title')}>
      <Canvas
        height={260}
        ariaLabel="ensemble of sample functions with ensemble mean"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, ts[N - 1]], [36, w - 8]),
            y: linScale([-yMax, yMax], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [0, ts[N - 1]]);
          for (let m = 0; m < Math.min(20, d.ensemble.length); m++) {
            drawLine(ctx, ax, ts, Array.from(d.ensemble[m]), alpha(CHART.green, 0.18), 1);
          }
          drawLine(ctx, ax, ts, Array.from(d.ensemble[0]), CHART.green, 1.6);
          drawLine(ctx, ax, ts, Array.from(d.mean), CHART.orange, 2.2);
        }}
      />
      <Readout label="ensemble mean m̂_X" value={meanAvg.toFixed(3)} />
      <Formula tex="m_X(t)=E[X(t)],\quad R_X(t_1,t_2)=E[X(t_1)X(t_2)]" />
      <TheoryBox>
        A random process is an <em>ensemble</em> of sample functions. The mean is an average down
        the ensemble at each instant t; for a stationary process it does not depend on t.
      </TheoryBox>
    </Panel>
  );
}
