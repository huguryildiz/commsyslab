import { Panel, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { Derived } from '../model';

interface Props {
  d: Derived;
}

export function AutocorrSection({ d }: Props) {
  const lags = Array.from(d.lags);
  const all = [...d.rEnsemble, ...d.rTime, ...d.rTheory].map(Math.abs);
  const yMax = Math.max(1e-6, ...all);
  const power = d.rEnsemble[0];

  return (
    <Panel title={t('rp.autocorr.title')}>
      <Canvas
        height={240}
        ariaLabel="autocorrelation: theory vs ensemble vs time average"
        deps={[d]}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([0, lags[lags.length - 1]], [36, w - 8]),
            y: linScale([-yMax, yMax], [h - 20, 12]),
          };
          drawAxes(ctx, ax, [0, lags[lags.length - 1]]);
          drawLine(ctx, ax, lags, Array.from(d.rTheory), CHART.dim, 2, true);
          drawLine(ctx, ax, lags, Array.from(d.rTime), CHART.green, 1.6);
          drawLine(ctx, ax, lags, Array.from(d.rEnsemble), CHART.blue, 2);
        }}
      />
      <Readout label="power P_X = R_X(0)" value={power.toFixed(3)} />
      <Formula tex="R_X(\tau)=E[X(t)\,X(t+\tau)]" />
      <TheoryBox>
        Dashed = theory, green = time average from one realization, blue = ensemble average. When
        the time and ensemble averages coincide, the process is ergodic in autocorrelation. Raise M
        and N to watch them converge.
      </TheoryBox>
    </Panel>
  );
}
