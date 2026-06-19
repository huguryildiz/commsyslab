import { useMemo, useState } from 'react';
import { Panel, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { lowpassMA } from '@/lib/dsp/analognoise';
import { gaussian } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/dsp/random';
import type { AmSectionProps } from '../AmNoiseTab';
import { Legend, Metric } from '../shared';

const PAD = { l: 44, r: 12, t: 12, b: 30 };
const MSG_POWER = 0.5; // single-tone normalized message power P_Mn

/** §6.1.1 — baseband reference: the SNR all AM schemes are compared against. */
export function BasebandSection({ gammaDb, fm, fs, N, channel }: AmSectionProps) {
  const [resetKey, setResetKey] = useState(0);
  const reset = () => setResetKey((k) => k + 1);

  const data = useMemo(() => {
    const ts = new Array<number>(N);
    const m = new Array<number>(N);
    for (let i = 0; i < N; i++) {
      ts[i] = i / fs;
      m[i] = Math.sin((2 * Math.PI * fm * i) / fs);
    }
    const sigma = Math.sqrt(MSG_POWER / 10 ** (gammaDb / 10));
    const rng = makeRng(Math.round(gammaDb * 7 + fm * 13 + 1));
    const noise = lowpassMA(
      Array.from({ length: N }, () => sigma * gaussian(rng)),
      8,
    );
    const noisy = m.map((v, i) => v + noise[i]);
    return { ts, m, noisy };
  }, [gammaDb, fm, fs, N]);

  const t1 = (N - 1) / fs;
  const [lo, hi, onWheel, , onPan] = useZoom(0, t1, {
    minSpan: t1 / 8,
    maxSpan: t1,
    clampMin: 0,
    clampMax: t1,
  });
  const amp = useMemo(() => Math.max(1, ...data.noisy.map(Math.abs)) * 1.1, [data]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-amp, amp], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$m(t)$',
      domainY: [-amp, amp],
    });
    drawLine(ctx, ax, data.ts, data.noisy, CHART.orange, 1.2);
    drawLine(ctx, ax, data.ts, data.m, CHART.green, 2);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          {channel}
          <Panel title={t('an.bb.title')}>
            <p className="an__hint">
              <HintText text={t('an.bb.note')} />
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
            <Metric label={<HintText text="$(S/N)_b$" />} value={gammaDb.toFixed(1)} unit="dB" />
          </div>
          <Panel title={t('an.bb.signal')}>
            <Canvas
              height={220}
              draw={draw}
              deps={[data, lo, hi, amp]}
              ariaLabel="Baseband message and noisy output"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('an.bb.trace.msg') },
                { color: CHART.orange, label: t('an.bb.trace.noisy') },
              ]}
            />
            <Formula tex="\left(\tfrac{S}{N}\right)_b=\dfrac{P_R}{N_0 W}" block />
          </Panel>

        </div>
      </div>
    </div>
  );
}
