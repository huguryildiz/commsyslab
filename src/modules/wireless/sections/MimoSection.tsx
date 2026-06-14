import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_MIMO_PARAMS, deriveMimo, type MimoParams } from '../mimo-model';
import { MimoControls } from '../mimo-panels';

const BER_FLOOR = 1e-6;

export function MimoSection() {
  const [params, setParams] = useState<MimoParams>(DEFAULT_MIMO_PARAMS);
  const set = (patch: Partial<MimoParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveMimo(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);
  // Capacity at 10 dB for the readout (snrSweep is 0..30 step 1 → index 10).
  const capAt10 = d.capMimo[10];

  return (
    <>
      <MimoControls params={params} set={set} />

      <Panel title={t('wl.mimo.ber.title')}>
        <Canvas
          height={240}
          ariaLabel="bit error rate versus Eb/N0 for Alamouti diversity"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.ebN0Sweep;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.berSiso.map(clampBer), CHART.dim, 1.4);
            drawLine(ctx, ax, x, d.berAlamouti21.map(clampBer), CHART.green, 2);
            drawLine(ctx, ax, x, d.berAlamouti22.map(clampBer), CHART.orange, 2);
          }}
        />
        <Readout label={t('wl.mimo.readout.divSiso')} value="1" />
        <Readout label={t('wl.mimo.readout.divAlamouti')} value="2·N_r" />
        <Formula tex="P_b^{\text{Alamouti}} = P_b^{\text{MRC}}(\bar\gamma_b/2,\; 2N_r)" />
        <TheoryBox>
          Grey is SISO (single antenna, diversity order 1); green is Alamouti 2×1 (order 2); orange is
          Alamouti 2×2 (order 4). Two transmit antennas split the power — a 3 dB penalty — but the
          space-time code multiplies the diversity, so each curve falls off far more steeply than SISO.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.mimo.cap.title')}>
        <Canvas
          height={240}
          ariaLabel="ergodic capacity versus SNR for SISO, SIMO and MIMO"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.snrSweep;
            const yMax = Math.max(...d.capMimo, 1) * 1.1;
            const ax = {
              x: linScale([x[0], x[x.length - 1]], [36, w - 8]),
              y: linScale([0, yMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [x[0], x[x.length - 1]]);
            drawLine(ctx, ax, x, d.capSiso, CHART.dim, 1.4);
            drawLine(ctx, ax, x, d.capSimo, CHART.blue, 1.6, true);
            drawLine(ctx, ax, x, d.capMimo, CHART.green, 2);
          }}
        />
        <Readout label={t('wl.mimo.readout.capAt')} value={capAt10.toFixed(2)} unit="bit/s/Hz" />
        <Formula tex="C = \log_2\det\!\left(I + \tfrac{\rho}{N_t}\,H H^{\mathsf H}\right)" />
        <TheoryBox>
          Grey is SISO (1×1); the dashed blue line is SIMO (1×N_r — receive diversity, an array-gain
          shift); green is MIMO (N_t×N_r). Only when both ends have multiple antennas does the slope
          itself increase — at high SNR capacity grows like min(N_t, N_r)·log₂(ρ), the spatial-
          multiplexing gain. Capacity is an average over {params.trials} random channels (seed {params.seed}).
        </TheoryBox>
      </Panel>
    </>
  );
}
