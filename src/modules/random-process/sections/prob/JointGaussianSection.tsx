import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawScatter, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { correlatedSamples, covarianceEllipse } from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric } from './probShared';

const DEFAULTS = { rho: 0.6, count: 1200 };
const LIM = 3.6;

/** §5.1.5 — jointly Gaussian variables and the correlation coefficient ρ. */
export function JointGaussianSection() {
  const [rho, setRho] = useState(DEFAULTS.rho);
  const [count, setCount] = useState(DEFAULTS.count);
  const reset = () => {
    setRho(DEFAULTS.rho);
    setCount(DEFAULTS.count);
  };

  const view = useMemo(() => {
    const { xs, ys } = correlatedSamples(20, rho, count);
    const e1 = covarianceEllipse(0, 0, 1, 1, rho, 1);
    const e2 = covarianceEllipse(0, 0, 1, 1, rho, 2);
    return { xs, ys, e1, e2 };
  }, [rho, count]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const size = Math.min(w, 360);
    const ax: Axes = {
      x: linScale([-LIM, LIM], [PAD.l, PAD.l + (size - PAD.l - PAD.r)]),
      y: linScale([-LIM, LIM], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-LIM, LIM], {
      xLabel: '$X$',
      yLabel: '$Y$',
      domainY: [-LIM, LIM],
    });
    drawScatter(ctx, ax, view.xs, view.ys, alpha(CHART.green, 0.5), 1.6);
    drawLine(ctx, ax, view.e1.xs, view.e1.ys, CHART.orange, 2);
    drawLine(ctx, ax, view.e2.xs, view.e2.ys, alpha(CHART.orange, 0.6), 1.5, true);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.joint.controls')}>
            <Slider
              label={<HintText text={t('rp.joint.rho')} />}
              min={-0.95}
              max={0.95}
              step={0.05}
              value={rho}
              onChange={setRho}
            />
            <Slider
              label={<HintText text={t('rp.rv.samples')} />}
              min={300}
              max={3000}
              step={100}
              value={count}
              onChange={setCount}
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
            <Metric label={t('rp.joint.rho')} value={rho.toFixed(2)} />
            <Metric label={t('rp.joint.cov')} value={rho.toFixed(2)} />
          </div>

          <Panel title={t('rp.joint.plot')}>
            <PlotTitle textKey="rp.joint.plot" />
            <Canvas
              height={360}
              draw={draw}
              deps={[view]}
              ariaLabel="Scatter of jointly Gaussian samples with covariance ellipses"
            />
            <Formula tex="\rho_{X,Y}=\dfrac{\operatorname{cov}(X,Y)}{\sigma_X\sigma_Y},\quad |\rho_{X,Y}|\le 1" />
            <TheoryBox>
              <HintText text={t('rp.joint.theory')} />
            </TheoryBox>
          </Panel>
        </div>
      </div>
    </div>
  );
}
