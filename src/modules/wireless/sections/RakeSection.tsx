import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawStems, drawVLine, shadeRegion } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_RAKE_PARAMS, deriveRake, type RakeParams } from '../rake-model';
import { RakeControls } from '../rake-panels';

const BER_FLOOR = 1e-6;
const BAR_FILL = 'rgba(57, 255, 133, 0.4)'; // CHART.green, translucent (finger SNR bars)

export function RakeSection() {
  const [params, setParams] = useState<RakeParams>(DEFAULT_RAKE_PARAMS);
  const set = (patch: Partial<RakeParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveRake(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);

  return (
    <>
      <RakeControls params={params} set={set} />

      <Panel title={t('wl.rake.pdp.title')}>
        <Canvas
          height={200}
          ariaLabel="power delay profile with chip-resolution grid"
          deps={[d]}
          draw={(ctx, w, h) => {
            const xMax = Math.max(d.tapDelaysNs[d.tapDelaysNs.length - 1] || 1, d.chipDurationNs);
            const yMax = Math.max(...d.tapPowers, 0.01);
            const ax = {
              x: linScale([0, xMax], [36, w - 8]),
              y: linScale([0, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, xMax]);
            // Chip-resolution grid: a vertical line every chip duration.
            for (let g = d.chipDurationNs; g < xMax; g += d.chipDurationNs) {
              drawVLine(ctx, ax, g, 0, yMax, CHART.dim);
            }
            drawStems(ctx, ax, d.tapDelaysNs, d.tapPowers, CHART.green);
          }}
        />
        <Readout label={t('wl.rake.readout.fingers')} value={`${d.fingerCount}`} />
        <Readout label={t('wl.rake.readout.chip')} value={d.chipDurationNs.toFixed(0)} unit="ns" />
        <Formula tex="T_c = 1/W,\qquad \gamma = \textstyle\sum_l \gamma_l" />
        <TheoryBox>
          The faint vertical lines are one chip duration apart. Paths that fall inside the same chip
          interval cannot be told apart and merge into one finger; paths a full chip apart resolve
          into separate fingers. A wider band (higher chip rate) packs the grid tighter and resolves
          more fingers.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.rake.ber.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus Eb/N0 for RAKE diversity"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.ebN0Sweep;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.berNoRake.map(clampBer), CHART.dim, 1.4);
            drawLine(ctx, ax, x, d.berRake.map(clampBer), CHART.green, 2);
            drawLine(ctx, ax, x, d.berAwgn.map(clampBer), CHART.blue, 1.4, true);
          }}
        />
        <Formula tex="P_b^{\text{RAKE}} = P_b^{\text{MRC}}(\bar\gamma_b/L,\, L)" />
        <TheoryBox>
          Grey is a single faded path (no RAKE); green is the RAKE combining L fingers; the dashed
          blue line is the AWGN bound. Each extra finger steepens the green curve toward the bound —
          multipath, normally an impairment, becomes diversity once the RAKE harvests it.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.rake.snr.title')}>
        <Canvas
          height={180}
          ariaLabel="per finger signal to noise ratio bars"
          deps={[d]}
          draw={(ctx, w, h) => {
            const n = d.fingerSnrsDb.length;
            const yMin = Math.min(...d.fingerSnrsDb, 0) - 2;
            const yMax = Math.max(...d.fingerSnrsDb, 1) + 2;
            const ax = {
              x: linScale([0, n], [36, w - 8]),
              y: linScale([yMin, yMax], [h - 16, 12]),
            };
            drawAxes(ctx, ax, [0, n]);
            d.fingerSnrsDb.forEach((s, i) => {
              shadeRegion(ctx, ax, i + 0.15, i + 0.85, yMin, s, BAR_FILL);
            });
          }}
        />
        <TheoryBox>
          The combined finger SNRs at the chosen E_b/N₀. Earlier (stronger) paths carry more energy,
          so their fingers contribute more to the maximal-ratio sum.
        </TheoryBox>
      </Panel>
    </>
  );
}
