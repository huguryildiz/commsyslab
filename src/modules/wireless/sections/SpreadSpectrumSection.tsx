import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawStems } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_SPREAD_PARAMS, deriveSpread, type SpreadParams } from '../spread-model';
import { SpreadControls } from '../spread-panels';

const BER_FLOOR = 1e-6; // clamp for the BER log axis

export function SpreadSpectrumSection() {
  const [params, setParams] = useState<SpreadParams>(DEFAULT_SPREAD_PARAMS);
  const set = (patch: Partial<SpreadParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveSpread(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);
  const lags = d.autocorr.map((_, i) => i);

  return (
    <>
      <SpreadControls params={params} set={set} />

      <Panel title={t('wl.ss.autocorr.title')}>
        <Canvas
          height={200}
          ariaLabel="PN sequence cyclic autocorrelation"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ax = {
              x: linScale([0, d.autocorr.length - 1], [36, w - 8]),
              y: linScale([-2, d.N], [h - 16, 12]),
            };
            drawAxes(ctx, ax, [0, d.autocorr.length - 1]);
            drawStems(ctx, ax, lags, d.autocorr, CHART.green);
          }}
        />
        <Readout label={t('wl.ss.readout.N')} value={d.N} />
        <Readout label={t('wl.ss.readout.gp')} value={d.processingGainDb.toFixed(1)} unit="dB" />
        <Formula tex="G_p = \dfrac{W}{R} = \dfrac{T_b}{T_c} = N" />
      </Panel>

      <Panel title={t('wl.ss.spectrum.title')}>
        <Canvas
          height={220}
          ariaLabel="signal spectrum before and after despreading"
          deps={[d]}
          draw={(ctx, w, h) => {
            const fmax = d.freqs[d.freqs.length - 1] || 0.5;
            const yMax = Math.max(...d.spectrumSpread, ...d.spectrumDespread, 0.01);
            const ax = {
              x: linScale([0, fmax], [36, w - 8]),
              y: linScale([0, yMax], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [0, fmax]);
            drawLine(ctx, ax, d.freqs, d.spectrumSpread, CHART.orange, 1.4);
            drawLine(ctx, ax, d.freqs, d.spectrumDespread, CHART.blue, 1.8);
          }}
        />
        <TheoryBox>
          The data bit is multiplied by a fast ±1 PN code, spreading its energy across the whole
          chip-rate band (orange). A narrowband jammer occupies one frequency. Multiplying the
          received signal by the same PN code again (blue) collapses the wanted signal back to
          baseband while smearing the jammer across the band — so only 1/N of the jammer power lands
          in the data bandwidth. That ratio N is the processing gain.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.ss.ber.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus jammer to signal ratio"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.jsrSweep;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.berUnspread.map(clampBer), CHART.dim, 1.4);
            drawLine(ctx, ax, x, d.berSpread.map(clampBer), CHART.green, 2.0);
          }}
        />
        <Formula tex="\tfrac1{\gamma_{\text{eff}}} = \tfrac1{\gamma_b} + \tfrac{\text{JSR}}{G_p},\quad P_b = Q(\sqrt{2\gamma_{\text{eff}}})" />
        <TheoryBox>
          Without spreading (grey) a strong jammer quickly destroys the link. With processing gain N
          (green) the despreader suppresses the jammer by a factor N, so the same jammer power costs
          far fewer dB — this is the jamming margin. Raise the PN register length to widen N and watch
          the green curve pull away from the grey one.
        </TheoryBox>
      </Panel>
    </>
  );
}
