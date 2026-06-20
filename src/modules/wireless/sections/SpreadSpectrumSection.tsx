import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawStems } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_SPREAD_PARAMS, deriveSpread, type SpreadParams, type SpreadDerived } from '../spread-model';
import { SpreadControls } from '../spread-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;
const clampBer = (y: number) => Math.max(y, BER_FLOOR);

function AutocorrPanel({ d }: { d: SpreadDerived }) {
  const lags = d.autocorr.map((_, i) => i);
  return (
    <Canvas
      height={200}
      ariaLabel="PN sequence cyclic autocorrelation"
      deps={[d]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([0, d.autocorr.length - 1], [40, w - 10]), y: linScale([-2, d.N], [h - 28, 12]) };
        drawAxes(ctx, ax, [0, d.autocorr.length - 1], { xLabel: '$k\\,(\\mathrm{chips})$', yLabel: '$R(k)$' });
        drawStems(ctx, ax, lags, d.autocorr, CHART.green);
      }}
    />
  );
}

function SpectrumPanel({ d }: { d: SpreadDerived }) {
  const fmax = d.freqs[d.freqs.length - 1] || 0.5;
  const [lo, hi, onWheel, , onPan] = useZoom(0, fmax, { minSpan: fmax / 8, maxSpan: fmax, clampMin: 0, clampMax: fmax });
  return (
    <Canvas
      height={220}
      ariaLabel="signal spectrum before and after despreading"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...d.spectrumSpread, ...d.spectrumDespread, 0.01);
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([0, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f/R_c$', yLabel: '$|S(f)|$' });
        drawLine(ctx, ax, d.freqs, d.spectrumSpread, CHART.orange, 1.4);
        drawLine(ctx, ax, d.freqs, d.spectrumDespread, CHART.blue, 1.8);
        drawLegend(ctx, w, [
          { color: CHART.orange, label: 'pre-despread' },
          { color: CHART.blue, label: 'despread' },
        ]);
      }}
    />
  );
}

function BerPanel({ d }: { d: SpreadDerived }) {
  const x = d.jsrSweep;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 10,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={240}
      ariaLabel="bit error rate versus jammer to signal ratio"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([BER_FLOOR, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$\\mathrm{JSR}\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, x, d.berUnspread.map(clampBer), CHART.dim, 1.4);
        drawLine(ctx, ax, x, d.berSpread.map(clampBer), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.dim, label: 'unspread' },
          { color: CHART.green, label: 'spread' },
        ]);
      }}
    />
  );
}

export function SpreadSpectrumSection() {
  const [params, setParams] = useState<SpreadParams>(DEFAULT_SPREAD_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<SpreadParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_SPREAD_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveSpread(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <SpreadControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.ss.autocorr.title')}>
          <AutocorrPanel d={d} />
          <Readout label={t('wl.ss.readout.N')} value={d.N} />
          <Readout label={t('wl.ss.readout.gp')} value={d.processingGainDb.toFixed(1)} unit="dB" />
          <Formula tex="G_p = \dfrac{W}{R} = \dfrac{T_b}{T_c} = N" />
        </Panel>

        <Panel title={t('wl.ss.spectrum.title')}>
          <SpectrumPanel key={resetKey} d={d} />
        </Panel>

        <Panel title={t('wl.ss.ber.title')}>
          <BerPanel key={resetKey} d={d} />
          <Readout label={t('wl.ss.readout.pe')} value={d.detectorPe.toExponential(2)} />
          <Formula tex="\tfrac1{\gamma_{\text{eff}}} = \tfrac1{\gamma_b} + \tfrac{\text{JSR}}{G_p},\quad P_b = Q(\sqrt{2\gamma_{\text{eff}}})" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.ss.card.gp.title')} accent="green">
            <p>
              <HintText text={t('wl.ss.card.gp.body')} />
            </p>
            <Formula tex="G_p = N = 2^n - 1" block />
          </InfoCard>
          <InfoCard title={t('wl.ss.card.despread.title')} accent="orange">
            <p>
              <HintText text={t('wl.ss.card.despread.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ss.card.margin.title')} accent="blue">
            <p>
              <HintText text={t('wl.ss.card.margin.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.ss.theory.title')}>
          <p>{t('wl.ss.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
