import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { gaussianPdf } from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from './probShared';

const DEFAULTS = { a: 1.5, b: 1, m: 0, sigma: 1 };
const GRID = 280;

/** §5.1.4 — functions of a random variable: Y = aX + b on a Gaussian X. */
export function FunctionsSection() {
  const [a, setA] = useState(DEFAULTS.a);
  const [b, setB] = useState(DEFAULTS.b);
  const [m, setM] = useState(DEFAULTS.m);
  const [sigma, setSigma] = useState(DEFAULTS.sigma);
  const reset = () => {
    setA(DEFAULTS.a);
    setB(DEFAULTS.b);
    setM(DEFAULTS.m);
    setSigma(DEFAULTS.sigma);
  };

  const mY = a * m + b;
  const sY = Math.max(1e-3, Math.abs(a) * sigma);

  const view = useMemo(() => {
    const lo = Math.min(m - 4 * sigma, mY - 4 * sY);
    const hi = Math.max(m + 4 * sigma, mY + 4 * sY);
    const xs = Array.from({ length: GRID }, (_, i) => lo + ((hi - lo) * i) / (GRID - 1));
    const fx = xs.map((x) => gaussianPdf(x, m, sigma));
    const fy = xs.map((x) => gaussianPdf(x, mY, sY));
    const yMax = Math.max(...fx, ...fy, 1e-6) * 1.12;
    return { lo, hi, xs, fx, fy, yMax };
  }, [m, sigma, mY, sY]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([view.lo, view.hi], [PAD.l, w - PAD.r]),
      y: linScale([0, view.yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.lo, view.hi], {
      xLabel: '$x,\\,y$',
      yLabel: '$f(\\cdot)$',
      domainY: [0, view.yMax],
    });
    drawLine(ctx, ax, view.xs, view.fx, CHART.blue, 2);
    drawLine(ctx, ax, view.xs, view.fy, CHART.green, 2);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.func.controls')}>
            <Slider label={<HintText text={t('rp.func.a')} />} min={-3} max={3} step={0.1} value={a} onChange={setA} />
            <Slider label={<HintText text={t('rp.func.b')} />} min={-3} max={3} step={0.1} value={b} onChange={setB} />
            <Slider label={<HintText text={t('rp.func.m')} />} min={-2} max={2} step={0.1} value={m} onChange={setM} />
            <Slider label={<HintText text={t('rp.func.sigma')} />} min={0.3} max={2.5} step={0.1} value={sigma} onChange={setSigma} />
            <div className="rp__reset">
              <button type="button" onClick={reset}>{t('rp.gen.reset')}</button>
            </div>
          </Panel>
        </aside>

        <div className="rp__content">
          <div className="rp__readouts">
            <Metric label="$m_Y$" value={mY.toFixed(3)} />
            <Metric label="$\sigma_Y^2$" value={(sY * sY).toFixed(3)} />
          </div>

          <Panel title={t('rp.func.plot')}>
            <PlotTitle textKey="rp.func.plot" />
            <Canvas height={250} draw={draw} deps={[view]} ariaLabel="Input and output Gaussian densities of Y = aX + b" />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.func.trace.in') },
                { color: CHART.green, label: t('rp.func.trace.out') },
              ]}
            />
            <Formula tex="f_Y(y)=\sum_i \dfrac{f_X(x_i)}{|g'(x_i)|};\quad Y=aX+b,\ X\sim\mathcal{N}(m,\sigma^2)\ \Rightarrow\ Y\sim\mathcal{N}(am+b,\,a^2\sigma^2)" />
            <TheoryBox>
              <HintText text={t('rp.func.theory')} />
            </TheoryBox>
          </Panel>
        </div>
      </div>
    </div>
  );
}
