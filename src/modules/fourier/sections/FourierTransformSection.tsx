import { useState } from 'react';
import { Panel, Slider, Select, TheoryBox, Formula, Toggle, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawBandwidthSpan, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import type { WindowType } from '@/lib/dsp/window';
import { nullToNullBandwidth } from '@/lib/dsp/bandwidth';
import { signalEnergy } from '@/lib/dsp/energy';
import { spectrum } from '@/lib/dsp/fft';
import { t } from '@/i18n';
import { buildSpectrumAnalyzer, buildFtProperty, type FtProperty } from '../model';
import { SpectrumAnalyzerPlots } from '../panels';
import type { SectionProps } from './types';

const PAD = { l: 50, r: 20, t: 20, b: 40 };
const PROP_FORMULA: Record<FtProperty, string> = {
  shift: 'x(t-t_0)\\;\\leftrightarrow\\;X(f)\\,e^{-j2\\pi f t_0}',
  modulate: 'x(t)\\cos(2\\pi f_0 t)\\;\\leftrightarrow\\;\\tfrac12[X(f-f_0)+X(f+f_0)]',
  scale: 'x(at)\\;\\leftrightarrow\\;\\tfrac{1}{|a|}X(f/a)',
  amp: 'a\\,x(t)\\;\\leftrightarrow\\;a\\,X(f)',
};

export function FourierTransformSection({ clock }: SectionProps) {
  // Spectrum analyzer
  const [freq1, setFreq1] = useState(10);
  const [fsAnalyzer, setFsAnalyzer] = useState(100);
  const [windowType, setWindowType] = useState<WindowType>('hann');
  const analyzer = buildSpectrumAnalyzer(
    'tones',
    [{ freq: freq1, amp: 1 }],
    'square',
    1,
    fsAnalyzer,
    256,
    windowType,
    clock,
  );
  const bw = nullToNullBandwidth(analyzer.freqs, analyzer.mags);

  // FT properties
  const [kind, setKind] = useState<'rect' | 'tri' | 'gauss'>('rect');
  const [property, setProperty] = useState<FtProperty>('shift');
  const [val, setVal] = useState(0.1);
  const prop = buildFtProperty(kind, property, {
    t0: property === 'shift' ? val : 0,
    fcShift: property === 'modulate' ? val * 100 : 0,
    scale: property === 'scale' ? 1 + val * 2 : 1,
    amp: property === 'amp' ? 1 + val * 2 : 1,
  });

  // Energy / Parseval over the FT-pair signal. spectrum() returns |X|/N, so the
  // discrete Parseval identity is Σ|x|² = N·Σ|X/N|² → the two readouts match.
  const original = prop.timeDomain.original;
  const dt = prop.timeDomain.t[1] - prop.timeDomain.t[0];
  const spec = spectrum(original, 1 / dt);
  const eTime = signalEnergy(original, dt);
  const eFreq = signalEnergy(spec.mag, dt) * original.length;

  const [showAll, setShowAll] = useState(false);

  // Zoom for FT property plots
  const tt = prop.timeDomain.t;
  const ff = prop.freqDomain.f;
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(Math.min(...tt), Math.max(...tt), { minSpan: 0.01, maxSpan: 10 });
  const [fLo, fHi, onWheelF, , onPanF] = useZoom(Math.min(...ff), Math.max(...ff), { minSpan: 0.5, maxSpan: (Math.max(...ff) - Math.min(...ff)) * 4 });

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.analyzer')}>
          <Slider label={t('fourier.analyzer.f1')} value={freq1} min={1} max={50} step={1} unit="Hz" onChange={setFreq1} />
          <Slider label={t('fourier.analyzer.fs')} value={fsAnalyzer} min={50} max={500} step={10} unit="Hz" onChange={setFsAnalyzer} />
          <Select
            label={t('fourier.analyzer.window')}
            value={windowType}
            options={[
              { value: 'rect', label: t('fourier.analyzer.window.rect') },
              { value: 'hann', label: t('fourier.analyzer.window.hann') },
              { value: 'hamming', label: t('fourier.analyzer.window.hamming') },
            ]}
            onChange={setWindowType}
          />
          <button
            type="button"
            className="fourier__preset"
            onClick={() => {
              setWindowType('rect');
              setFreq1(11);
            }}
          >
            {t('fourier.preset.leakage')}
          </button>
        </Panel>

        <Panel title={t('fourier.panel.properties')}>
          <Select
            label={t('fourier.pairs.kind')}
            value={kind}
            options={[
              { value: 'rect', label: t('fourier.pairs.kind.rect') },
              { value: 'tri', label: t('fourier.pairs.kind.tri') },
              { value: 'gauss', label: t('fourier.pairs.kind.gauss') },
            ]}
            onChange={setKind}
          />
          <Select
            label={t('fourier.prop.which')}
            value={property}
            options={[
              { value: 'shift', label: t('fourier.prop.shift') },
              { value: 'modulate', label: t('fourier.prop.modulate') },
              { value: 'scale', label: t('fourier.prop.scale') },
              { value: 'amp', label: t('fourier.prop.amp') },
            ]}
            onChange={setProperty}
          />
          <Slider label={t('fourier.prop.amount')} value={val} min={-0.5} max={0.5} step={0.02} onChange={setVal} />
        </Panel>
      </aside>

      <div className="fourier__content">
        <div className="fourier__readouts">
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.bw')}</span>
            <span className="fourier__metric__value">{bw.W.toFixed(1)} <small>Hz</small></span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.eTime')}</span>
            <span className="fourier__metric__value">{eTime.toFixed(3)}</span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.eFreq')}</span>
            <span className="fourier__metric__value">{eFreq.toFixed(3)}</span>
          </div>
        </div>

        <Panel title={t('fourier.panel.analyzer')}>
          <SpectrumAnalyzerPlots data={analyzer} />
          <p className="fourier__hint"><HintText text={t('fourier.hint.leakage')} /></p>
        </Panel>

        <Panel title={t('fourier.panel.properties')}>
          <Canvas
            height={170}
            ariaLabel="FT property: time domain original vs transformed"
            deps={[prop, tLo, tHi]}
            onWheel={onWheelT}
            onPan={onPanT}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const ax: Axes = {
                x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
                y: linScale([-1.2, 1.6], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t$', yLabel: '$x(t)$' });
              drawLine(ctx, ax, prop.timeDomain.t, prop.timeDomain.original, CHART.green, 1, false);
              drawLine(ctx, ax, prop.timeDomain.t, prop.timeDomain.transformed, CHART.orange, 2);
            }}
          />
          <Canvas
            height={170}
            ariaLabel="FT property: magnitude spectrum with bandwidth"
            deps={[prop, fLo, fHi]}
            onWheel={onWheelF}
            onPan={onPanF}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const mMax = Math.max(...prop.freqDomain.mag, 0.1) * 1.1;
              const ax: Axes = {
                x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
                y: linScale([0, mMax], [h - PAD.b, PAD.t]),
              };
              const propSpan = nullToNullBandwidth(prop.freqDomain.f, prop.freqDomain.mag);
              drawBandwidthSpan(ctx, ax, propSpan.fLo, propSpan.fHi, `W ≈ ${propSpan.W.toFixed(1)}`);
              drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f$', yLabel: '$|X(f)|$' });
              drawLine(ctx, ax, prop.freqDomain.f, prop.freqDomain.mag, CHART.blue, 1.5);
            }}
          />
          <p className="fourier__hint"><HintText text={t(`fourier.hint.prop.${property}`)} /></p>
        </Panel>

        <TheoryBox title={t('fourier.tab.transform')}>
          <Formula tex="X(f)=\int_{-\infty}^{\infty}x(t)\,e^{-j2\pi ft}\,dt" block />
          <Formula tex={PROP_FORMULA[property]} block />
          <p>Proakis §2.3 (p. 58). The single formula above matches the property you selected.</p>
          <Formula tex="E=\int|x(t)|^2dt=\int|X(f)|^2df" block />
          <p>§2.5 (p. 89): energy is the same measured in time or frequency (Parseval) — compare the two readouts.</p>
          <Toggle label={t('fourier.prop.showAll')} checked={showAll} onChange={setShowAll} />
          {showAll && (
            <div className="fourier__proplist">
              <Formula tex="a x_1+b x_2 \leftrightarrow a X_1+b X_2" />
              <Formula tex="X(t) \leftrightarrow x(-f)" />
              <Formula tex="x*h \leftrightarrow X\cdot H,\quad x\cdot h \leftrightarrow X*H" />
              <Formula tex="\tfrac{d}{dt}x(t) \leftrightarrow j2\pi f X(f)" />
              <Formula tex="x^{*}(t) \leftrightarrow X^{*}(-f)" />
            </div>
          )}
        </TheoryBox>
      </div>
    </div>
  );
}
