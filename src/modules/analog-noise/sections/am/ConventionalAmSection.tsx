import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { amSignal, amEnvelope, envelopeDetect, amEfficiency } from '@/lib/dsp/analog';
import { quadratureNoise, outputSnrDb, demodulationGainDb } from '@/lib/dsp/analognoise';
import { makeRng } from '@/lib/dsp/random';
import type { AmSectionProps } from '../AmNoiseTab';
import { Legend, Metric } from '../shared';

const PAD = { l: 44, r: 12, t: 12, b: 30 };
const FC = 40;
const A_DEFAULT = 0.5;

/** §6.1.4 — conventional AM: envelope detection, efficiency η, threshold effect. */
export function ConventionalAmSection({ gammaDb, fm, fs, N, W, channel }: AmSectionProps) {
  const [a, setA] = useState(A_DEFAULT);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setA(A_DEFAULT);
    setResetKey((k) => k + 1);
  };

  const data = useMemo(() => {
    const msg = [{ amp: 1, freq: fm }];
    const ts = new Array<number>(N);
    const u = new Array<number>(N);
    const refEnv = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      const time = i / fs;
      ts[i] = time;
      u[i] = amSignal('conventional', msg, FC, 1, a, time);
      refEnv[i] = amEnvelope(msg, 1, a, time);
    }
    const pr = u.reduce((s, v) => s + v * v, 0) / N;
    const sigma = Math.sqrt(pr / 10 ** (gammaDb / 10));
    const { nc, ns } = quadratureNoise(
      N,
      sigma,
      makeRng(Math.round(gammaDb * 7 + fm * 13 + a * 31 + 3)),
      4,
    );
    const r = u.map(
      (v, i) =>
        v +
        nc[i] * Math.cos((2 * Math.PI * FC * i) / fs) -
        ns[i] * Math.sin((2 * Math.PI * FC * i) / fs),
    );
    const env = envelopeDetect(r, fs, 2 / FC);
    const envMean = env.reduce((s, v) => s + v, 0) / N;
    const recovered = env.map((v) => v - envMean);
    const refMsg = refEnv.map((v) => v - 1); // a·m_n(t)
    return { ts, r, env, refEnv, recovered, refMsg };
  }, [gammaDb, fm, fs, N, a]);

  const sp = { amIndex: a, beta: 0, messagePower: 0.5, emphasis: false, W };
  const eta = amEfficiency(a, 0.5);
  const snrO = outputSnrDb('am', gammaDb, sp);
  const gain = demodulationGainDb('am', sp);
  const belowThreshold = gammaDb < 10;

  const t1 = (N - 1) / fs;
  const [lo, hi, onWheel, , onPan] = useZoom(0, t1, {
    minSpan: t1 / 8,
    maxSpan: t1,
    clampMin: 0,
    clampMax: t1,
  });
  const ampR = useMemo(() => Math.max(1.2, ...data.r.map(Math.abs)) * 1.1, [data]);
  const ampM = useMemo(
    () => Math.max(0.2, ...data.recovered.map(Math.abs), ...data.refMsg.map(Math.abs)) * 1.2,
    [data],
  );

  const drawEnv = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-ampR, ampR], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$r(t)$',
      domainY: [-ampR, ampR],
    });
    drawLine(ctx, ax, data.ts, data.r, alpha(CHART.orange, 0.55), 1);
    drawLine(ctx, ax, data.ts, data.refEnv, CHART.green, 2);
    drawLine(ctx, ax, data.ts, data.env, CHART.cyan, 1.6);
  };
  const drawMsg = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-ampM, ampM], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$\\hat m(t)$',
      domainY: [-ampM, ampM],
    });
    drawLine(ctx, ax, data.ts, data.recovered, CHART.orange, 1.3);
    drawLine(ctx, ax, data.ts, data.refMsg, CHART.green, 2);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          {channel}
          <Panel title={t('an.cam.title')}>
            <Slider
              label={<HintText text={t('an.cam.aIndex')} />}
              min={0.1}
              max={1}
              step={0.05}
              value={a}
              onChange={setA}
            />
            <p className="an__hint">
              <HintText text={t('an.cam.note')} />
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
            <Metric label={<HintText text="$\eta$" />} value={(eta * 100).toFixed(1)} unit="%" />
            <Metric label={<HintText text="$(S/N)_o$" />} value={snrO.toFixed(1)} unit="dB" />
            <Metric label={t('an.dsb.gain')} value={gain.toFixed(1)} unit="dB" />
          </div>
          {belowThreshold && (
            <p className="an__warn">
              <HintText text={t('an.cam.threshold')} />
            </p>
          )}
          <Panel title={t('an.cam.envPanel')}>
            <Canvas
              height={200}
              draw={drawEnv}
              deps={[data, lo, hi, ampR]}
              ariaLabel="Conventional AM received signal and envelope detector output"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('an.cam.trace.refEnv') },
                { color: CHART.cyan, label: t('an.cam.trace.detEnv') },
                { color: CHART.orange, label: t('an.cam.trace.r') },
              ]}
            />
          </Panel>
          <Panel title={t('an.cam.msgPanel')}>
            <Canvas
              height={180}
              draw={drawMsg}
              deps={[data, lo, hi, ampM]}
              ariaLabel="Recovered message after DC block"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('an.cam.trace.refMsg') },
                { color: CHART.orange, label: t('an.cam.trace.recovered') },
              ]}
            />
            <Formula
              tex="\eta=\dfrac{a^2 P_{M_n}}{1+a^2 P_{M_n}},\quad \left(\tfrac{S}{N}\right)_o=\eta\left(\tfrac{S}{N}\right)_b"
              block
            />
          </Panel>

        </div>
      </div>
    </div>
  );
}
