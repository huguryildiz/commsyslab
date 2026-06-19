import { useMemo, useState } from 'react';
import { Panel, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { amSignal } from '@/lib/dsp/analog';
import { evalSignal } from '@/lib/dsp/signals';
import {
  coherentDemod,
  quadratureNoise,
  outputSnrDb,
  demodulationGainDb,
} from '@/lib/dsp/analognoise';
import { makeRng } from '@/lib/dsp/random';
import type { AmSectionProps } from '../AmNoiseTab';
import { Legend, Metric } from '../shared';

const PAD = { l: 44, r: 12, t: 12, b: 30 };
const FC = 40;

/** §6.1.3 — SSB: same output SNR as DSB-SC/baseband but half the bandwidth. */
export function SsbSection({ gammaDb, fm, fs, N, W, channel }: AmSectionProps) {
  const [resetKey, setResetKey] = useState(0);
  const reset = () => setResetKey((k) => k + 1);

  const data = useMemo(() => {
    const msg = [{ amp: 1, freq: fm }];
    const ts = new Array<number>(N);
    const u = new Array<number>(N);
    const m = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      const time = i / fs;
      ts[i] = time;
      u[i] = amSignal('ssb-usb', msg, FC, 1, 0, time);
      m[i] = evalSignal(msg, time);
    }
    const pr = u.reduce((s, v) => s + v * v, 0) / N;
    const sigma = Math.sqrt(pr / 10 ** (gammaDb / 10));
    const { nc, ns } = quadratureNoise(N, sigma, makeRng(Math.round(gammaDb * 7 + fm * 13 + 9)), 6);
    const r = u.map(
      (v, i) =>
        v +
        nc[i] * Math.cos((2 * Math.PI * FC * i) / fs) -
        ns[i] * Math.sin((2 * Math.PI * FC * i) / fs),
    );
    const y = coherentDemod(r, FC, fs, 16);
    return { ts, u, m, r, y };
  }, [gammaDb, fm, fs, N]);

  const sp = { amIndex: 0, beta: 0, messagePower: 0.5, emphasis: false, W };
  const snrO = outputSnrDb('ssb', gammaDb, sp);
  const gain = demodulationGainDb('ssb', sp);

  const t1 = (N - 1) / fs;
  const [lo, hi, onWheel, , onPan] = useZoom(0, t1, {
    minSpan: t1 / 8,
    maxSpan: t1,
    clampMin: 0,
    clampMax: t1,
  });
  const ampR = useMemo(() => Math.max(1, ...data.r.map(Math.abs)) * 1.1, [data]);
  const ampY = useMemo(
    () => Math.max(1, ...data.y.map(Math.abs), ...data.m.map(Math.abs)) * 1.1,
    [data],
  );

  const drawPassband = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-ampR, ampR], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$r(t)$',
      domainY: [-ampR, ampR],
    });
    drawLine(ctx, ax, data.ts, data.r, CHART.orange, 1);
    drawLine(ctx, ax, data.ts, data.u, alpha(CHART.dim, 0.9), 1);
  };
  const drawOutput = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-ampY, ampY], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$y(t)$',
      domainY: [-ampY, ampY],
    });
    drawLine(ctx, ax, data.ts, data.y, CHART.orange, 1.2);
    drawLine(ctx, ax, data.ts, data.m, CHART.green, 2);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          {channel}
          <Panel title={t('an.ssb.title')}>
            <p className="an__hint">
              <HintText text={t('an.ssb.note')} />
            </p>
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content" key={resetKey}>
          <div className="an__readouts">
            <Metric label={<HintText text="$(S/N)_o$" />} value={snrO.toFixed(1)} unit="dB" />
            <Metric label={t('an.dsb.gain')} value={gain.toFixed(1)} unit="dB" />
            <Metric label={t('an.dsb.bw')} value="W" />
          </div>
          <Panel title={<HintText text={t('an.dsb.passband')} />}>
            <Canvas
              height={180}
              draw={drawPassband}
              deps={[data, lo, hi, ampR]}
              ariaLabel="SSB received passband signal"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.orange, label: t('an.dsb.trace.r') },
                { color: CHART.dim, label: t('an.dsb.trace.u') },
              ]}
            />
          </Panel>
          <Panel title={<HintText text={t('an.dsb.output')} />}>
            <Canvas
              height={200}
              draw={drawOutput}
              deps={[data, lo, hi, ampY]}
              ariaLabel="SSB coherently demodulated output"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('an.dsb.trace.m') },
                { color: CHART.orange, label: t('an.dsb.trace.y') },
              ]}
            />
            <Formula
              tex="\left(\tfrac{S}{N}\right)_o=\left(\tfrac{S}{N}\right)_b,\quad B_{\mathrm{SSB}}=W=\tfrac12 B_{\mathrm{DSB}}"
              block
            />
          </Panel>

        </div>
      </div>
    </div>
  );
}
