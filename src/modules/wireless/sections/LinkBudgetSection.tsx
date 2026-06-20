import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, shadeRegion, drawVLine } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import {
  DEFAULT_LINK_BUDGET_PARAMS,
  deriveLinkBudget,
  type LinkBudgetParams,
  type LinkBudgetDerived,
} from '../linkbudget-model';
import { LinkBudgetControls } from '../linkbudget-panels';
import { drawLegend } from '../wl-plot';

function WaterfallPanel({ d }: { d: LinkBudgetDerived }) {
  return (
    <Canvas
      height={220}
      ariaLabel="link budget waterfall of power levels"
      deps={[d]}
      draw={(ctx, w, h) => {
        const levels = d.waterfall.map((s) => s.cumDbm);
        const yMin = Math.min(...levels, d.sensitivityDbm) - 5;
        const yMax = Math.max(...levels) + 5;
        const ax = { x: linScale([0, d.waterfall.length], [44, w - 10]), y: linScale([yMin, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [0, d.waterfall.length], {
          xLabel: '$\\mathrm{stage}$',
          yLabel: '$\\mathrm{level}\\,(\\mathrm{dBm})$',
          domainY: [yMin, yMax],
        });
        d.waterfall.forEach((s, i) => {
          shadeRegion(ctx, ax, i + 0.15, i + 0.85, yMin, s.cumDbm, alpha(CHART.blue, 0.45));
        });
        drawLine(ctx, ax, [0, d.waterfall.length], [d.sensitivityDbm, d.sensitivityDbm], CHART.red, 1.4, true);
        drawLegend(ctx, w, [
          { color: CHART.blue, label: 'cumulative' },
          { color: CHART.red, label: 'sensitivity' },
        ]);
      }}
    />
  );
}

function RangePanel({ d }: { d: LinkBudgetDerived }) {
  const x0 = d.distKm[0];
  const x1 = d.distKm[d.distKm.length - 1];
  const [lo, hi, onWheel, , onPan] = useZoom(x0, x1, { minSpan: 0.5, maxSpan: x1 - x0, clampMin: x0, clampMax: x1 });
  return (
    <Canvas
      height={220}
      ariaLabel="received power versus distance with sensitivity and fade margin"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ys = d.rxByDist;
        const yMin = Math.min(...ys, d.sensitivityDbm) - 3;
        const yMax = Math.max(...ys) + 3;
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: linScale([yMin, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$d\\,(\\mathrm{km})$', yLabel: '$P_r\\,(\\mathrm{dBm})$', domainY: [yMin, yMax] });
        shadeRegion(ctx, ax, lo, hi, d.sensitivityDbm, d.sensitivityDbm + d.fadeMarginDb, alpha(CHART.blue, 0.45));
        drawLine(ctx, ax, [lo, hi], [d.sensitivityDbm, d.sensitivityDbm], CHART.red, 1.2, true);
        drawLine(ctx, ax, d.distKm, ys, CHART.green, 2);
        if (d.maxRangeKm > lo && d.maxRangeKm < hi) drawVLine(ctx, ax, d.maxRangeKm, yMin, yMax, CHART.orange);
        drawLegend(ctx, w, [
          { color: CHART.green, label: 'P_r(d)' },
          { color: CHART.red, label: 'sensitivity' },
          { color: CHART.orange, label: 'max range' },
        ]);
      }}
    />
  );
}

export function LinkBudgetSection() {
  const [params, setParams] = useState<LinkBudgetParams>(DEFAULT_LINK_BUDGET_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<LinkBudgetParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_LINK_BUDGET_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveLinkBudget(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <LinkBudgetControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.lb.waterfall.title')}>
          <WaterfallPanel d={d} />
          <Readout label={t('wl.lb.readout.pathLoss')} value={d.pathLossDb.toFixed(1)} unit="dB" />
          <Readout label={t('wl.lb.readout.rxPower')} value={d.rxPowerDbm.toFixed(1)} unit="dBm" />
          <Readout label={t('wl.lb.readout.noiseFloor')} value={d.noiseFloorDbm.toFixed(1)} unit="dBm" />
          <Formula tex="P_r = P_t + G_t + G_r - L - L_{\text{other}}" />
        </Panel>

        <Panel title={t('wl.lb.range.title')}>
          <RangePanel key={resetKey} d={d} />
          <Readout label={t('wl.lb.readout.ebn0')} value={d.ebN0Db.toFixed(1)} unit="dB" />
          <Readout label={t('wl.lb.readout.required')} value={d.requiredEbN0Db.toFixed(1)} unit="dB" />
          <Readout label={t('wl.lb.readout.fade')} value={d.fadeMarginDb.toFixed(1)} unit="dB" />
          <Readout
            label={t('wl.lb.readout.margin')}
            value={d.effectiveMarginDb.toFixed(1)}
            unit="dB"
            tone={d.linkCloses ? 'ok' : 'err'}
          />
          <Readout label={t('wl.lb.readout.range')} value={d.maxRangeKm.toFixed(2)} unit="km" />
          <Readout
            label={d.linkCloses ? t('wl.lb.closes') : t('wl.lb.fails')}
            value={d.linkCloses ? '✓' : '✗'}
            tone={d.linkCloses ? 'ok' : 'err'}
          />
          <Formula tex="\text{margin} = \tfrac{E_b}{N_0}\Big|_{\text{rx}} - \tfrac{E_b}{N_0}\Big|_{\text{req}} - M_{\text{fade}}" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.lb.card.friis.title')} accent="green">
            <p>
              <HintText text={t('wl.lb.card.friis.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.lb.card.noise.title')} accent="blue">
            <p>
              <HintText text={t('wl.lb.card.noise.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.lb.card.margin.title')} accent="orange">
            <p>
              <HintText text={t('wl.lb.card.margin.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.lb.theory.title')}>
          <p>{t('wl.lb.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
