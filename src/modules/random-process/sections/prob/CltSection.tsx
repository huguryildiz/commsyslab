import { useMemo, useState } from 'react';
import { Panel, Select, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import {
  type CltBase,
  cltSampleMeans,
  cltBaseStats,
  gaussianPdf,
  densityHistogram,
} from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from './probShared';

const DEFAULTS = { base: 'uniform' as CltBase, n: 1 };
const TRIALS = 4000;

/** §5.1.6 — sums of random variables and the central limit theorem. */
export function CltSection() {
  const [base, setBase] = useState<CltBase>(DEFAULTS.base);
  const [n, setN] = useState(DEFAULTS.n);
  const reset = () => {
    setBase(DEFAULTS.base);
    setN(DEFAULTS.n);
  };

  const { mean, variance } = cltBaseStats(base);
  const sigmaN = Math.sqrt(variance / n);

  const view = useMemo(() => {
    const means = cltSampleMeans(99, base, n, TRIALS);
    const lo = mean - 4.2 * sigmaN;
    const hi = mean + 4.2 * sigmaN;
    const { centers, density } = densityHistogram(means, 44, lo, hi);
    const xs = Array.from({ length: 240 }, (_, i) => lo + ((hi - lo) * i) / 239);
    const gauss = xs.map((x) => gaussianPdf(x, mean, sigmaN));
    const yMax = Math.max(...density, ...gauss, 1e-6) * 1.12;
    return { lo, hi, centers, density, xs, gauss, yMax };
  }, [base, n, mean, sigmaN]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([view.lo, view.hi], [PAD.l, w - PAD.r]),
      y: linScale([0, view.yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.lo, view.hi], {
      xLabel: '$\\bar{Y}$',
      yLabel: '$f_{\\bar{Y}}$',
      domainY: [0, view.yMax],
    });
    const bw = view.centers[1] - view.centers[0];
    const half = (ax.x(bw) - ax.x(0)) / 2;
    for (let i = 0; i < view.centers.length; i++) {
      const cx = ax.x(view.centers[i]);
      ctx.fillStyle = alpha(CHART.green, 0.4);
      ctx.fillRect(cx - half, ax.y(view.density[i]), half * 2, ax.y(0) - ax.y(view.density[i]));
    }
    drawLine(ctx, ax, view.xs, view.gauss, CHART.blue, 2);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.clt.controls')}>
            <Select<CltBase>
              label={t('rp.clt.base')}
              value={base}
              onChange={setBase}
              options={[
                { value: 'uniform', label: t('rp.clt.base.uniform') },
                { value: 'bernoulli', label: t('rp.clt.base.bernoulli') },
                { value: 'exponential', label: t('rp.clt.base.exponential') },
              ]}
            />
            <Slider
              label={<HintText text={t('rp.clt.n')} />}
              min={1}
              max={50}
              step={1}
              value={n}
              onChange={setN}
            />
            <div className="rp__reset">
              <button type="button" onClick={reset}>
                {t('rp.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="rp__content">
          <div className="rp__readouts">
            <Metric label="$m$" value={mean.toFixed(3)} />
            <Metric label="$\sigma^2/n$" value={(variance / n).toFixed(4)} />
          </div>

          <Panel title={t('rp.clt.plot')}>
            <PlotTitle textKey="rp.clt.plot" />
            <Canvas
              height={260}
              draw={draw}
              deps={[view]}
              ariaLabel="Histogram of sample means converging to a Gaussian"
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('rp.clt.trace.hist'), block: true },
                { color: CHART.blue, label: t('rp.clt.trace.gauss') },
              ]}
            />
            <Formula tex="\bar{Y}=\frac1n\sum_{i=1}^{n}X_i\ \xrightarrow{\ d\ }\ \mathcal{N}\!\left(m,\,\tfrac{\sigma^2}{n}\right)" />
            <TheoryBox>
              <HintText text={t('rp.clt.theory')} />
            </TheoryBox>
          </Panel>
        </div>
      </div>
    </div>
  );
}
