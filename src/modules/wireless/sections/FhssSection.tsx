import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawScatter } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_FHSS_PARAMS, deriveFhss, type FhssParams, type FhssDerived } from '../fhss-model';
import { FhssControls } from '../fhss-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;
const clampBer = (y: number) => Math.max(y, BER_FLOOR);

function HopPanel({ d, nHopChannels }: { d: FhssDerived; nHopChannels: number }) {
  const nHops = d.hopIdx.length;
  const [lo, hi, onWheel, , onPan] = useZoom(0, nHops, { minSpan: 8, maxSpan: nHops, clampMin: 0, clampMax: nHops });
  return (
    <Canvas
      height={200}
      ariaLabel="frequency hop pattern over time"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([0, nHopChannels], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\mathrm{hop}\\,(k)$',
          yLabel: '$\\mathrm{slot}$',
          domainY: [0, nHopChannels],
        });
        const xs = d.hopIdx.map((_, i) => i + 0.5);
        drawScatter(ctx, ax, xs, d.hopIdx, CHART.orange, 3);
      }}
    />
  );
}

function FhssBerPanel({ d }: { d: FhssDerived }) {
  const x = d.ebN0JSweep;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={240}
      ariaLabel="bit error rate versus Eb over NJ for partial-band jamming"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([BER_FLOOR, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$E_b/N_J\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, x, d.berFull.map(clampBer), CHART.dim, 1.4);
        drawLine(ctx, ax, x, d.berBeta.map(clampBer), CHART.green, 2);
        drawLine(ctx, ax, x, d.berWorst.map(clampBer), CHART.red, 1.8, true);
        if (d.hopsPerBit > 1) drawLine(ctx, ax, x, d.berFast.map(clampBer), CHART.blue, 2);
        const legend = [
          { color: CHART.dim, label: 'full-band' },
          { color: CHART.green, label: 'partial β' },
          { color: CHART.red, label: 'worst-case' },
        ];
        if (d.hopsPerBit > 1) legend.push({ color: CHART.blue, label: `fast FH (L=${d.hopsPerBit})` });
        drawLegend(ctx, w, legend);
      }}
    />
  );
}

export function FhssSection() {
  const [params, setParams] = useState<FhssParams>(DEFAULT_FHSS_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<FhssParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_FHSS_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveFhss(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <FhssControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.fhss.hop.title')}>
          <HopPanel key={resetKey} d={d} nHopChannels={params.nHopChannels} />
          <Readout label={t('wl.fhss.readout.gain')} value={d.processingGainDb.toFixed(1)} unit="dB" />
          <Formula tex="G_p = W/R \;(\text{hop slots})" />
        </Panel>

        <Panel title={t('wl.fhss.ber.title')}>
          <FhssBerPanel key={resetKey} d={d} />
          <Readout label={t('wl.fhss.readout.worstBeta')} value={d.worstBetaAtOp.toFixed(3)} />
          <Readout label={t('wl.fhss.readout.worstBer')} value={d.worstBerAtOp.toExponential(2)} />
          <Readout label={t('wl.fhss.readout.betaBer')} value={d.betaBerAtOp.toExponential(2)} />
          {params.hopsPerBit > 1 && (
            <Readout label={t('wl.fhss.readout.fastBer')} value={d.fastBerAtOp.toExponential(2)} tone="ok" />
          )}
          <Formula tex="P_e(\beta) = \tfrac{\beta}{2}e^{-\beta\gamma_b/2},\qquad P_{e,\text{worst}} = \dfrac{e^{-1}}{\gamma_b}" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.fhss.card.hop.title')} accent="orange">
            <p>
              <HintText text={t('wl.fhss.card.hop.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.fhss.card.partial.title')} accent="green">
            <p>
              <HintText text={t('wl.fhss.card.partial.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.fhss.card.slowfast.title')} accent="blue">
            <p>
              <HintText text={t('wl.fhss.card.slowfast.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.fhss.theory.title')}>
          <p>{t('wl.fhss.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
