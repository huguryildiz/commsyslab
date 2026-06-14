/**
 * Canvas-based plot components for Signals & Spectra module.
 * Proakis & Salehi §2.1–§2.5.
 */

import React from 'react';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawStems, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import type {
  SeriesSynthView,
  SpectrumAnalyzerView,
  FilterView,
  AnalyticView,
} from './model';

const PAD = { l: 50, r: 20, t: 20, b: 40 };

/** Panel 1: Fourier Series Synthesis — time + magnitude & phase spectra */
export const SeriesSynthPlots: React.FC<{ data: SeriesSynthView }> = ({ data }) => {
  const tDataMin = Math.min(...data.time);
  const tDataMax = Math.max(...data.time);
  const fDataMax = Math.max(...data.freqs, 1);

  const [tLo, tHi, onWheelT, , onPanT] = useZoom(tDataMin, tDataMax, { minSpan: 0.05, maxSpan: (tDataMax - tDataMin) * 6 });
  const [fLo, fHi, onWheelF, , onPanF] = useZoom(0, fDataMax, { minSpan: 0.5, maxSpan: fDataMax * 4, clampMin: 0 });

  const tSpan = tHi - tLo;
  const tRange = tDataMax - tDataMin;
  const tLoC = tSpan >= tRange ? tDataMin : Math.max(tDataMin, Math.min(tLo, tDataMax - tSpan));
  const tHiC = tSpan >= tRange ? tDataMax : tLoC + tSpan;

  const fSpan = fHi - fLo;
  const fLoC = fSpan >= fDataMax ? 0 : Math.max(0, Math.min(fLo, fDataMax - fSpan));
  const fHiC = fSpan >= fDataMax ? fDataMax : fLoC + fSpan;

  const drawSpec = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    yVals: number[],
    yMin: number,
    yMax: number,
    yLabel: string,
    color: string,
  ) => {
    ctx.clearRect(0, 0, w, h);
    const ax: Axes = {
      x: linScale([fLoC, fHiC], [PAD.l, w - PAD.r]),
      y: linScale([yMin, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [fLoC, fHiC], { xLabel: '$n$', yLabel });
    drawStems(ctx, ax, data.freqs, yVals, color, 3);
  };

  return (
    <>
      <Canvas
        height={200}
        ariaLabel="Time-domain: ideal vs partial sum"
        deps={[data, tLoC, tHiC]}
        onWheel={onWheelT}
        onPan={onPanT}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const yMin = Math.min(...data.ideal, ...data.partial) - 0.2;
          const yMax = Math.max(...data.ideal, ...data.partial) + 0.2;
          const ax: Axes = {
            x: linScale([tLoC, tHiC], [PAD.l, w - PAD.r]),
            y: linScale([yMin, yMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [tLoC, tHiC], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$x(t)$' });
          drawLine(ctx, ax, data.time, data.ideal, CHART.orange, 2);
          drawLine(ctx, ax, data.time, data.partial, CHART.green, 2);
        }}
      />
      {/* Magnitude and phase spectra side by side, sharing the same frequency zoom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
        <Canvas
          height={200}
          ariaLabel="Magnitude spectrum |cₙ|"
          deps={[data, fLoC, fHiC]}
          onWheel={onWheelF}
          onPan={onPanF}
          draw={(ctx, w, h) => {
            const mMax = Math.max(...data.mags, 0.1) * 1.1;
            drawSpec(ctx, w, h, data.mags, 0, mMax, '$|c_n|$', CHART.green);
          }}
        />
        <Canvas
          height={200}
          ariaLabel="Phase spectrum ∠cₙ"
          deps={[data, fLoC, fHiC]}
          onWheel={onWheelF}
          onPan={onPanF}
          draw={(ctx, w, h) => {
            const phasesDeg = data.phases.map((p) => (p * 180) / Math.PI);
            drawSpec(ctx, w, h, phasesDeg, -198, 198, '$\\angle c_n\\,(^\\circ)$', CHART.blue);
          }}
        />
      </div>
    </>
  );
};

/** Panel 2: Spectrum Analyzer — magnitude and phase */
export const SpectrumAnalyzerPlots: React.FC<{ data: SpectrumAnalyzerView }> = ({ data }) => {
  const tDataMin = Math.min(...data.time);
  const tDataMax = Math.max(...data.time);
  const fDataMin = Math.min(...data.freqs);
  const fDataMax = Math.max(...data.freqs, 1);

  const [tLo, tHi, onWheelT, , onPanT] = useZoom(tDataMin, tDataMax, { minSpan: 1e-4, maxSpan: (tDataMax - tDataMin) * 4 });
  const [fLo, fHi, onWheelF, , onPanF] = useZoom(fDataMin, fDataMax, { minSpan: 0.5, maxSpan: (fDataMax - fDataMin) * 4 });

  return (
    <>
      <Canvas
        height={180}
        ariaLabel="Time domain signal"
        deps={[data, tLo, tHi]}
        onWheel={onWheelT}
        onPan={onPanT}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const sMin = Math.min(...data.signal) - 0.1;
          const sMax = Math.max(...data.signal) + 0.1;
          const ax: Axes = {
            x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
            y: linScale([sMin, sMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t\\,(s)$', yLabel: '$x(t)$' });
          drawLine(ctx, ax, data.time, data.signal, CHART.green, 1.5);
        }}
      />
      <Canvas
        height={180}
        ariaLabel="Magnitude spectrum |X(f)|"
        deps={[data, fLo, fHi]}
        onWheel={onWheelF}
        onPan={onPanF}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const mMax = Math.max(...data.mags, 0.01) * 1.1;
          const ax: Axes = {
            x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
            y: linScale([0, mMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(Hz)$', yLabel: '$|X(f)|$' });
          drawLine(ctx, ax, data.freqs, data.mags, CHART.blue, 1);
        }}
      />
      <Canvas
        height={140}
        ariaLabel="Phase spectrum ∠X(f)"
        deps={[data, fLo, fHi]}
        onWheel={onWheelF}
        onPan={onPanF}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const ax: Axes = {
            x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
            y: linScale([-Math.PI, Math.PI], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(Hz)$', yLabel: '$\\angle X(f)$' });
          drawLine(ctx, ax, data.freqs, data.phases, CHART.pink, 1);
        }}
      />
    </>
  );
};

/** Panel 3: LTI Filter */
export const FilterPlots: React.FC<{ data: FilterView }> = ({ data }) => {
  const fDataMax = Math.max(...data.freqs, 1);
  const [fLo, fHi, onWheelF, , onPanF] = useZoom(0, fDataMax, { minSpan: 1, maxSpan: fDataMax * 4, clampMin: 0 });

  return (
    <>
      <Canvas
        height={180}
        ariaLabel="Filter frequency response |H(f)|"
        deps={[data, fLo, fHi]}
        onWheel={onWheelF}
        onPan={onPanF}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const ax: Axes = {
            x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
            y: linScale([0, 1.1], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(Hz)$', yLabel: '$|H(f)|$' });
          drawLine(ctx, ax, data.freqs, data.filterMag, CHART.orange, 2);
        }}
      />
      <Canvas
        height={180}
        ariaLabel="Input and output spectra"
        deps={[data, fLo, fHi]}
        onWheel={onWheelF}
        onPan={onPanF}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const mMax = Math.max(...data.inputMag, ...data.outputMag, 0.1) * 1.1;
          const ax: Axes = {
            x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
            y: linScale([0, mMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(Hz)$', yLabel: '$|X(f)|$' });
          drawLine(ctx, ax, data.freqs, data.inputMag, CHART.green, 1.5, false);
          drawLine(ctx, ax, data.freqs, data.outputMag, CHART.blue, 1.5, false);
        }}
      />
    </>
  );
};

/** Panel 5: Analytic Signal & Hilbert */
export const AnalyticPlots: React.FC<{ data: AnalyticView }> = ({ data }) => {
  const tDataMax = Math.max(...data.time);
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(0, tDataMax, { minSpan: 1e-4, maxSpan: tDataMax * 4, clampMin: 0 });

  return (
    <>
      <Canvas
        height={150}
        ariaLabel="Bandpass signal x(t)"
        deps={[data, tLo, tHi]}
        onWheel={onWheelT}
        onPan={onPanT}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const sMin = Math.min(...data.signal) - 0.2;
          const sMax = Math.max(...data.signal) + 0.2;
          const ax: Axes = {
            x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
            y: linScale([sMin, sMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t$', yLabel: '$x(t)$' });
          drawLine(ctx, ax, data.time, data.signal, CHART.orange, 1.5);
        }}
      />
      <Canvas
        height={150}
        ariaLabel="I/Q components"
        deps={[data, tLo, tHi]}
        onWheel={onWheelT}
        onPan={onPanT}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const qMin = Math.min(...data.iComponent, ...data.qComponent) - 0.2;
          const qMax = Math.max(...data.iComponent, ...data.qComponent) + 0.2;
          const ax: Axes = {
            x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
            y: linScale([qMin, qMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t$', yLabel: '$I(t), Q(t)$' });
          drawLine(ctx, ax, data.time, data.iComponent, CHART.green, 1.5);
          drawLine(ctx, ax, data.time, data.qComponent, CHART.blue, 1.5);
        }}
      />
      <Canvas
        height={150}
        ariaLabel="Envelope V(t)"
        deps={[data, tLo, tHi]}
        onWheel={onWheelT}
        onPan={onPanT}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const envMax = Math.max(...data.envelope) * 1.1;
          const ax: Axes = {
            x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
            y: linScale([0, envMax], [h - PAD.b, PAD.t]),
          };
          drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t$', yLabel: '$V(t)$' });
          drawLine(ctx, ax, data.time, data.envelope, CHART.pink, 2);
        }}
      />
    </>
  );
};
