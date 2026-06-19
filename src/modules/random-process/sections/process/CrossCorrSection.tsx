import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { genTwoSineEnsembles, crossCorrelation, type ProcessParams } from '@/lib/dsp/random';
import { PAD, PlotTitle, Metric, Legend } from '../prob/probShared';
import { FormulaCards, FormulaCard, CardFormula } from '../../cards';

const FS = 200;
const NS = 256;
const MAXLAG = 80;
const DEFAULTS = { amplitude: 1, f0: 5, phiDeg: 60, M: 300 };

/** §5.2.3 / §5.2.6 — cross-correlation of two jointly-WSS sinusoids and the sum process. */
export function CrossCorrSection() {
  const [amplitude, setAmplitude] = useState(DEFAULTS.amplitude);
  const [f0, setF0] = useState(DEFAULTS.f0);
  const [phiDeg, setPhiDeg] = useState(DEFAULTS.phiDeg);
  const [M, setM] = useState(DEFAULTS.M);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setAmplitude(DEFAULTS.amplitude);
    setF0(DEFAULTS.f0);
    setPhiDeg(DEFAULTS.phiDeg);
    setM(DEFAULTS.M);
    setResetKey((k) => k + 1);
  };

  const view = useMemo(() => {
    const p: ProcessParams = {
      kind: 'randphase-sine',
      amplitude,
      f0,
      n0: 1,
      fs: FS,
      M,
      N: NS,
      seed: 7,
      filterKind: 'rc',
      cutoff: 20,
    };
    const phi = (phiDeg * Math.PI) / 180;
    const { x, y } = genTwoSineEnsembles(p, phi);
    const z = x.map((xi, m) => xi.map((v, n) => v + y[m][n]) as Float64Array);
    const rx = crossCorrelation(x, x, MAXLAG);
    const ry = crossCorrelation(y, y, MAXLAG);
    const rxy = crossCorrelation(x, y, MAXLAG);
    const rz = crossCorrelation(z, z, MAXLAG);
    const taus = Array.from({ length: 2 * MAXLAG + 1 }, (_, i) => (i - MAXLAG) / FS);
    const rSum = Array.from(rx, (v, i) => v + ry[i]); // no cross term
    return {
      taus,
      rx: Array.from(rx),
      ry: Array.from(ry),
      rxy: Array.from(rxy),
      rz: Array.from(rz),
      rSum,
      rxy0: rxy[MAXLAG],
      pz: rz[MAXLAG],
    };
  }, [amplitude, f0, phiDeg, M]);

  const tauMax = MAXLAG / FS;
  const [lo, hi, onWheel, , onPan] = useZoom(-tauMax, tauMax, {
    minSpan: tauMax / 4,
    maxSpan: 2 * tauMax,
    clampMin: -tauMax,
    clampMax: tauMax,
  });
  const yMax = useMemo(
    () => Math.max(1e-6, ...view.rx, ...view.ry, ...view.rxy.map(Math.abs)) * 1.15,
    [view],
  );
  const yMaxZ = useMemo(
    () => Math.max(1e-6, ...view.rz.map(Math.abs), ...view.rSum.map(Math.abs)) * 1.15,
    [view],
  );

  const drawXY = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-yMax, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$\\tau\\,(\\mathrm{s})$',
      yLabel: '$R(\\tau)$',
      domainY: [-yMax, yMax],
    });
    drawLine(ctx, ax, view.taus, view.rx, CHART.green, 1.6);
    drawLine(ctx, ax, view.taus, view.ry, CHART.orange, 1.6, true);
    drawLine(ctx, ax, view.taus, view.rxy, CHART.blue, 2);
  };

  const drawSum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([-yMaxZ, yMaxZ], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$\\tau\\,(\\mathrm{s})$',
      yLabel: '$R_Z(\\tau)$',
      domainY: [-yMaxZ, yMaxZ],
    });
    drawLine(ctx, ax, view.taus, view.rSum, CHART.dim, 1.6, true);
    drawLine(ctx, ax, view.taus, view.rz, CHART.blue, 2);
  };

  const uncorrelated = Math.abs(view.rxy0) < 0.05 * amplitude * amplitude;

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.cross.controls')}>
            <Slider
              label={<HintText text="$A$" />}
              min={0.2}
              max={3}
              step={0.1}
              value={amplitude}
              onChange={setAmplitude}
            />
            <Slider
              label={<HintText text="$f_0$" />}
              min={1}
              max={20}
              step={1}
              unit="Hz"
              value={f0}
              onChange={setF0}
            />
            <Slider
              label={<HintText text={t('rp.cross.phi')} />}
              min={0}
              max={180}
              step={5}
              unit="°"
              value={phiDeg}
              onChange={setPhiDeg}
            />
            <Slider
              label={<HintText text={t('rp.gen.realizations')} />}
              min={50}
              max={600}
              step={50}
              value={M}
              onChange={setM}
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
            <Metric label={t('rp.cross.rxy0')} value={view.rxy0.toFixed(3)} />
            <Metric label={t('rp.cross.pz')} value={view.pz.toFixed(3)} />
            <div className="rp__metric">
              <span className="rp__metric__label">
                <HintText text={t('rp.cross.state')} />
              </span>
              <span
                className="rp__metric__value"
                style={{ color: uncorrelated ? CHART.green : CHART.orange }}
              >
                {t(uncorrelated ? 'rp.cross.uncorr' : 'rp.cross.corr')}
              </span>
            </div>
          </div>

          <Panel title={t('rp.cross.plotXY')}>
            <PlotTitle textKey="rp.cross.plotXY" />
            <Canvas
              height={220}
              draw={drawXY}
              deps={[view, lo, hi, yMax]}
              ariaLabel="Auto- and cross-correlation of two sinusoids"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('rp.cross.trace.rx') },
                { color: CHART.orange, label: t('rp.cross.trace.ry'), dashed: true },
                { color: CHART.blue, label: t('rp.cross.trace.rxy') },
              ]}
            />
            <Formula tex="R_{XY}(\tau)=E[X(t)\,Y(t+\tau)]=\tfrac{A^2}{2}\cos(2\pi f_0\tau+\varphi)" />
          </Panel>

          <Panel title={t('rp.cross.plotSum')}>
            <PlotTitle textKey="rp.cross.plotSum" />
            <Canvas
              height={220}
              draw={drawSum}
              deps={[view, lo, hi, yMaxZ]}
              ariaLabel="Sum-process autocorrelation with and without the cross term"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.cross.trace.rz') },
                { color: CHART.dim, label: t('rp.cross.trace.sum'), dashed: true },
              ]}
            />
            <Formula tex="S_Z(f)=S_X(f)+S_Y(f)+2\,\mathrm{Re}[S_{XY}(f)],\quad P_Z=A^2(1+\cos\varphi)" />
            <TheoryBox>
              <HintText text={t('rp.cross.theory')} />
            </TheoryBox>
          </Panel>

          {/* Book formulas — §5.2.3 cross-correlation & §5.2.6 sum process */}
          <FormulaCards>
            <FormulaCard title={<>Cross-correlation (§5.2.3, Eq. 5.2.9)</>} accent="green">
              <p>
                The cross-correlation measures the relationship between two processes at a relative
                lag <Formula tex="\tau" />:
              </p>
              <CardFormula tex="R_{XY}(\tau)=E[X(t)\,Y(t+\tau)]" />
              <p>
                When <Formula tex="X" /> and <Formula tex="Y" /> are jointly stationary it satisfies
                the symmetry (Eq. 5.2.11):
              </p>
              <CardFormula tex="R_{XY}(\tau)=R_{YX}(-\tau)" />
            </FormulaCard>

            <FormulaCard title={<>Cross-spectral density (§5.2.5, Eq. 5.2.26)</>} accent="orange">
              <p>Its Fourier transform is the cross-spectral density:</p>
              <CardFormula tex="S_{XY}(f)=\mathcal{F}\{R_{XY}(\tau)\}" />
              <p>
                When <Formula tex="Y" /> is the LTI-filtered version of <Formula tex="X" /> this
                becomes (Eq. 5.2.27):
              </p>
              <CardFormula tex="S_{XY}(f)=S_X(f)\,H^{*}(f)" />
            </FormulaCard>

            <FormulaCard title={<>Sum process (§5.2.6)</>} accent="blue">
              <p>
                For <Formula tex="Z(t)=X(t)+Y(t)" /> the autocorrelation gains a cross term, so the
                spectra do <em>not</em> simply add unless the processes are uncorrelated:
              </p>
              <CardFormula tex="R_Z(\tau)=R_X(\tau)+R_Y(\tau)+R_{XY}(\tau)+R_{YX}(\tau)" />
              <CardFormula tex="S_Z(f)=S_X(f)+S_Y(f)+2\,\mathrm{Re}\{S_{XY}(f)\}" />
            </FormulaCard>

            <FormulaCard title={<>Modulated process (§5.2.5, Eq. 5.2.17)</>} accent="green">
              <p>
                Multiplying a WSS process by a carrier (with random uniform phase) shifts its
                spectrum to <Formula tex="\pm f_0" /> and quarters it — the line spectra seen here:
              </p>
              <CardFormula tex="Y(t)=X(t)\cos(2\pi f_0 t+\Theta)" />
              <CardFormula tex="S_Y(f)=\tfrac14\big[S_X(f-f_0)+S_X(f+f_0)\big]" />
            </FormulaCard>
          </FormulaCards>
        </div>
      </div>
    </div>
  );
}
