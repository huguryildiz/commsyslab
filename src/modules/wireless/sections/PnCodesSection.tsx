import { useEffect, useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStep, drawStems, drawVLine } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_PN_PARAMS, derivePn, type PnParams, type PnDerived } from '../pn-model';
import { PnControls } from '../pn-panels';

/* Animated LFSR: draws the register cells, the feedback XOR taps, and the chip
   emitted at the current step. Pure drawing from precomputed register states. */
function LfsrPanel({ d, step }: { d: PnDerived; step: number }) {
  return (
    <Canvas
      height={150}
      ariaLabel="linear feedback shift register state"
      deps={[d, step]}
      draw={(ctx, w, h) => {
        const n = d.n;
        const reg = d.states[step % d.states.length];
        const cellW = Math.min(46, (w - 120) / n);
        const cellH = 34;
        const y = h / 2 - cellH / 2;
        const x0 = 20;
        ctx.save();
        ctx.font = '13px var(--mono)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
          const x = x0 + i * (cellW + 6);
          const bit = reg[i];
          ctx.fillStyle = bit ? alpha(CHART.green, 0.25) : 'transparent';
          ctx.strokeStyle = CHART.dim;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.rect(x, y, cellW, cellH);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = CHART.text;
          ctx.fillText(String(bit), x + cellW / 2, y + cellH / 2);
          // Tap marker under stages that feed the XOR.
          if (d.taps.includes(i + 1)) {
            ctx.fillStyle = CHART.orange;
            ctx.beginPath();
            ctx.arc(x + cellW / 2, y + cellH + 10, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        // Output chip from the last stage.
        const xOut = x0 + n * (cellW + 6) + 16;
        ctx.strokeStyle = CHART.dim;
        ctx.beginPath();
        ctx.moveTo(x0 + n * (cellW + 6) - 6, y + cellH / 2);
        ctx.lineTo(xOut - 6, y + cellH / 2);
        ctx.stroke();
        const chip = d.seq[step % d.seq.length];
        ctx.fillStyle = chip > 0 ? CHART.green : CHART.orange;
        ctx.font = '15px var(--mono)';
        ctx.fillText(chip > 0 ? '+1' : '−1', xOut + 8, y + cellH / 2);
        ctx.restore();
      }}
    />
  );
}

function PnWaveformPanel({ d, step }: { d: PnDerived; step: number }) {
  const n = d.seq.length;
  const initSpan = Math.min(n - 1, 31);
  const [lo, hi, onWheel, , onPan] = useZoom(0, initSpan, { minSpan: 6, maxSpan: n - 1, clampMin: 0, clampMax: n - 1 });
  return (
    <Canvas
      height={170}
      ariaLabel="PN sequence waveform"
      deps={[d, step, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([-1.4, 1.4], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$\\mathrm{chip}\\,(i)$', yLabel: '$c_i$', domainY: [-1.4, 1.4] });
        drawStep(
          ctx,
          ax,
          d.seq.map((_, i) => i),
          d.seq,
          CHART.green,
          1.8,
        );
        if (step >= lo && step <= hi) drawVLine(ctx, ax, step, -1.4, 1.4, CHART.pink, true, 1.5);
      }}
    />
  );
}

function AutocorrPanel({ d }: { d: PnDerived }) {
  const N = d.period;
  // Center the lags around zero: show k = -(N-1)/2 … (N-1)/2 via modular wrap.
  const lags = d.autocorr.map((_, k) => (k > N / 2 ? k - N : k));
  const order = lags.map((_, i) => i).sort((a, b) => lags[a] - lags[b]);
  const xs = order.map((i) => lags[i]);
  const ys = order.map((i) => d.autocorr[i]);
  return (
    <Canvas
      height={180}
      ariaLabel="PN autocorrelation thumbtack"
      deps={[d]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([xs[0], xs[xs.length - 1]], [40, w - 10]), y: linScale([-2, N * 1.1], [h - 28, 12]) };
        drawAxes(ctx, ax, [xs[0], xs[xs.length - 1]], { xLabel: '$k$', yLabel: '$R(k)$', domainY: [-2, N * 1.1] });
        drawStems(ctx, ax, xs, ys, CHART.blue, 2);
      }}
    />
  );
}

function CrossCorrPanel({ d }: { d: PnDerived }) {
  const N = d.period;
  const xs = d.crossCorr.map((_, k) => k);
  const peak = Math.max(d.crossPeak, 2);
  return (
    <Canvas
      height={180}
      ariaLabel="Gold-code cross-correlation"
      deps={[d]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([0, N - 1], [40, w - 10]), y: linScale([-peak * 1.2, peak * 1.2], [h - 28, 12]) };
        drawAxes(ctx, ax, [0, N - 1], { xLabel: '$k$', yLabel: '$R_{12}(k)$', domainY: [-peak * 1.2, peak * 1.2] });
        // Dashed horizontal guides at the allowed three-valued levels.
        d.threeValued.forEach((v) => drawLine(ctx, ax, [0, N - 1], [v, v], CHART.dim, 1, true));
        drawStems(ctx, ax, xs, d.crossCorr, CHART.orange, 1.5);
      }}
    />
  );
}

export function PnCodesSection() {
  const [params, setParams] = useState<PnParams>(DEFAULT_PN_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const [step, setStep] = useState(0);
  const set = (patch: Partial<PnParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_PN_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => derivePn(params), [params]);

  // Advance the LFSR animation; reset when the period changes.
  useEffect(() => setStep(0), [d.period]);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % d.period), 550);
    return () => clearInterval(id);
  }, [d.period]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <PnControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.pn.lfsr.title')}>
          <LfsrPanel d={d} step={step} />
          <Readout label={t('wl.pn.readout.taps')} value={`[${d.taps.join(', ')}]`} />
          <Readout label={t('wl.pn.readout.period')} value={`${d.period}`} unit="chips" />
          <Readout label={t('wl.pn.readout.balance')} value={`${d.balance.ones} / ${d.balance.zeros}`} />
          <Readout label={t('wl.pn.readout.gp')} value={d.processingGainDb.toFixed(1)} unit="dB" />
        </Panel>

        <Panel title={t('wl.pn.wave.title')}>
          <PnWaveformPanel key={resetKey} d={d} step={step} />
        </Panel>

        <Panel title={t('wl.pn.autocorr.title')}>
          <AutocorrPanel d={d} />
          <Formula tex="R(k) = \sum_i c_i\,c_{(i+k)\bmod N} = \begin{cases} N & k=0 \\ -1 & k\neq 0 \end{cases}" />
        </Panel>

        <Panel title={t('wl.pn.cross.title')}>
          <CrossCorrPanel d={d} />
          <Readout label={t('wl.pn.readout.crossPeak')} value={`${d.crossPeak}`} />
          <Readout label={t('wl.pn.readout.threeValued')} value={`{${d.threeValued.join(', ')}}`} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.pn.card.lfsr.title')} accent="green">
            <p>
              <HintText text={t('wl.pn.card.lfsr.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.pn.card.mseq.title')} accent="blue">
            <p>
              <HintText text={t('wl.pn.card.mseq.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.pn.card.thumbtack.title')} accent="blue">
            <p>
              <HintText text={t('wl.pn.card.thumbtack.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.pn.card.gold.title')} accent="orange">
            <p>
              <HintText text={t('wl.pn.card.gold.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.pn.theory.title')}>
          <p>{t('wl.pn.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
