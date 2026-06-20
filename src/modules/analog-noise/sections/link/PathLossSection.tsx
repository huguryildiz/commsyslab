import { useCallback, useMemo, useState } from 'react';
import { Panel, Slider, Segmented, Formula, HintText, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { freeSpacePathLossDb, cableLossDb } from '@/lib/dsp/linkbudget';
import { linspace } from '@/lib/dsp/math';
import { Metric } from '../shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const DMAX = 50; // km
type Medium = 'free' | 'cable';

/** §6.4.3 — transmission loss: free-space (4πd/λ)² vs cable dB/km. */
export function PathLossSection() {
  const [medium, setMedium] = useState<Medium>('free');
  const [dKm, setDKm] = useState(10);
  const [fMhz, setFMhz] = useState(100);
  const [dbPerKm, setDbPerKm] = useState(2);
  const [ptDbw, setPtDbw] = useState(30);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setMedium('free');
    setDKm(10);
    setFMhz(100);
    setDbPerKm(2);
    setPtDbw(30);
    setResetKey((k) => k + 1);
  };

  const lossAt = useCallback(
    (d: number) =>
      medium === 'free' ? freeSpacePathLossDb(fMhz * 1e6, d * 1000) : cableLossDb(d, dbPerKm),
    [medium, fMhz, dbPerKm],
  );

  const data = useMemo(() => {
    const ds = linspace(0.1, DMAX, 200);
    return { ds, loss: ds.map(lossAt) };
  }, [lossAt]);

  const lossNow = lossAt(dKm);
  const prDbw = ptDbw - lossNow;

  const [lo, hi, onWheel, , onPan] = useZoom(0, DMAX, {
    minSpan: 5,
    maxSpan: DMAX,
    clampMin: 0,
    clampMax: DMAX,
  });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const yMax = Math.max(...data.loss) * 1.05;
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$d\\,(\\mathrm{km})$',
      yLabel: '$L\\,(\\mathrm{dB})$',
      domainY: [0, yMax],
    });
    drawLine(ctx, ax, data.ds, data.loss, CHART.orange, 2);
    drawVLine(ctx, ax, dKm, 0, yMax, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.pathloss.title')}>
            <Segmented<Medium>
              ariaLabel={t('an.pathloss.medium')}
              value={medium}
              options={[
                { value: 'free', label: t('an.pathloss.free') },
                { value: 'cable', label: t('an.pathloss.cable') },
              ]}
              onChange={setMedium}
            />
            <Slider
              label={<HintText text={t('an.pathloss.dist')} />}
              min={0.1}
              max={DMAX}
              step={0.1}
              unit="km"
              value={dKm}
              onChange={setDKm}
            />
            {medium === 'free' && (
              <Slider
                label={<HintText text={t('an.pathloss.freq')} />}
                min={1}
                max={3000}
                step={1}
                unit="MHz"
                value={fMhz}
                onChange={setFMhz}
              />
            )}
            {medium === 'cable' && (
              <Slider
                label={<HintText text={t('an.pathloss.dbkm')} />}
                min={0.5}
                max={10}
                step={0.5}
                unit="dB/km"
                value={dbPerKm}
                onChange={setDbPerKm}
              />
            )}
            <Slider
              label={<HintText text={t('an.pathloss.pt')} />}
              min={-30}
              max={60}
              step={1}
              unit="dBW"
              value={ptDbw}
              onChange={setPtDbw}
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
            <Metric label={<HintText text="$L$" />} value={lossNow.toFixed(1)} unit="dB" />
            <Metric label={<HintText text="$P_R$" />} value={prDbw.toFixed(1)} unit="dBW" />
          </div>
          <Panel title={<HintText text={t('an.pathloss.plot')} />}>
            <Canvas
              height={230}
              draw={draw}
              deps={[data, dKm, lo, hi]}
              ariaLabel="Transmission loss versus distance"
              onWheel={onWheel}
              onPan={onPan}
            />
          </Panel>
          <div className="info-cards">
            <InfoCard title={t('an.pathloss.c1.t')} accent="green">
              <HintText text={t('an.pathloss.c1.b')} />
              <Formula tex="L=\left(\dfrac{4\pi d}{\lambda}\right)^2,\quad \lambda=c/f" block />
            </InfoCard>
            <InfoCard title={t('an.pathloss.c2.t')} accent="orange">
              <HintText text={t('an.pathloss.c2.b')} />
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
