import { Panel, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, drawScatter } from '@/lib/plot/draw';
import { bscCapacity, shannonCapacity, snrDbToLinear } from '@/lib/dsp/capacity';
import { binaryEntropy } from '@/lib/dsp/entropy';
import { useState } from 'react';
import { t } from '@/i18n';

export function CapacitySection() {
  const [eps, setEps] = useState(0.1);
  const [bw, setBw] = useState(1000);
  const [snrDb, setSnrDb] = useState(10);
  const snr = snrDbToLinear(snrDb);

  return (
    <div className="it-section">
      <aside className="it-controls">
        <Panel title={t('it.cap.bsc')}>
          <Slider label={t('it.cap.eps')} value={eps} min={0} max={1} step={0.01} onChange={setEps} />
          <Readout label={t('it.cap.hb')} value={binaryEntropy(eps).toFixed(3)} />
          <Readout label={t('it.cap.cbsc')} value={bscCapacity(eps).toFixed(3)} unit="bits" tone="ok" />
        </Panel>
        <Panel title={t('it.cap.shannon')}>
          <Slider label={t('it.cap.bw')} value={bw} min={100} max={10000} step={100} unit="Hz" onChange={setBw} />
          <Slider label={t('it.cap.snr')} value={snrDb} min={-10} max={40} step={1} unit="dB" onChange={setSnrDb} />
          <Readout label={t('it.cap.cshannon')} value={shannonCapacity(bw, snr).toFixed(0)} unit="bits/s" tone="ok" />
        </Panel>
      </aside>

      <div className="it-content">
        <Panel title={t('it.cap.curveBsc')}>
          <Canvas
            height={220}
            ariaLabel="BSC capacity versus crossover probability"
            deps={[eps]}
            draw={(ctx, w, h) => {
              const ax = { x: linScale([0, 1], [30, w - 10]), y: linScale([0, 1.05], [h - 20, 10]) };
              drawAxes(ctx, ax, [0, 1]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let i = 0; i <= 100; i++) {
                xs.push(i / 100);
                ys.push(bscCapacity(i / 100));
              }
              drawLine(ctx, ax, xs, ys, '#4aa3ff', 2);
              drawVLine(ctx, ax, eps, 0, 1.05, 'rgba(255,180,84,0.9)', true, 1.5);
              drawScatter(ctx, ax, [eps], [bscCapacity(eps)], '#ffb454', 4);
            }}
          />
        </Panel>
        <Panel title={t('it.cap.curveShannon')}>
          <Canvas
            height={220}
            ariaLabel="Shannon capacity versus SNR"
            deps={[bw, snrDb]}
            draw={(ctx, w, h) => {
              const cMax = shannonCapacity(bw, snrDbToLinear(40)) * 1.05;
              const ax = { x: linScale([-10, 40], [34, w - 10]), y: linScale([0, cMax], [h - 20, 10]) };
              drawAxes(ctx, ax, [-10, 40]);
              const xs: number[] = [];
              const ys: number[] = [];
              for (let d = -10; d <= 40; d++) {
                xs.push(d);
                ys.push(shannonCapacity(bw, snrDbToLinear(d)));
              }
              drawLine(ctx, ax, xs, ys, '#46c93a', 2);
              drawVLine(ctx, ax, snrDb, 0, cMax, 'rgba(255,180,84,0.9)', true, 1.5);
              drawScatter(ctx, ax, [snrDb], [shannonCapacity(bw, snr)], '#ffb454', 4);
            }}
          />
        </Panel>
        <TheoryBox title={t('it.theory.title')}>
          <p>
            <Formula tex="C_{\mathrm{BSC}}=1-H_b(\varepsilon),\qquad H_b(\varepsilon)=-\varepsilon\log_2\varepsilon-(1-\varepsilon)\log_2(1-\varepsilon)" block />
          </p>
          <p>
            <Formula tex="C=B\log_2\!\left(1+\mathrm{SNR}\right)\ \text{bits/s}\qquad C=\max_{p(x)} I(X;Y)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
