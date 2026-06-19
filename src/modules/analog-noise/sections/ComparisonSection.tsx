import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { outputSnrDb, type AnalogScheme } from '@/lib/dsp/analognoise';
import { linspace } from '@/lib/dsp/math';
import { Legend } from './shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const W = 15000;
const SCHEMES: { key: AnalogScheme; label: string; color: string }[] = [
  { key: 'dsb', label: 'DSB-SC', color: CHART.green },
  { key: 'ssb', label: 'SSB', color: CHART.blue },
  { key: 'am', label: 'Conv. AM', color: CHART.orange },
  { key: 'fm', label: 'FM', color: CHART.pink },
  { key: 'pm', label: 'PM', color: CHART.cyan },
];

/** §6.3 — comparison of analog-modulation systems: SNR curves + summary table. */
export function ComparisonSection() {
  const [beta, setBeta] = useState(5);
  const [a, setA] = useState(0.8);
  const [pmn, setPmn] = useState(0.5);
  const [gammaDb, setGammaDb] = useState(20);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setBeta(5);
    setA(0.8);
    setPmn(0.5);
    setGammaDb(20);
    setResetKey((k) => k + 1);
  };

  const data = useMemo(() => {
    const gamma = linspace(0, 40, 161);
    const sp = { amIndex: a, beta, messagePower: pmn, emphasis: false, W };
    const curves = SCHEMES.map((s) => ({ ...s, y: gamma.map((g) => outputSnrDb(s.key, g, sp)) }));
    const yMax = Math.max(...curves.flatMap((c) => c.y)) + 3;
    const yMin = Math.min(0, ...curves.flatMap((c) => c.y)) - 2;
    return { gamma, curves, yMax, yMin };
  }, [beta, a, pmn]);

  const [lo, hi, onWheel, , onPan] = useZoom(0, 40, {
    minSpan: 8,
    maxSpan: 40,
    clampMin: 0,
    clampMax: 40,
  });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([data.yMin, data.yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$\\gamma\\,(\\mathrm{dB})$',
      yLabel: '$(S/N)_o\\,(\\mathrm{dB})$',
      domainY: [data.yMin, data.yMax],
    });
    for (const c of data.curves) drawLine(ctx, ax, data.gamma, c.y, c.color, 1.8);
    drawVLine(ctx, ax, gammaDb, data.yMin, data.yMax, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.cmp.title')}>
            <Slider
              label={<HintText text="$\\beta$" />}
              min={1}
              max={10}
              step={1}
              value={beta}
              onChange={setBeta}
            />
            <Slider
              label={<HintText text="AM index $a$" />}
              min={0.1}
              max={1}
              step={0.05}
              value={a}
              onChange={setA}
            />
            <Slider
              label={<HintText text="$P_{M_n}$" />}
              min={0.1}
              max={1}
              step={0.05}
              value={pmn}
              onChange={setPmn}
            />
            <Slider
              label={<HintText text="$\\gamma$" />}
              min={0}
              max={40}
              step={1}
              unit="dB"
              value={gammaDb}
              onChange={setGammaDb}
            />
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content" key={resetKey}>
          <Panel title={t('an.cmp.plot')}>
            <Canvas
              height={250}
              draw={draw}
              deps={[data, gammaDb, lo, hi]}
              ariaLabel="Output SNR vs baseband SNR for all schemes"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend entries={SCHEMES.map((s) => ({ color: s.color, label: s.label }))} />
            <Formula
              tex="B_{\mathrm{FM}}=2(\beta+1)W,\quad \left(\tfrac{S}{N}\right)_{o,\mathrm{FM}}=3\beta^2 P_{M_n}\left(\tfrac{S}{N}\right)_b"
              block
            />
          </Panel>
          <Panel title={t('an.cmp.tableTitle')}>
            <div className="an__table-wrap">
              <table className="an__table">
                <thead>
                  <tr>
                    <th>Scheme</th>
                    <th>Channel BW</th>
                    <th>
                      <HintText text="$(S/N)_o$ vs baseline" />
                    </th>
                    <th>Receiver</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['DSB-SC', '$2W$', '$=(S/N)_b$', 'Coherent'],
                    ['SSB-SC', '$W$', '$=(S/N)_b$', 'Coherent'],
                    ['Conventional AM', '$2W$', '$\\eta\\,(S/N)_b,\\ \\eta<1$', 'Envelope'],
                    ['VSB', '$\\sim W\\text{–}2W$', '$\\approx(S/N)_b$', 'Coherent'],
                    ['FM', '$2(\\beta+1)W$', '$3\\beta^2 P_{M_n}(S/N)_b$', 'Discriminator'],
                    ['PM', '$2(\\beta+1)W$', '$\\beta^2 P_{M_n}(S/N)_b$', 'Discriminator'],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td>{row[0]}</td>
                      <td>
                        <HintText text={row[1]} />
                      </td>
                      <td>
                        <HintText text={row[2]} />
                      </td>
                      <td>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
