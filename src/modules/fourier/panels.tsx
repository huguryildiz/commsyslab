/**
 * Canvas-based plot components for Fourier & Spectrum module.
 * Proakis & Salehi §2.1–§2.5.
 */

import React from 'react';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawStems, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import type {
  SeriesSynthView,
  SpectrumAnalyzerView,
  FilterView,
  PairsView,
  AnalyticView,
} from './model';

const PAD = { l: 50, r: 20, t: 20, b: 40 };

/** Panel 1: Fourier Series Synthesis — time + line spectrum */
export const SeriesSynthPlots: React.FC<{ data: SeriesSynthView }> = ({ data }) => {
  const drawTimeDomain = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, w, h);

    const tMin = Math.min(...data.time);
    const tMax = Math.max(...data.time);
    const yMin = Math.min(...data.ideal, ...data.partial) - 0.2;
    const yMax = Math.max(...data.ideal, ...data.partial) + 0.2;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([yMin, yMax], [h - PAD.b, PAD.t]),
    };

    // Draw ideal waveform
    drawLine(ctx, ax, data.time, data.ideal, CHART.orange, 2);
    // Draw partial sum
    drawLine(ctx, ax, data.time, data.partial, CHART.green, 2);

    // Axes labels
    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', w / 2, h - 5);
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x(t)', 0, 0);
    ctx.restore();
  };

  const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = 0;
    const fMax = Math.max(...data.freqs, 1);
    const mMax = Math.max(...data.mags, 0.1) * 1.1;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, mMax], [h - PAD.b, PAD.t]),
    };

    drawStems(ctx, ax, data.freqs, data.mags, CHART.green, 3);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz)', w / 2, h - 5);
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('|cₙ|', 0, 0);
    ctx.restore();
  };

  return (
    <>
      <Canvas
        height={200}
        ariaLabel="Time-domain: ideal vs partial sum"
        deps={[data]}
        draw={drawTimeDomain}
      />
      <Canvas
        height={200}
        ariaLabel="Line spectrum: Fourier coefficients"
        deps={[data]}
        draw={drawSpectrum}
      />
    </>
  );
};

/** Panel 2: Spectrum Analyzer — magnitude and phase */
export const SpectrumAnalyzerPlots: React.FC<{ data: SpectrumAnalyzerView }> = ({ data }) => {
  const drawTimeDomain = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const tMin = Math.min(...data.time);
    const tMax = Math.max(...data.time);
    const sMin = Math.min(...data.signal) - 0.1;
    const sMax = Math.max(...data.signal) + 0.1;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([sMin, sMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.time, data.signal, CHART.green, 1.5);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', w / 2, h - 5);
  };

  const drawMagnitude = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = Math.min(...data.freqs);
    const fMax = Math.max(...data.freqs, 1);
    const mMax = Math.max(...data.mags, 0.01) * 1.1;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, mMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.freqs, data.mags, CHART.blue, 1);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz)', w / 2, h - 5);
  };

  const drawPhase = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = Math.min(...data.freqs);
    const fMax = Math.max(...data.freqs, 1);
    const pMin = -Math.PI;
    const pMax = Math.PI;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([pMin, pMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.freqs, data.phases, CHART.pink, 1);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz)', w / 2, h - 5);
  };

  return (
    <>
      <Canvas height={180} ariaLabel="Time domain signal" deps={[data]} draw={drawTimeDomain} />
      <Canvas
        height={180}
        ariaLabel="Magnitude spectrum |X(f)|"
        deps={[data]}
        draw={drawMagnitude}
      />
      <Canvas height={140} ariaLabel="Phase spectrum ∠X(f)" deps={[data]} draw={drawPhase} />
    </>
  );
};

/** Panel 3: LTI Filter */
export const FilterPlots: React.FC<{ data: FilterView }> = ({ data }) => {
  const drawFilterResponse = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = 0;
    const fMax = Math.max(...data.freqs, 1);
    const mMax = 1.1;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, mMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.freqs, data.filterMag, CHART.orange, 2);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz)', w / 2, h - 5);
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('|H(f)|', 0, 0);
    ctx.restore();
  };

  const drawSpectrumComparison = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = Math.min(...data.freqs, 0);
    const fMax = Math.max(...data.freqs, 1);
    const mMax = Math.max(...data.inputMag, ...data.outputMag, 0.1) * 1.1;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, mMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.freqs, data.inputMag, CHART.green, 1.5, false);
    drawLine(ctx, ax, data.freqs, data.outputMag, CHART.blue, 1.5, false);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f (Hz)', w / 2, h - 5);
  };

  return (
    <>
      <Canvas
        height={180}
        ariaLabel="Filter frequency response |H(f)|"
        deps={[data]}
        draw={drawFilterResponse}
      />
      <Canvas
        height={180}
        ariaLabel="Input and output spectra"
        deps={[data]}
        draw={drawSpectrumComparison}
      />
    </>
  );
};

/** Panel 4: FT Pairs */
export const PairsPlots: React.FC<{ data: PairsView }> = ({ data }) => {
  const drawTime = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const tMin = Math.min(...data.timeDomain.t);
    const tMax = Math.max(...data.timeDomain.t);
    const xMin = Math.min(...data.timeDomain.x) - 0.1;
    const xMax = Math.max(...data.timeDomain.x) + 0.1;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([xMin, xMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.timeDomain.t, data.timeDomain.x, CHART.green, 2);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t', w / 2, h - 5);
  };

  const drawFreq = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const fMin = Math.min(...data.freqDomain.f);
    const fMax = Math.max(...data.freqDomain.f);
    const mMax = Math.max(...data.freqDomain.mag, 0.1) * 1.1;

    const ax: Axes = {
      x: linScale([fMin, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, mMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.freqDomain.f, data.freqDomain.mag, CHART.blue, 1.5);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('f', w / 2, h - 5);
  };

  return (
    <>
      <Canvas height={160} ariaLabel="Time domain" deps={[data]} draw={drawTime} />
      <Canvas height={160} ariaLabel="Frequency domain" deps={[data]} draw={drawFreq} />
    </>
  );
};

/** Panel 5: Analytic Signal & Hilbert */
export const AnalyticPlots: React.FC<{ data: AnalyticView }> = ({ data }) => {
  const drawSignal = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const tMin = 0;
    const tMax = Math.max(...data.time);
    const sMin = Math.min(...data.signal) - 0.2;
    const sMax = Math.max(...data.signal) + 0.2;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([sMin, sMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.time, data.signal, CHART.orange, 1.5);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t', w / 2, h - 5);
  };

  const drawIQ = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const tMin = 0;
    const tMax = Math.max(...data.time);
    const qMin = Math.min(...data.iComponent, ...data.qComponent) - 0.2;
    const qMax = Math.max(...data.iComponent, ...data.qComponent) + 0.2;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([qMin, qMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.time, data.iComponent, CHART.green, 1.5);
    drawLine(ctx, ax, data.time, data.qComponent, CHART.blue, 1.5);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t', w / 2, h - 5);
  };

  const drawEnvelope = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const tMin = 0;
    const tMax = Math.max(...data.time);
    const envMin = 0;
    const envMax = Math.max(...data.envelope) * 1.1;

    const ax: Axes = {
      x: linScale([tMin, tMax], [PAD.l, w - PAD.r]),
      y: linScale([envMin, envMax], [h - PAD.b, PAD.t]),
    };

    drawLine(ctx, ax, data.time, data.envelope, CHART.pink, 2);

    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('t', w / 2, h - 5);
  };

  return (
    <>
      <Canvas height={150} ariaLabel="Bandpass signal x(t)" deps={[data]} draw={drawSignal} />
      <Canvas height={150} ariaLabel="I/Q components" deps={[data]} draw={drawIQ} />
      <Canvas height={150} ariaLabel="Envelope V(t)" deps={[data]} draw={drawEnvelope} />
    </>
  );
};
