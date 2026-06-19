import { useMemo, useState } from 'react';
import { Panel, Slider, Segmented, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { angleNoisePsd, demodulationGainDb } from '@/lib/dsp/analognoise';
import { linspace } from '@/lib/dsp/math';
import { Metric } from '../shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const W = 15000; // audio bandwidth (Hz)
type Scheme = 'fm' | 'pm';

/** §6.2 — output-noise PSD (parabolic FM vs flat PM) and the SNR gain. */
export function NoisePsdSection() {
  const [scheme, setScheme] = useState<Scheme>('fm');
  const [beta, setBeta] = useState(5);
  const [pmn, setPmn] = useState(0.5);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setScheme('fm');
    setBeta(5);
    setPmn(0.5);
    setResetKey((k) => k + 1);
  };

  const data = useMemo(() => {
    const freqs = linspace(0, W, 200);
    const psd = angleNoisePsd(freqs, scheme, 1, 1);
    const max = Math.max(...psd, 1e-12);
    return { fk: freqs.map((f) => f / 1000), norm: psd.map((v) => v / max) };
  }, [scheme]);

  const sp = { amIndex: 0, beta, messagePower: pmn, emphasis: false, W };
  const gain = demodulationGainDb(scheme, sp);

  const wk = W / 1000;
  const [lo, hi, onWheel, , onPan] = useZoom(0, wk, {
    minSpan: wk / 8,
    maxSpan: wk,
    clampMin: 0,
    clampMax: wk,
  });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.1], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: '$S_n(f)\\ (\\mathrm{norm.})$',
      domainY: [0, 1.1],
    });
    drawLine(ctx, ax, data.fk, data.norm, scheme === 'fm' ? CHART.pink : CHART.blue, 2.2);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.psd.title')}>
            <Segmented<Scheme>
              ariaLabel={t('an.psd.scheme')}
              value={scheme}
              options={[
                { value: 'fm', label: 'FM' },
                { value: 'pm', label: 'PM' },
              ]}
              onChange={setScheme}
            />
            <Slider
              label={<HintText text="$\\beta$" />}
              min={1}
              max={15}
              step={1}
              value={beta}
              onChange={setBeta}
            />
            <Slider
              label={<HintText text="$P_{M_n}$" />}
              min={0.1}
              max={1}
              step={0.05}
              value={pmn}
              onChange={setPmn}
            />
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content" key={resetKey}>
          <div className="an__readouts">
            <Metric label={<HintText text="$(S/N)_o$ gain" />} value={gain.toFixed(1)} unit="dB" />
          </div>
          <Panel title={t('an.psd.plot')}>
            <Canvas
              height={230}
              draw={draw}
              deps={[data, lo, hi]}
              ariaLabel="Angle-modulation output noise PSD"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Formula
              tex="S_n(f)=\dfrac{N_0 f^2}{A_c^2}\;(\mathrm{FM}),\qquad \dfrac{N_0}{A_c^2}\;(\mathrm{PM})"
              block
            />
            <Formula
              tex="\left(\tfrac{S}{N}\right)_o=3\beta^2 P_{M_n}\left(\tfrac{S}{N}\right)_b\;(\mathrm{FM}),\qquad \beta^2 P_{M_n}\left(\tfrac{S}{N}\right)_b\;(\mathrm{PM})"
              block
            />
          </Panel>

        </div>
      </div>
    </div>
  );
}
