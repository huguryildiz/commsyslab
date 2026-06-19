import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { generateEnsemble, thermalNoisePsd, type ProcessParams } from '@/lib/dsp/random';
import { PAD, PlotTitle, Metric, Legend } from '../prob/probShared';
import { FormulaCards, FormulaCard, CardFormula } from '../../cards';

const FS = 200;
const NS = 256;
const DEFAULTS = { n0: 1, temp: 290 };

/** §5.3.2 — white & thermal noise: flat PSD ↔ impulsive autocorrelation. */
export function WhiteNoiseSection() {
  const [n0, setN0] = useState(DEFAULTS.n0);
  const [temp, setTemp] = useState(DEFAULTS.temp);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setN0(DEFAULTS.n0);
    setTemp(DEFAULTS.temp);
    setResetKey((k) => k + 1);
  };

  const sample = useMemo(() => {
    const p: ProcessParams = {
      kind: 'white-gaussian',
      amplitude: 1,
      f0: 5,
      n0,
      fs: FS,
      M: 1,
      N: NS,
      seed: 9,
      filterKind: 'rc',
      cutoff: 20,
    };
    const x = Array.from(generateEnsemble(p)[0]);
    const ts = x.map((_, i) => i / FS);
    return { ts, x };
  }, [n0]);

  const quantum = useMemo(() => {
    const kT = 1.380649e-23 * temp;
    const fs = Array.from({ length: 200 }, (_, i) => (i / 199) * 6e12);
    const norm = fs.map((f) => thermalNoisePsd(f, temp) / kT);
    return { fs, norm };
  }, [temp]);

  const t1 = (NS - 1) / FS;
  const [lo, hi, onWheel, , onPan] = useZoom(0, t1, {
    minSpan: t1 / 8,
    maxSpan: t1,
    clampMin: 0,
    clampMax: t1,
  });
  const amp = useMemo(() => Math.max(0.1, ...sample.x.map(Math.abs)) * 1.15, [sample]);

  const drawSamples = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-amp, amp], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$X(t)$',
      domainY: [-amp, amp],
    });
    drawLine(ctx, ax, sample.ts, sample.x, CHART.green, 1.2);
  };

  const drawPsd = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const level = n0 / 2;
    const yTop = level * 2.2;
    const ax: Axes = {
      x: linScale([-FS / 2, FS / 2], [PAD.l, w - PAD.r]),
      y: linScale([0, yTop], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-FS / 2, FS / 2], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$S_n(f)$',
      domainY: [0, yTop],
    });
    drawLine(ctx, ax, [-FS / 2, FS / 2], [level, level], CHART.blue, 2);
  };

  const drawAcf = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const lvl = n0 / 2;
    const tauMax = 0.2;
    const ax: Axes = {
      x: linScale([-tauMax, tauMax], [PAD.l, w - PAD.r]),
      y: linScale([0, lvl * 1.3], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-tauMax, tauMax], {
      xLabel: '$\\tau\\,(\\mathrm{s})$',
      yLabel: '$R_n(\\tau)$',
      domainY: [0, lvl * 1.3],
    });
    drawStems(ctx, ax, [0], [lvl], CHART.orange, 4);
  };

  const drawQuantum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([0, 6], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.15], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [0, 6], {
      xLabel: '$f\\,(\\mathrm{THz})$',
      yLabel: '$S_n(f)/kT$',
      domainY: [0, 1.15],
    });
    drawLine(ctx, ax, [0, 6], [1, 1], CHART.dim, 1.5, true);
    drawLine(
      ctx,
      ax,
      quantum.fs.map((f) => f / 1e12),
      quantum.norm,
      CHART.blue,
      2,
    );
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.white.controls')}>
            <Slider
              label={<HintText text={t('rp.white.n0')} />}
              min={0.1}
              max={4}
              step={0.1}
              value={n0}
              onChange={setN0}
            />
            <Slider
              label={<HintText text={t('rp.white.temp')} />}
              min={50}
              max={400}
              step={10}
              unit="K"
              value={temp}
              onChange={setTemp}
            />
            <div className="rp__reset">
              <button type="button" onClick={reset}>
                {t('rp.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="rp__content" key={resetKey}>
          <div className="rp__readouts">
            <Metric label={t('rp.white.level')} value={(n0 / 2).toFixed(2)} />
          </div>

          <Panel title={t('rp.white.samples')}>
            <PlotTitle textKey="rp.white.samples" />
            <Canvas
              height={170}
              draw={drawSamples}
              deps={[sample, lo, hi, amp]}
              ariaLabel="White-noise realization"
              onWheel={onWheel}
              onPan={onPan}
            />
          </Panel>

          <Panel title={<HintText text={t('rp.white.psd')} />}>
            <PlotTitle textKey="rp.white.psd" />
            <Canvas
              height={150}
              draw={drawPsd}
              deps={[n0]}
              ariaLabel="Flat white-noise power spectral density"
            />
            <PlotTitle textKey="rp.white.acf" />
            <Canvas
              height={150}
              draw={drawAcf}
              deps={[n0]}
              ariaLabel="Impulsive white-noise autocorrelation"
            />
            <Formula tex="S_n(f)=\tfrac{N_0}{2}\ \xleftrightarrow{\ \mathcal{F}\ }\ R_n(\tau)=\tfrac{N_0}{2}\,\delta(\tau)" />
          </Panel>

          <Panel title={t('rp.white.quantum')}>
            <PlotTitle textKey="rp.white.quantum" />
            <Canvas
              height={190}
              draw={drawQuantum}
              deps={[quantum]}
              ariaLabel="Quantum thermal-noise PSD versus the white approximation"
            />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.white.trace.quantum') },
                { color: CHART.dim, label: t('rp.white.trace.flat'), dashed: true },
              ]}
            />
          </Panel>

          {/* Book formulas — §5.3.2 White & thermal noise */}
          <FormulaCards>
            <FormulaCard title={<>White process (§5.3.2, Eq. 5.3.2)</>} accent="green">
              <p>
                A white process has a <strong>flat</strong> two-sided PSD; its autocorrelation is
                therefore an impulse at the origin:
              </p>
              <CardFormula tex="S_n(f)=\frac{N_0}{2}\ \xleftrightarrow{\ \mathcal{F}\ }\ R_n(\tau)=\frac{N_0}{2}\,\delta(\tau)" />
              <p>
                Since <Formula tex="R_n(\tau)=0" /> for <Formula tex="\tau\neq0" />, samples taken
                at distinct instants are uncorrelated (and, if Gaussian, independent).
              </p>
            </FormulaCard>

            <FormulaCard title={<>Thermal noise (§5.3.2, Eq. 5.3.1)</>} accent="orange">
              <p>
                The exact (quantum) thermal-noise spectrum of a resistor peaks at{' '}
                <Formula tex="kT/2" /> and rolls off only at extremely high frequencies:
              </p>
              <CardFormula tex="S_n(f)=\frac{\hbar f/2}{e^{\hbar f/kT}-1}" />
              <p>
                For all practical frequencies it is essentially flat, giving the white model with
                level <Formula tex="N_0/2=kT/2" />, i.e.
              </p>
              <CardFormula tex="N_0=kT" />
            </FormulaCard>

            <FormulaCard title={<>Power is an idealization (§5.3.2)</>} accent="blue">
              <p>
                Integrating a flat spectrum over all frequencies diverges, so a truly white process
                is not physically realizable:
              </p>
              <CardFormula tex="P_n=\int_{-\infty}^{\infty}\frac{N_0}{2}\,df\to\infty" />
              <p>
                Real noise is band-limited by the receiver; the white model is valid wherever the
                spectrum is flat across the signal band.
              </p>
            </FormulaCard>
          </FormulaCards>
        </div>
      </div>
    </div>
  );
}
