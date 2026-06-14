import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_CDMA_PARAMS, deriveCdma, type CdmaParams } from '../cdma-model';
import { CdmaControls } from '../cdma-panels';

const BER_FLOOR = 1e-6;

export function CdmaSection() {
  const [params, setParams] = useState<CdmaParams>(DEFAULT_CDMA_PARAMS);
  const set = (patch: Partial<CdmaParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveCdma(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);

  return (
    <>
      <CdmaControls params={params} set={set} />

      <Panel title={t('wl.cdma.users.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus number of users"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.userSweep;
            const ax = {
              x: linScale([1, x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [1, x[x.length - 1]]);
            // Target-BER line and the user-capacity marker.
            drawLine(ctx, ax, [1, x[x.length - 1]], [d.targetBer, d.targetBer], CHART.dim, 1.2, true);
            if (d.capacity >= 1) drawVLine(ctx, ax, d.capacity, BER_FLOOR, 0.5, CHART.orange, true);
            drawLine(ctx, ax, x, d.berVsUsers.map(clampBer), CHART.green, 2);
          }}
        />
        <Readout label={t('wl.cdma.readout.sir')} value={d.sirDb.toFixed(1)} unit="dB" />
        <Readout label={t('wl.cdma.readout.capacity')} value={`${d.capacity}`} />
        <Formula tex="\mathrm{SIR} = \dfrac{3L_c}{(N_u-1)\,\Gamma}" />
        <TheoryBox>
          Every extra user adds interference, so the BER (green) climbs with the user count until it
          crosses the target (dashed line) — the orange marker is the user capacity. A larger processing
          gain L_c spreads each user further and pushes that cliff to the right: CDMA capacity is
          interference-limited, not bandwidth-limited.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.cdma.ebn0.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus Eb over N0 comparing power control and near-far"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.ebN0Sweep;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.berNf.map(clampBer), CHART.red, 1.8, true);
            drawLine(ctx, ax, x, d.berPc.map(clampBer), CHART.green, 2);
          }}
        />
        <Readout label={t('wl.cdma.readout.ber')} value={d.berAtOp.toExponential(2)} />
        <Formula tex="P_e = Q\!\left(\sqrt{\mathrm{SINR}}\right),\ \tfrac{1}{\mathrm{SINR}}=\tfrac{(N_u-1)\Gamma}{3L_c}+\tfrac{1}{2\gamma_b}" />
        <TheoryBox>
          Green is perfect power control (every user received at equal power, Γ=1); red dashed is the
          near-far case, where one strong interferer (Γ&gt;0 dB) swamps the others and the BER floors
          out no matter how much E_b/N₀ you add. This is why CDMA systems rely on tight, fast
          transmit-power control — the near-far problem is their defining vulnerability.
        </TheoryBox>
      </Panel>
    </>
  );
}
