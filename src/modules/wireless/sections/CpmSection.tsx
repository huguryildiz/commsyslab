import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_CPM_PARAMS, deriveCpm, type CpmParams } from '../cpm-model';
import { CpmControls } from '../cpm-panels';

export function CpmSection() {
  const [params, setParams] = useState<CpmParams>(DEFAULT_CPM_PARAMS);
  const set = (patch: Partial<CpmParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveCpm(params), [params]);

  return (
    <>
      <CpmControls params={params} set={set} />

      <Panel title={t('wl.cpm.tree.title')}>
        <Canvas
          height={240}
          ariaLabel="CPFSK phase tree"
          deps={[d]}
          draw={(ctx, w, h) => {
            const tMax = params.treeDepth;
            let pMax = 0.5;
            for (const traj of d.phaseTree) for (const v of traj) pMax = Math.max(pMax, Math.abs(v));
            const ax = {
              x: linScale([0, tMax], [36, w - 8]),
              y: linScale([-pMax, pMax], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, tMax]);
            for (const traj of d.phaseTree) {
              drawLine(ctx, ax, d.treeTime, traj, CHART.green, 1);
            }
          }}
        />
        <Readout label={t('wl.cpm.readout.mode')} value={d.isMsk ? 'MSK (h=½)' : 'CPFSK'} />
        <Readout label={t('wl.cpm.readout.phase')} value={`±${d.peakPhaseDeg.toFixed(0)}`} unit="°" />
        <Formula tex="\phi(t;\mathbf a) = 2\pi h\textstyle\sum_k a_k\,q(t-kT),\quad q(T)=\tfrac12" />
        <TheoryBox>
          Every branch is the carrier phase (in units of π) for one ±1 bit sequence. Because the phase
          ramps continuously and never jumps, the envelope stays constant — kind to power amplifiers.
          Each bit tilts the phase by ±h·180°; at h=½ that is ±90°, which is exactly MSK. Larger h
          fans the tree wider (more bandwidth), smaller h narrows it.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.cpm.psd.title')}>
        <Canvas
          height={240}
          ariaLabel="power spectral density of MSK versus QPSK"
          deps={[d]}
          draw={(ctx, w, h) => {
            const x = d.psdFreqT;
            const ax = {
              x: linScale([0, x[x.length - 1]], [36, w - 8]),
              y: linScale([-60, 3], [h - 18, 12]),
            };
            drawAxes(ctx, ax, [0, x[x.length - 1]]);
            const clamp = (v: number) => Math.max(v, -60);
            drawLine(ctx, ax, x, d.qpskPsd.map(clamp), CHART.orange, 1.6);
            drawLine(ctx, ax, x, d.mskPsd.map(clamp), CHART.green, 2);
          }}
        />
        <Formula tex="S_{\text{MSK}}(f)\propto\left(\dfrac{\cos 2\pi fT}{1-16f^2T^2}\right)^2" />
        <TheoryBox>
          Green is MSK, orange is QPSK (vs normalized frequency f·T). MSK's main lobe is wider, but its
          sidelobes plunge as f⁻⁴ versus QPSK's f⁻², so MSK leaks far less power into neighbouring
          channels — why constant-envelope CPM is favoured where spectral containment and efficient,
          non-linear amplifiers matter (e.g. GSM's GMSK).
        </TheoryBox>
      </Panel>
    </>
  );
}
