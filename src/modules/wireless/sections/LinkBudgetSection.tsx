import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, shadeRegion, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_LINK_BUDGET_PARAMS, deriveLinkBudget, type LinkBudgetParams } from '../linkbudget-model';
import { LinkBudgetControls } from '../linkbudget-panels';

const BAR_FILL = 'rgba(123, 140, 255, 0.45)'; // CHART.blue, translucent (waterfall bars)

export function LinkBudgetSection() {
  const [params, setParams] = useState<LinkBudgetParams>(DEFAULT_LINK_BUDGET_PARAMS);
  const set = (patch: Partial<LinkBudgetParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveLinkBudget(params), [params]);

  return (
    <>
      <LinkBudgetControls params={params} set={set} />

      <Panel title={t('wl.lb.waterfall.title')}>
        <Canvas
          height={220}
          ariaLabel="link budget waterfall of power levels"
          deps={[d]}
          draw={(ctx, w, h) => {
            const levels = d.waterfall.map((s) => s.cumDbm);
            const yMin = Math.min(...levels, d.sensitivityDbm) - 5;
            const yMax = Math.max(...levels) + 5;
            const ax = {
              x: linScale([0, d.waterfall.length], [40, w - 8]),
              y: linScale([yMin, yMax], [h - 16, 12]),
            };
            drawAxes(ctx, ax, [0, d.waterfall.length]);
            // Bars from the axis floor up to each cumulative level.
            d.waterfall.forEach((s, i) => {
              shadeRegion(ctx, ax, i + 0.15, i + 0.85, yMin, s.cumDbm, BAR_FILL);
            });
            // Sensitivity threshold (required Rx power, no fade) across the chart.
            drawLine(ctx, ax, [0, d.waterfall.length], [d.sensitivityDbm, d.sensitivityDbm], CHART.red, 1.4, true);
          }}
        />
        <Readout label={t('wl.lb.readout.pathLoss')} value={d.pathLossDb.toFixed(1)} unit="dB" />
        <Readout label={t('wl.lb.readout.rxPower')} value={d.rxPowerDbm.toFixed(1)} unit="dBm" />
        <Readout label={t('wl.lb.readout.noiseFloor')} value={d.noiseFloorDbm.toFixed(1)} unit="dBm" />
        <Formula tex="P_r = P_t + G_t + G_r - L - L_{\text{other}}" />
        <TheoryBox>
          The waterfall stacks the link's gains and losses, dBm by dBm, from the transmitter down to
          the received power (rightmost bar). The dashed line is the receiver sensitivity — the
          minimum received power that still meets the modulation's required E_b/N₀. Anything above it
          is margin.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.lb.range.title')}>
        <Canvas
          height={220}
          ariaLabel="received power versus distance with sensitivity and fade margin"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ys = d.rxByDist;
            const xMax = d.distKm[d.distKm.length - 1];
            const yMin = Math.min(...ys, d.sensitivityDbm) - 3;
            const yMax = Math.max(...ys) + 3;
            const ax = {
              x: linScale([d.distKm[0], xMax], [40, w - 8]),
              y: linScale([yMin, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [d.distKm[0], xMax]);
            // Fade-margin band above the bare sensitivity threshold.
            shadeRegion(ctx, ax, d.distKm[0], xMax, d.sensitivityDbm, d.sensitivityDbm + d.fadeMarginDb, BAR_FILL);
            drawLine(ctx, ax, [d.distKm[0], xMax], [d.sensitivityDbm, d.sensitivityDbm], CHART.red, 1.2, true);
            drawLine(ctx, ax, d.distKm, ys, CHART.green, 2);
            if (d.maxRangeKm > d.distKm[0] && d.maxRangeKm < xMax) {
              drawVLine(ctx, ax, d.maxRangeKm, yMin, yMax, CHART.orange);
            }
          }}
        />
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
        <TheoryBox>
          Received power (green) falls with distance as path loss grows. The dashed red line is the
          bare sensitivity; the shaded band above it is the log-normal shadowing fade margin needed
          for the target outage. The link closes while the green curve stays above the band; the
          orange marker is the maximum range where it just closes.
        </TheoryBox>
      </Panel>
    </>
  );
}
