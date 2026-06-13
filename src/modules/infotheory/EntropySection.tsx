import { useMemo, useState } from 'react';
import { Panel, NumberInput, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawText } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { entropy, maxEntropy, selfInfo, binaryEntropy } from '@/lib/dsp/entropy';
import { t } from '@/i18n';

export function EntropySection() {
  const [probs, setProbs] = useState<number[]>([0.7, 0.2, 0.1]);

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

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.entropy.symbols')}>
          {probs.map((p, i) => (
            <NumberInput
              key={i}
              label={`p${i}`}
              value={p}
              min={0}
              max={1}
              step={0.05}
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
          <button type="button" onClick={() => setProbs([0.7, 0.2, 0.1])}>
            {t('it.entropy.preset')}
          </button>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label={t('it.entropy.H')} value={H.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.max')} value={max.toFixed(4)} unit="bits" />
          <Readout label={t('it.entropy.eta')} value={max > 0 ? (H / max).toFixed(3) : '—'} />
          <Readout label={t('it.entropy.sum')} value={probs.reduce((s, p) => s + p, 0).toFixed(2)} />
        </div>

        <Panel title={t('it.entropy.bars')}>
          <Canvas
            height={200}
            ariaLabel="Probability and self-information bars"
            deps={[norm]}
            draw={(ctx, w, h) => {
              const n = norm.length;
              const yMax = 1;
              const ax = { x: linScale([0, n], [30, w - 10]), y: linScale([0, yMax], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, n]);
              for (let i = 0; i < n; i++) {
                const x0 = ax.x(i + 0.15);
                const x1 = ax.x(i + 0.85);
                ctx.fillStyle = CHART.blue;
                ctx.fillRect(x0, ax.y(norm[i]), x1 - x0, ax.y(0) - ax.y(norm[i]));
                drawText(ctx, ax, i + 0.5, -0.04, `s${i}`, CHART.dim, -6, 12);
                drawText(ctx, ax, i + 0.5, norm[i], `I=${selfInfo(norm[i]).toFixed(1)}`, CHART.text, -14, -6);
              }
            }}
          />
        </Panel>

        <Panel title={t('it.entropy.curve')}>
          <Canvas
            height={200}
            ariaLabel="Binary entropy function H(p)"
            deps={[norm]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 1], [30, w - 10]), y: linScale([0, 1.05], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, 1]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let i = 0; i <= 100; i++) {
                const p = i / 100;
                xs.push(p);
                ys.push(binaryEntropy(p));
              }
              drawLine(ctx, ax, xs, ys, CHART.green, 2);
              if (norm.length === 2) {
                const p = norm[0];
                drawText(ctx, ax, p, binaryEntropy(p), '●', CHART.orange, -4, -2);
              }
            }}
          />
        </Panel>

        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="H(S)=-\sum_{k} p_k\log_2 p_k,\qquad 0\le H(S)\le \log_2 K" block />
          </p>
          <p>
            <Formula tex="I(s_k)=-\log_2 p_k\ \text{(bits)}" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
