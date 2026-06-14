import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ScenarioParams } from '../model';
import { ScenarioControls } from '../panels';

export function FadingChannelSection() {
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const set = (patch: Partial<ScenarioParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveAll(params), [params]);
  const tapDelaysUs = d.taps.map((tp) => tp.delay * 1e6);
  const tapPowers = d.taps.map((tp) => tp.power);
  const freqsMhz = d.freqs.map((f) => f / 1e6);
  const mag = d.magResponse;
  const env = Array.from(d.envelope);
  const envT = env.map((_, i) => i);

  return (
    <>
      <ScenarioControls params={params} set={set} />
      <Panel title={t('wl.pdp.title')}>
        <Canvas
          height={220}
          ariaLabel="power delay profile"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ax = {
              x: linScale([0, Math.max(...tapDelaysUs, 1)], [36, w - 8]),
              y: linScale([0, Math.max(...tapPowers, 0.01)], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [0, Math.max(...tapDelaysUs, 1)]);
            drawStems(ctx, ax, tapDelaysUs, tapPowers, CHART.orange);
          }}
        />
        <Readout label={t('wl.readout.sigmaTau')} value={`${(d.sigmaTau * 1e6).toFixed(3)} µs`} />
        <Formula tex="\sigma_\tau = \sqrt{\overline{\tau^2} - \bar{\tau}^2}" />
      </Panel>

      <Panel title={t('wl.freq.title')}>
        <Canvas
          height={220}
          ariaLabel="channel frequency response magnitude"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ax = {
              x: linScale([freqsMhz[0], freqsMhz[freqsMhz.length - 1]], [36, w - 8]),
              y: linScale([0, Math.max(...mag, 0.01)], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [freqsMhz[0], freqsMhz[freqsMhz.length - 1]]);
            drawLine(ctx, ax, freqsMhz, mag, CHART.blue, 1.8);
            const bcMhz = d.coherenceBw / 1e6;
            if (Number.isFinite(bcMhz)) {
              drawVLine(ctx, ax, -bcMhz, 0, Math.max(...mag, 0.01), CHART.pink);
              drawVLine(ctx, ax, bcMhz, 0, Math.max(...mag, 0.01), CHART.pink);
            }
          }}
        />
        <Readout
          label={t('wl.readout.coherenceBw')}
          value={Number.isFinite(d.coherenceBw) ? `${(d.coherenceBw / 1e6).toFixed(3)} MHz` : '∞'}
        />
        <Formula tex="B_c \approx \dfrac{1}{2\pi\,\sigma_\tau}" />
      </Panel>

      <Panel title={t('wl.env.title')}>
        <Canvas
          height={220}
          ariaLabel="fading envelope over time"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ax = {
              x: linScale([0, env.length - 1], [36, w - 8]),
              y: linScale([0, Math.max(...env, 0.01)], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [0, env.length - 1]);
            drawLine(ctx, ax, envT, env, CHART.green, 1.6);
          }}
        />
        <Canvas
          height={180}
          ariaLabel="envelope probability density"
          deps={[d]}
          draw={(ctx, w, h) => {
            const r = d.pdf.r;
            const fr = d.pdf.fr;
            const ax = {
              x: linScale([r[0], r[r.length - 1]], [36, w - 8]),
              y: linScale([0, Math.max(...fr, 0.01)], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [r[0], r[r.length - 1]]);
            drawLine(ctx, ax, r, fr, CHART.pink, 1.8);
          }}
        />
        <Readout
          label={t('wl.readout.coherenceTime')}
          value={
            Number.isFinite(d.coherenceTime) ? `${(d.coherenceTime * 1e3).toFixed(2)} ms` : '∞'
          }
        />
        <Formula tex="f(r) = \dfrac{r}{\sigma^2}\,e^{-r^2/2\sigma^2}\quad(K=0)" />
        <TheoryBox>
          Multipath spreads the signal in delay, so the transfer function |H(f)| varies across
          frequency — flat when one path dominates, frequency-selective when delay spread exceeds
          the coherence bandwidth. Motion (Doppler f_D) makes the envelope fluctuate in time; deep
          fades recur roughly every coherence time T_c. K = 0 gives Rayleigh fading; a line-of-sight
          path (K &gt; 0) makes the envelope Rician.
        </TheoryBox>
      </Panel>
    </>
  );
}
