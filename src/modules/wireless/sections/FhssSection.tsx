import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawScatter } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_FHSS_PARAMS, deriveFhss, type FhssParams } from '../fhss-model';
import { FhssControls } from '../fhss-panels';

const BER_FLOOR = 1e-6;

export function FhssSection() {
  const [params, setParams] = useState<FhssParams>(DEFAULT_FHSS_PARAMS);
  const set = (patch: Partial<FhssParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveFhss(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);

  return (
    <>
      <FhssControls params={params} set={set} />

      <Panel title={t('wl.fhss.hop.title')}>
        <Canvas
          height={200}
          ariaLabel="frequency hop pattern over time"
          deps={[d]}
          draw={(ctx, w, h) => {
            const nHops = d.hopIdx.length;
            const ax = {
              x: linScale([0, nHops], [36, w - 8]),
              y: linScale([0, params.nHopChannels], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, nHops]);
            const xs = d.hopIdx.map((_, i) => i + 0.5);
            drawScatter(ctx, ax, xs, d.hopIdx, CHART.orange, 3);
          }}
        />
        <Readout label={t('wl.fhss.readout.gain')} value={d.processingGainDb.toFixed(1)} unit="dB" />
        <Formula tex="G_p = W/R \;(\text{hop slots})" />
        <TheoryBox>
          Each dot is one hop: the transmitter jumps to a pseudo-random frequency slot every hop
          interval, so the signal energy is smeared across the whole band over time. The number of
          slots W/R is the processing gain — a narrowband jammer can only sit in one slot and is
          dodged on most hops.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.fhss.ber.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus Eb over NJ for partial-band jamming"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.ebN0JSweep;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.berFull.map(clampBer), CHART.dim, 1.4);
            drawLine(ctx, ax, x, d.berBeta.map(clampBer), CHART.green, 2);
            drawLine(ctx, ax, x, d.berWorst.map(clampBer), CHART.red, 1.8, true);
          }}
        />
        <Readout label={t('wl.fhss.readout.worstBeta')} value={d.worstBetaAtOp.toFixed(3)} />
        <Readout label={t('wl.fhss.readout.worstBer')} value={d.worstBerAtOp.toExponential(2)} />
        <Readout label={t('wl.fhss.readout.betaBer')} value={d.betaBerAtOp.toExponential(2)} />
        <Formula tex="P_e(\beta) = \tfrac{\beta}{2}e^{-\beta\gamma_b/2},\qquad P_{e,\text{worst}} = \dfrac{e^{-1}}{\gamma_b}" />
        <TheoryBox>
          Grey is full-band noise (β=1): BER falls off exponentially with E_b/N_J. Green is the chosen
          partial-band fraction β. The dashed red line is the worst-case envelope: by concentrating
          power on the optimal fraction β*=2/γ_b of the band, a smart jammer makes the BER decay only
          as 1/(E_b/N_J) — at high SNR that sits far above the exponential, the classic spread-spectrum
          vulnerability that coding and interleaving are designed to counter.
        </TheoryBox>
      </Panel>
    </>
  );
}
