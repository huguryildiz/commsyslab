import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawScatter, shadeRegion } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_OFDM_PARAMS, deriveOfdm, type OfdmParams } from '../ofdm-model';
import { OfdmControls } from '../ofdm-panels';

// Translucent fill for the cyclic-prefix guard interval (CHART.orange at low alpha).
const CP_FILL = 'rgba(255, 140, 66, 0.18)';

export function OfdmSection() {
  const [params, setParams] = useState<OfdmParams>(DEFAULT_OFDM_PARAMS);
  const set = (patch: Partial<OfdmParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveOfdm(params), [params]);

  const reX = d.rxPreEq.map((z) => z.re);
  const imX = d.rxPreEq.map((z) => z.im);
  const reXeq = d.rxPostEq.map((z) => z.re);
  const imXeq = d.rxPostEq.map((z) => z.im);
  const refRe = d.txSymbols.map((z) => z.re);
  const refIm = d.txSymbols.map((z) => z.im);
  const subIdx = d.channelMag.map((_, k) => k);

  return (
    <>
      <OfdmControls params={params} set={set} />

      <Panel title={t('wl.ofdm.time.title')}>
        <Canvas
          height={200}
          ariaLabel="OFDM time-domain symbol with cyclic prefix highlighted"
          deps={[d]}
          draw={(ctx, w, h) => {
            const n = d.timeReal.length;
            const yMax = Math.max(0.01, ...d.timeReal.map((v) => Math.abs(v)));
            const ax = {
              x: linScale([0, n - 1], [36, w - 8]),
              y: linScale([-yMax, yMax], [h - 16, 12]),
            };
            // Shade the cyclic-prefix guard interval.
            if (d.cpLength > 0) shadeRegion(ctx, ax, 0, d.cpLength - 1, -yMax, yMax, CP_FILL);
            drawAxes(ctx, ax, [0, n - 1]);
            drawLine(ctx, ax, d.timeReal.map((_, i) => i), d.timeReal, CHART.blue, 1.6);
          }}
        />
        <Readout label={t('wl.ofdm.readout.cp')} value={`${d.cpLength}`} unit="samples" />
        <Readout
          label={t('wl.ofdm.readout.cpState')}
          value={d.cpSufficient ? t('wl.ofdm.cp.ok') : t('wl.ofdm.cp.bad')}
          tone={d.cpSufficient ? 'ok' : 'warn'}
        />
        <TheoryBox>
          The cyclic prefix (shaded) copies the tail of the symbol to the front. As long as it is at
          least as long as the channel delay spread, the multipath leaves the body of the symbol as a
          clean circular convolution — so each subcarrier sees a single complex gain and no
          inter-symbol interference. Shorten it below the delay spread to break that condition.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.ofdm.channel.title')}>
        <Canvas
          height={200}
          ariaLabel="channel frequency response magnitude across subcarriers"
          deps={[d]}
          draw={(ctx, w, h) => {
            const yMax = Math.max(0.01, ...d.channelMag);
            const ax = {
              x: linScale([0, d.N - 1], [36, w - 8]),
              y: linScale([0, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, d.N - 1]);
            drawLine(ctx, ax, subIdx, d.channelMag, CHART.orange, 1.8);
          }}
        />
        <Formula tex="H[k] = \mathrm{FFT}\{h\}[k],\qquad Y[k] = H[k]\,X[k] + n[k]" />
        <TheoryBox>
          A frequency-selective channel has deep notches — some subcarriers arrive strong, others
          almost vanish. OFDM turns one hard wideband channel into N easy narrowband ones, each with
          its own flat gain H[k].
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.ofdm.preeq.title')}>
        <Canvas
          height={240}
          ariaLabel="received subcarrier constellation before equalization"
          deps={[d]}
          draw={(ctx, w, h) => {
            const lim = 1.8;
            const ax = {
              x: linScale([-lim, lim], [36, w - 8]),
              y: linScale([-lim, lim], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [-lim, lim]);
            drawScatter(ctx, ax, reX, imX, CHART.orange, 2.5);
          }}
        />
        <TheoryBox>
          Before equalization the subcarrier symbols are smeared around the I/Q plane: each is scaled
          and rotated by its own channel gain H[k]. The four QPSK clouds are unrecognisable.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.ofdm.posteq.title')}>
        <Canvas
          height={240}
          ariaLabel="subcarrier constellation after one-tap equalization"
          deps={[d]}
          draw={(ctx, w, h) => {
            const lim = 1.8;
            const ax = {
              x: linScale([-lim, lim], [36, w - 8]),
              y: linScale([-lim, lim], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [-lim, lim]);
            drawScatter(ctx, ax, refRe, refIm, CHART.dim, 4); // ideal QPSK reference
            drawScatter(ctx, ax, reXeq, imXeq, CHART.green, 2.5);
          }}
        />
        <Readout label={t('wl.ofdm.readout.evm')} value={d.evmPostEq.toFixed(3)} />
        <Formula tex="\hat{X}[k] = \dfrac{Y[k]}{H[k]}" />
        <TheoryBox>
          Dividing each subcarrier by its own gain (one complex multiply per subcarrier) snaps the
          clouds back onto the four QPSK reference points (grey). With a sufficient cyclic prefix the
          residual error is just noise — and noise is amplified on the deep-fade subcarriers, the
          zero-forcing penalty. Drop the cyclic prefix below the delay spread and inter-carrier
          interference scatters the points even without noise.
        </TheoryBox>
      </Panel>
    </>
  );
}
