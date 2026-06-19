import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { gaussianPdf } from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from './probShared';
import { FormulaCards, FormulaCard, CardFormula } from '../../cards';

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
          <Panel title={<HintText text={t('rp.func.controls')} />}>
            <Slider
              label={<HintText text={t('rp.func.a')} />}
              min={-3}
              max={3}
              step={0.1}
              value={a}
              onChange={setA}
            />
            <Slider
              label={<HintText text={t('rp.func.b')} />}
              min={-3}
              max={3}
              step={0.1}
              value={b}
              onChange={setB}
            />
            <Slider
              label={<HintText text={t('rp.func.m')} />}
              min={-2}
              max={2}
              step={0.1}
              value={m}
              onChange={setM}
            />
            <Slider
              label={<HintText text={t('rp.func.sigma')} />}
              min={0.3}
              max={2.5}
              step={0.1}
              value={sigma}
              onChange={setSigma}
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
            <Metric label="$m_Y$" value={mY.toFixed(3)} />
            <Metric label="$\sigma_Y^2$" value={(sY * sY).toFixed(3)} />
          </div>

          <Panel title={<HintText text={t('rp.func.plot')} />}>
            <PlotTitle textKey="rp.func.plot" />
            <Canvas
              height={250}
              draw={draw}
              deps={[view]}
              ariaLabel="Input and output Gaussian densities of Y = aX + b"
            />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.func.trace.in') },
                { color: CHART.green, label: t('rp.func.trace.out') },
              ]}
            />
            <Formula tex="f_Y(y)=\sum_i \dfrac{f_X(x_i)}{|g'(x_i)|};\quad Y=aX+b,\ X\sim\mathcal{N}(m,\sigma^2)\ \Rightarrow\ Y\sim\mathcal{N}(am+b,\,a^2\sigma^2)" />
          </Panel>

          {/* Book formulas — §5.1.4 Functions of a random variable */}
          <FormulaCards>
            <FormulaCard title={<>Function of a random variable (§5.1.4)</>} accent="green">
              <p>
                For <Formula tex="Y=g(X)" />, sum the input density over every real root{' '}
                <Formula tex="x_i" /> of <Formula tex="y=g(x)" />, weighting by the local slope:
              </p>
              <CardFormula tex="f_Y(y)=\sum_i \frac{f_X(x_i)}{|g'(x_i)|}" />
              <p>
                For the monotone linear map <Formula tex="g(x)=ax+b" /> there is a single root and
                this reduces to a scaled, shifted copy:
              </p>
              <CardFormula tex="f_Y(y)=\frac{1}{|a|}\,f_X\!\Big(\frac{y-b}{a}\Big)" />
            </FormulaCard>

            <FormulaCard title={<>Expectation (§5.1.4)</>} accent="orange">
              <p>
                The mean (expected value) and, more generally, the expectation of any function are
                density-weighted averages:
              </p>
              <CardFormula tex="E[X]=\int_{-\infty}^{\infty} x\,f_X(x)\,dx" />
              <CardFormula tex="E[g(X)]=\int_{-\infty}^{\infty} g(x)\,f_X(x)\,dx" />
            </FormulaCard>

            <FormulaCard title={<>Linear transform &amp; variance (§5.1.4)</>} accent="blue">
              <p>
                The variance measures spread; for a Gaussian input a linear map stays Gaussian and
                rescales the moments:
              </p>
              <CardFormula tex="\sigma_X^2=E\big[(X-m)^2\big]=E[X^2]-m^2" />
              <CardFormula tex="Y=aX+b\ \Rightarrow\ m_Y=am+b,\quad \sigma_Y^2=a^2\sigma_X^2" />
            </FormulaCard>
          </FormulaCards>
        </div>
      </div>
    </div>
  );
}
