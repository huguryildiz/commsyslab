import { useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { binaryChannelBayes } from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from './probShared';
import { FormulaCards, FormulaCard, CardFormula } from '../../cards';

const DEFAULTS = { p1: 0.5, eps0: 0.1, eps1: 0.1 };

/** §5.1.1–5.1.2 — conditional probability & Bayes' rule on a binary channel. */
export function BayesSection() {
  const [p1, setP1] = useState(DEFAULTS.p1);
  const [eps0, setEps0] = useState(DEFAULTS.eps0);
  const [eps1, setEps1] = useState(DEFAULTS.eps1);
  const reset = () => {
    setP1(DEFAULTS.p1);
    setEps0(DEFAULTS.eps0);
    setEps1(DEFAULTS.eps1);
  };

  const r = binaryChannelBayes({ p1, eps0, eps1 });

  // Four posterior bars: two groups (Y=1, Y=0), each split by X (1 = green, 0 = blue).
  const bars = [
    { x: 0.6, v: r.postX1Y1, color: CHART.green, top: 'X=1' },
    { x: 1.4, v: r.postX0Y1, color: CHART.blue, top: 'X=0' },
    { x: 2.6, v: r.postX1Y0, color: CHART.green, top: 'X=1' },
    { x: 3.4, v: r.postX0Y0, color: CHART.blue, top: 'X=0' },
  ];

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([0, 4], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.05], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [0, 4], {
      yLabel: '$P(X\\mid Y)$',
      domainY: [0, 1.05],
      tickLabels: false,
      xTicks: [],
    });
    const y0 = ax.y(0);
    for (const b of bars) {
      const cx = ax.x(b.x);
      const half = (ax.x(0.8) - ax.x(0)) / 2;
      ctx.fillStyle = alpha(b.color, 0.55);
      ctx.fillRect(cx - half, ax.y(b.v), half * 2, y0 - ax.y(b.v));
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - half, ax.y(b.v), half * 2, y0 - ax.y(b.v));
      ctx.fillStyle = CHART.dim;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.v.toFixed(3), cx, ax.y(b.v) - 6);
      ctx.fillText(b.top, cx, y0 + 14);
    }
    // Group separators / labels.
    ctx.fillStyle = CHART.dim;
    ctx.font = '12px ui-sans-serif, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Y = 1', ax.x(1), y0 + 30);
    ctx.fillText('Y = 0', ax.x(3), y0 + 30);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.bayes.controls')}>
            <Slider
              label={<HintText text={t('rp.bayes.prior')} />}
              min={0.01}
              max={0.99}
              step={0.01}
              value={p1}
              onChange={setP1}
            />
            <Slider
              label={<HintText text={t('rp.bayes.eps0')} />}
              min={0}
              max={0.5}
              step={0.01}
              value={eps0}
              onChange={setEps0}
            />
            <Slider
              label={<HintText text={t('rp.bayes.eps1')} />}
              min={0}
              max={0.5}
              step={0.01}
              value={eps1}
              onChange={setEps1}
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
            <Metric label={t('rp.bayes.py1')} value={r.pY1.toFixed(3)} />
            <Metric label={t('rp.bayes.py0')} value={r.pY0.toFixed(3)} />
            <Metric label={t('rp.bayes.postX1Y1')} value={r.postX1Y1.toFixed(3)} />
            <Metric label={t('rp.bayes.postX0Y0')} value={r.postX0Y0.toFixed(3)} />
          </div>

          <Panel title={<HintText text={t('rp.bayes.plot')} />}>
            <PlotTitle textKey="rp.bayes.plot" />
            <Canvas
              height={260}
              draw={draw}
              deps={[p1, eps0, eps1]}
              ariaLabel="Posterior probabilities of X given the received symbol Y"
            />
            <Legend
              entries={[
                { color: CHART.green, label: '$X=1$', block: true },
                { color: CHART.blue, label: '$X=0$', block: true },
              ]}
            />
            <Formula tex="P(E_1\mid E_2)=\dfrac{P(E_1\cap E_2)}{P(E_2)},\quad P(X_i\mid Y)=\dfrac{P(X_i)\,P(Y\mid X_i)}{\sum_j P(X_j)\,P(Y\mid X_j)}" />
          </Panel>

          {/* Book formulas — §5.1.1 Conditional probability & §5.1.2 Bayes's rule */}
          <FormulaCards>
            <FormulaCard title={<>Conditional probability (§5.1.1)</>} accent="green">
              <p>
                The probability of event <Formula tex="E_1" /> given that <Formula tex="E_2" /> has
                occurred, defined for <Formula tex="P(E_2)>0" />:
              </p>
              <CardFormula tex="P(E_1\mid E_2)=\frac{P(E_1\cap E_2)}{P(E_2)}" />
              <p>
                The events are <strong>independent</strong> when conditioning on one does not change
                the other:
              </p>
              <CardFormula tex="P(E_1\cap E_2)=P(E_1)\,P(E_2)" />
            </FormulaCard>

            <FormulaCard title={<>Total probability (§5.1.1)</>} accent="orange">
              <p>
                For a partition <Formula tex="\{F_i\}" /> of the sample space (mutually exclusive,
                exhaustive), any event <Formula tex="E" /> is reached through one of the{' '}
                <Formula tex="F_i" />:
              </p>
              <CardFormula tex="P(E)=\sum_{i} P(E\mid F_i)\,P(F_i)" />
            </FormulaCard>

            <FormulaCard title={<>Bayes's rule (§5.1.2)</>} accent="blue">
              <p>
                Inverts the channel — recovers the posterior probability of the input{' '}
                <Formula tex="X_i" /> from the observed output <Formula tex="Y" />:
              </p>
              <CardFormula tex="P(X_i\mid Y)=\frac{P(X_i)\,P(Y\mid X_i)}{\sum_{j} P(X_j)\,P(Y\mid X_j)}" />
              <p>
                The denominator is the total probability of <Formula tex="Y" />; here it normalizes
                the binary-channel posteriors plotted above.
              </p>
            </FormulaCard>
          </FormulaCards>
        </div>
      </div>
    </div>
  );
}
