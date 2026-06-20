import { useMemo, useState } from 'react';
import { Panel, Slider, Readout, Formula, TheoryBox, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { entropy, maxEntropy, selfInfo, binaryEntropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

const PAD = { l: 46, r: 16, t: 16, b: 38 };

export function EntropySection() {
  const [probs, setProbs] = useState<number[]>([0.7, 0.2, 0.1]);
  const [resetKey, setResetKey] = useState(0);

  const norm = useMemo(() => {
    const sum = probs.reduce((s, p) => s + Math.max(0, p), 0) || 1;
    return probs.map((p) => Math.max(0, p) / sum);
  }, [probs]);

  const H = entropy(norm);
  const K = probs.length;
  const max = maxEntropy(K);

  const setAt = (i: number, v: number) => setProbs((ps) => ps.map((p, j) => (j === i ? v : p)));
  const add = () => setProbs((ps) => [...ps, 0.1]);
  const remove = () => setProbs((ps) => (ps.length > 2 ? ps.slice(0, -1) : ps));
  const reset = () => {
    setProbs([0.7, 0.2, 0.1]);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="it-controls">
        <Panel title={t('it.entropy.symbols')}>
          {probs.map((p, i) => (
            <Slider
              key={i}
              label={`p${i}`}
              value={p}
              min={0}
              max={1}
              step={0.05}
              precision={2}
              onChange={(v) => setAt(i, v)}
            />
          ))}
          <div className="it-row">
            <button type="button" onClick={add}>
              {t('it.entropy.addSymbol')}
            </button>
            <button type="button" onClick={remove} disabled={probs.length <= 2}>
              {t('it.entropy.removeSymbol')}
            </button>
          </div>
          <button type="button" onClick={reset}>
            {t('it.entropy.preset')}
          </button>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.entropy.H')} value={H.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.max')} value={max.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.eta')} value={max > 0 ? (H / max).toFixed(3) : '—'} />
          <Readout
            label={t('it.entropy.sum')}
            value={probs.reduce((s, p) => s + p, 0).toFixed(2)}
          />
        </div>

        <EntropyPlots key={resetKey} norm={norm} />

        <div className="info-cards">
          <InfoCard title={t('it.entropy.card.selfinfo')} accent="green">
            <p>{t('it.entropy.card.selfinfoBody')}</p>
            <Formula tex="I(s)=-\log_2 p\ \ (\mathrm{bits})" block />
          </InfoCard>
          <InfoCard title={t('it.entropy.card.entropy')} accent="green">
            <p>{t('it.entropy.card.entropyBody')}</p>
            <Formula tex="H(S)=-\sum_k p_k\log_2 p_k" block />
          </InfoCard>
          <InfoCard title={t('it.entropy.card.max')} accent="orange">
            <p>{t('it.entropy.card.maxBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.entropy.card.eff')} accent="blue">
            <p>{t('it.entropy.card.effBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.entropy.card.ext')} accent="green">
            <p>{t('it.entropy.card.extBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('it.theory.title')}>
          <Formula tex="H(S)=-\sum_{k} p_k\log_2 p_k,\qquad 0\le H(S)\le \log_2 K" block />
          <Formula tex="I(s_k)=-\log_2 p_k\ \text{(bits)}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Probability/self-info bars + binary-entropy curve. Owns useZoom (remounted via resetKey). */
function EntropyPlots({ norm }: { norm: number[] }) {
  const n = norm.length;
  const [zlo, zhi, onWheel, , onPan] = useZoom(0, 1, {
    minSpan: 0.1,
    maxSpan: 1,
    clampMin: 0,
    clampMax: 1,
  });

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const p = i / 200;
    xs.push(p);
    ys.push(binaryEntropy(p));
  }

  return (
    <>
      <Panel title={t('it.entropy.bars')}>
        <Canvas
          height={210}
          ariaLabel="Probability and self-information bars"
          deps={[norm]}
          draw={(ctx, w, h) => {
            const yDom: [number, number] = [0, 1];
            const ax: Axes = {
              x: linScale([0, n], [PAD.l, w - PAD.r]),
              y: linScale(yDom, [h - PAD.b, PAD.t]),
            };
            drawAxes(ctx, ax, [0, n], {
              xLabel: '$\\text{symbol}\\ s_k$',
              yLabel: '$p_k$',
              domainY: yDom,
              xTicks: [],
            });
            for (let i = 0; i < n; i++) {
              const x0 = ax.x(i + 0.15);
              const x1 = ax.x(i + 0.85);
              ctx.fillStyle = alpha(CHART.green, 0.7);
              ctx.fillRect(x0, ax.y(norm[i]), x1 - x0, ax.y(0) - ax.y(norm[i]));
              drawText(ctx, ax, i + 0.5, 0, `s${i}`, CHART.dim, -6, 14);
              drawText(
                ctx,
                ax,
                i + 0.5,
                norm[i],
                `I=${selfInfo(norm[i]).toFixed(1)}`,
                CHART.orange,
                -14,
                -6,
              );
            }
          }}
        />
      </Panel>

      <Panel title={t('it.entropy.curve')}>
        <Canvas
          height={210}
          ariaLabel="Binary entropy function H(p)"
          deps={[norm, zlo, zhi]}
          onWheel={onWheel}
          onPan={onPan}
          draw={(ctx, w, h) => {
            const yDom: [number, number] = [0, 1.05];
            const ax: Axes = {
              x: linScale([zlo, zhi], [PAD.l, w - PAD.r]),
              y: linScale(yDom, [h - PAD.b, PAD.t]),
            };
            drawAxes(ctx, ax, [zlo, zhi], {
              xLabel: '$p$',
              yLabel: '$H_b(p)\\,(\\mathrm{bits})$',
              domainY: yDom,
            });
            drawLine(ctx, ax, xs, ys, CHART.green, 2);
            if (norm.length === 2) {
              drawText(ctx, ax, norm[0], binaryEntropy(norm[0]), '●', CHART.orange, -4, -2);
            }
          }}
        />
      </Panel>
    </>
  );
}
