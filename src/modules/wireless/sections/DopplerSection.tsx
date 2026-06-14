import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, shadeRegion } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_DOPPLER_PARAMS, deriveDoppler, type DopplerParams } from '../doppler-model';
import { DopplerControls } from '../doppler-panels';

const FADE_FILL = 'rgba(255, 91, 107, 0.22)'; // CHART.red, translucent (below-threshold fade intervals)

export function DopplerSection() {
  const [params, setParams] = useState<DopplerParams>(DEFAULT_DOPPLER_PARAMS);
  const set = (patch: Partial<DopplerParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveDoppler(params), [params]);

  return (
    <>
      <DopplerControls params={params} set={set} />

      <Panel title={t('wl.doppler.psd.title')}>
        <Canvas
          height={200}
          ariaLabel="U-shaped classical Doppler power spectrum"
          deps={[d]}
          draw={(ctx, w, h) => {
            const fMax = d.fmHz || 1;
            const yMax = Math.max(...d.psdVal) * 1.05 || 1;
            const ax = {
              x: linScale([-fMax, fMax], [40, w - 8]),
              y: linScale([0, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [-fMax, fMax]);
            drawLine(ctx, ax, d.psdFreq, d.psdVal, CHART.blue, 2);
          }}
        />
        <Readout label={t('wl.doppler.readout.fm')} value={d.fmHz.toFixed(1)} unit="Hz" />
        <Formula tex="S(f) = \dfrac{1}{\pi f_m\sqrt{1-(f/f_m)^2}},\quad |f|<f_m" />
        <TheoryBox>
          Motion spreads the received spectrum over ±f_m around the carrier. The classical (Jakes)
          isotropic-scattering model gives this U-shaped Doppler spectrum: most energy piles up at the
          band edges ±f_m (paths arriving head-on or from behind). Faster motion or a higher carrier
          widens it — and the channel changes faster.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.doppler.env.title')}>
        <Canvas
          height={220}
          ariaLabel="Rayleigh fading envelope versus time with fade intervals"
          deps={[d]}
          draw={(ctx, w, h) => {
            const tMax = d.envTimeMs[d.envTimeMs.length - 1] || 1;
            const yMin = -30;
            const yMax = 10;
            const ax = {
              x: linScale([0, tMax], [40, w - 8]),
              y: linScale([yMin, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, tMax]);
            // Shade below-threshold fade intervals.
            for (let i = 1; i < d.envDb.length; i++) {
              if (d.envDb[i] < d.thresholdDb) {
                shadeRegion(ctx, ax, d.envTimeMs[i - 1], d.envTimeMs[i], yMin, d.thresholdDb, FADE_FILL);
              }
            }
            // Dashed threshold line ρ across the whole time axis.
            drawLine(ctx, ax, [0, tMax], [d.thresholdDb, d.thresholdDb], CHART.red, 1.2, true);
            drawLine(ctx, ax, d.envTimeMs, d.envDb, CHART.green, 1.6);
          }}
        />
        <Readout label={t('wl.doppler.readout.tc')} value={d.coherenceTimeMs.toFixed(2)} unit="ms" />
        <Readout label={t('wl.doppler.readout.tcRule')} value={d.coherenceTimeRuleMs.toFixed(2)} unit="ms" />
        <Readout label={t('wl.doppler.readout.lcr')} value={d.lcrHz.toFixed(1)} unit="/s" />
        <Readout label={t('wl.doppler.readout.afd')} value={d.afdMs.toFixed(2)} unit="ms" />
        <Formula tex="N_R = \sqrt{2\pi}\,f_m\,\rho\,e^{-\rho^2},\qquad \bar\tau = \dfrac{e^{\rho^2}-1}{\rho f_m\sqrt{2\pi}}" />
        <TheoryBox>
          The envelope (green, in dB about its RMS) dips into deep fades whenever the scattered paths
          cancel. The dashed red line is the chosen threshold ρ; shaded spans are outages. The level-
          crossing rate counts how often per second the envelope drops below ρ, and the average fade
          duration is how long each dip lasts — both scale with f_m, so a faster mobile fades more
          often but for shorter spells.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.doppler.acf.title')}>
        <Canvas
          height={180}
          ariaLabel="Doppler autocorrelation Bessel function with coherence-time marker"
          deps={[d]}
          draw={(ctx, w, h) => {
            const tMax = d.acfTauMs[d.acfTauMs.length - 1] || 1;
            const ax = {
              x: linScale([0, tMax], [40, w - 8]),
              y: linScale([-0.5, 1], [h - 16, 12]),
            };
            drawAxes(ctx, ax, [0, tMax]);
            drawVLine(ctx, ax, d.coherenceTimeMs, -0.5, 1, CHART.orange, true);
            drawLine(ctx, ax, d.acfTauMs, d.acfVal, CHART.blue, 2);
          }}
        />
        <Formula tex="R(\tau) = J_0(2\pi f_m \tau),\qquad T_{ct} = 1/B_d" />
        <TheoryBox>
          How correlated the channel stays with itself after a delay τ. It follows the Bessel function
          J₀(2π f_m τ) and first decorrelates around the coherence time T_ct (orange marker). Samples
          closer than T_ct see essentially the same fade; farther apart they fade independently — the
          basis for time diversity and interleaving.
        </TheoryBox>
      </Panel>
    </>
  );
}
