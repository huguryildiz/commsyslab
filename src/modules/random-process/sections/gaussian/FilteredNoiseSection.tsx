import { useMemo, useState } from 'react';
import { Panel, Select, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, shadeRegion, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { rcNoiseEquivBandwidth } from '@/lib/dsp/random';
import { PAD, PlotTitle, Metric, Legend } from '../prob/probShared';
import { FormulaCards, FormulaCard, CardFormula } from '../../cards';

type Filt = 'h1' | 'h2';
const DEFAULTS = { n0: 1, fc: 30, w: 8, filt: 'h1' as Filt, rcFc: 12 };

/** §5.3.3 — bandpass-filtered white noise, in-phase/quadrature PSDs, and B_neq. */
export function FilteredNoiseSection() {
  const [n0, setN0] = useState(DEFAULTS.n0);
  const [fc, setFc] = useState(DEFAULTS.fc);
  const [w, setW] = useState(DEFAULTS.w);
  const [filt, setFilt] = useState<Filt>(DEFAULTS.filt);
  const [rcFc, setRcFc] = useState(DEFAULTS.rcFc);
  const reset = () => {
    setN0(DEFAULTS.n0);
    setFc(DEFAULTS.fc);
    setW(DEFAULTS.w);
    setFilt(DEFAULTS.filt);
    setRcFc(DEFAULTS.rcFc);
  };

  const inBand = (f: number) =>
    filt === 'h1' ? Math.abs(Math.abs(f) - fc) <= w : Math.abs(f) >= fc && Math.abs(f) <= fc + w;
  const bands: [number, number][] =
    filt === 'h1'
      ? [
          [fc - w, fc + w],
          [-fc - w, -fc + w],
        ]
      : [
          [fc, fc + w],
          [-fc - w, -fc],
        ];
  const iqLevel = filt === 'h1' ? n0 : n0 / 2; // S_Xc = S_Xs (Eqs. 5.3.10–5.3.11)
  const power = filt === 'h1' ? 2 * n0 * w : n0 * w; // P_X (Eq. 5.3.9)
  const bneq = rcNoiseEquivBandwidth(rcFc);

  const fmax = fc + w + 8;
  const psd = useMemo(() => {
    const xs = Array.from({ length: 400 }, (_, i) => -fmax + (2 * fmax * i) / 399);
    const out = xs.map((f) => (inBand(f) ? n0 / 2 : 0));
    return { xs, out };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n0, fc, w, filt]);

  const drawPsd = (ctx: CanvasRenderingContext2D, ww: number, h: number) => {
    const yTop = (n0 / 2) * 2.2;
    const ax: Axes = {
      x: linScale([-fmax, fmax], [PAD.l, ww - PAD.r]),
      y: linScale([0, yTop], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-fmax, fmax], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$S(f)$',
      domainY: [0, yTop],
    });
    for (const [a, b] of bands) shadeRegion(ctx, ax, a, b, 0, n0 / 2, alpha(CHART.orange, 0.18));
    drawLine(ctx, ax, [-fmax, fmax], [n0 / 2, n0 / 2], CHART.dim, 1.4, true); // white input
    drawLine(ctx, ax, psd.xs, psd.out, CHART.blue, 2); // bandpass output
  };

  const drawIq = (ctx: CanvasRenderingContext2D, ww: number, h: number) => {
    const yTop = Math.max(n0, n0 / 2) * 1.6;
    const ax: Axes = {
      x: linScale([-fmax, fmax], [PAD.l, ww - PAD.r]),
      y: linScale([0, yTop], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-fmax, fmax], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$S_{X_c}(f)$',
      domainY: [0, yTop],
    });
    shadeRegion(ctx, ax, -w, w, 0, iqLevel, alpha(CHART.green, 0.2));
    drawLine(ctx, ax, [-fmax, -w, -w, w, w, fmax], [0, 0, iqLevel, iqLevel, 0, 0], CHART.green, 2);
  };

  const drawBneq = (ctx: CanvasRenderingContext2D, ww: number, h: number) => {
    const fM = Math.max(4 * rcFc, 2 * bneq + 4);
    const xs = Array.from({ length: 240 }, (_, i) => (fM * i) / 239);
    const mag = xs.map((f) => 1 / (1 + (f / rcFc) ** 2)); // |H(f)|²
    const ax: Axes = {
      x: linScale([0, fM], [PAD.l, ww - PAD.r]),
      y: linScale([0, 1.15], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [0, fM], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$|H(f)|^2$',
      domainY: [0, 1.15],
    });
    shadeRegion(ctx, ax, 0, bneq, 0, 1, alpha(CHART.blue, 0.16));
    drawLine(ctx, ax, [0, bneq, bneq], [1, 1, 0], CHART.blue, 1.6, true); // equivalent brick wall
    drawLine(ctx, ax, xs, mag, CHART.orange, 2);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.bp.controls')}>
            <Select<Filt>
              label={t('rp.bp.filter')}
              value={filt}
              onChange={setFilt}
              options={[
                { value: 'h1', label: t('rp.bp.filter.h1') },
                { value: 'h2', label: t('rp.bp.filter.h2') },
              ]}
            />
            <Slider
              label={<HintText text={t('rp.white.n0')} />}
              min={0.1}
              max={4}
              step={0.1}
              value={n0}
              onChange={setN0}
            />
            <Slider
              label={<HintText text={t('rp.bp.fc')} />}
              min={15}
              max={60}
              step={1}
              unit="Hz"
              value={fc}
              onChange={setFc}
            />
            <Slider
              label={<HintText text={t('rp.bp.w')} />}
              min={2}
              max={20}
              step={1}
              unit="Hz"
              value={w}
              onChange={setW}
            />
          </Panel>
          <Panel title={t('rp.bp.bneq')}>
            <Slider
              label={<HintText text={t('rp.bp.rcfc')} />}
              min={2}
              max={40}
              step={1}
              unit="Hz"
              value={rcFc}
              onChange={setRcFc}
            />
            <div className="rp__reset">
              <button type="button" onClick={reset}>
                {t('rp.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="rp__content">
          <div className="rp__readouts">
            <Metric label={t('rp.bp.power')} value={power.toFixed(2)} />
            <Metric label={t('rp.bp.bneqVal')} value={bneq.toFixed(2)} />
          </div>

          <Panel title={t('rp.bp.psd')}>
            <PlotTitle textKey="rp.bp.psd" />
            <Canvas
              height={200}
              draw={drawPsd}
              deps={[psd, fc, w, n0, filt]}
              ariaLabel="White input, bandpass filter, and output PSD"
            />
            <Legend
              entries={[
                { color: CHART.dim, label: t('rp.bp.trace.input'), dashed: true },
                { color: CHART.blue, label: t('rp.bp.trace.output') },
              ]}
            />
            <Formula tex="P_X=\int_{-\infty}^{\infty} S_X(f)\,df=\begin{cases}2N_0W & (H_1)\\ N_0W & (H_2)\end{cases}" />
          </Panel>

          <Panel title={t('rp.bp.iq')}>
            <PlotTitle textKey="rp.bp.iq" />
            <Canvas
              height={180}
              draw={drawIq}
              deps={[iqLevel, w, fc, n0]}
              ariaLabel="Lowpass in-phase and quadrature component PSD"
            />
            <Formula tex="X(t)=X_c(t)\cos 2\pi f_c t-X_s(t)\sin 2\pi f_c t,\quad S_{X_c}=S_{X_s}" />
          </Panel>

          <Panel title={t('rp.bp.bneq')}>
            <PlotTitle textKey="rp.bp.bneq" />
            <Canvas
              height={190}
              draw={drawBneq}
              deps={[rcFc, bneq]}
              ariaLabel="RC filter response and its noise-equivalent bandwidth rectangle"
            />
            <Legend
              entries={[
                { color: CHART.orange, label: t('rp.bp.trace.filter') },
                { color: CHART.blue, label: t('rp.bp.trace.h2'), dashed: true },
              ]}
            />
            <Formula tex="B_\mathrm{neq}=\dfrac{\int_{-\infty}^{\infty}|H(f)|^2\,df}{2H_\mathrm{max}^2}=\dfrac{1}{4RC}=\dfrac{\pi f_c}{2}" />
            <TheoryBox>
              <HintText text={t('rp.bp.theory')} />
            </TheoryBox>
          </Panel>

          {/* Book formulas — §5.3.3 Filtered (bandpass) noise processes */}
          <FormulaCards>
            <FormulaCard
              title={<>Bandpass-filtered noise (§5.3.3, Eqs. 5.3.5–5.3.6)</>}
              accent="green"
            >
              <p>
                White noise of level <Formula tex="N_0/2" /> through an ideal bandpass filter of
                bandwidth <Formula tex="2W" /> has output power equal to the spectral level times
                the total passband width:
              </p>
              <CardFormula tex="P_X=\int_{-\infty}^{\infty} S_X(f)\,df=\begin{cases}2N_0W & (H_1)\\[2pt] N_0W & (H_2)\end{cases}" />
              <p>
                <Formula tex="H_1" /> is symmetric about <Formula tex="\pm f_c" /> (both sidebands);{' '}
                <Formula tex="H_2" /> passes a single sideband, halving the power.
              </p>
            </FormulaCard>

            <FormulaCard title={<>In-phase &amp; quadrature components (§5.3.3)</>} accent="orange">
              <p>
                A bandpass noise process expands into lowpass in-phase and quadrature components,
                exactly like a bandpass signal:
              </p>
              <CardFormula tex="X(t)=X_c(t)\cos 2\pi f_c t-X_s(t)\sin 2\pi f_c t" />
              <p>
                Both components share the same lowpass PSD, formed by folding the bandpass spectrum
                down to baseband:
              </p>
              <CardFormula tex="S_{X_c}(f)=S_{X_s}(f)=S_X(f-f_c)+S_X(f+f_c)" />
            </FormulaCard>

            <FormulaCard title={<>Envelope &amp; phase form (§5.3.3, Eq. 5.3.8)</>} accent="green">
              <p>
                Equivalently, the bandpass noise can be written with a slowly-varying envelope{' '}
                <Formula tex="A(t)" /> and phase <Formula tex="\theta(t)" />, both lowpass random
                processes:
              </p>
              <CardFormula tex="X(t)=A(t)\cos\big(2\pi f_c t+\theta(t)\big)" />
            </FormulaCard>

            <FormulaCard
              title={<>I/Q power &amp; correlation (§5.3.3, Eq. 5.3.9)</>}
              accent="orange"
            >
              <p>
                Each component carries the full bandpass power, so the power splits equally between
                them:
              </p>
              <CardFormula tex="P_{X_c}=P_{X_s}=P_X=\int_{-\infty}^{\infty} S_X(f)\,df" />
              <p>
                <Formula tex="X_c" /> and <Formula tex="X_s" /> are uncorrelated when the bandpass
                PSD is symmetric about <Formula tex="f_c" /> — true for <Formula tex="H_1" />, not
                for <Formula tex="H_2" />.
              </p>
            </FormulaCard>

            <FormulaCard title={<>Noise-equivalent bandwidth (§5.3.3, Eq. 5.3.12)</>} accent="blue">
              <p>
                <Formula tex="B_\mathrm{neq}" /> is the width of an ideal brick-wall filter (gain{' '}
                <Formula tex="H_\mathrm{max}" />) passing the same noise power as the real filter:
              </p>
              <CardFormula tex="B_\mathrm{neq}=\frac{\int_{-\infty}^{\infty}|H(f)|^2\,df}{2H_\mathrm{max}^2}" />
              <p>
                The output noise power then becomes a one-line result (Eq. 5.3.13); for a
                first-order RC lowpass it evaluates to:
              </p>
              <CardFormula tex="P_{n_o}=N_0\,B_\mathrm{neq}\,H_\mathrm{max}^2,\qquad B_\mathrm{neq}^{\,RC}=\frac{1}{4RC}=\frac{\pi f_c}{2}" />
            </FormulaCard>
          </FormulaCards>
        </div>
      </div>
    </div>
  );
}
