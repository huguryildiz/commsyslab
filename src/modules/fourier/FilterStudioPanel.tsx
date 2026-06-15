/**
 * Filter Studio (Filters tab hero). Pick a harmonic-rich source, a filter type
 * and response (ideal/Butterworth), drag the cutoff on the spectrum, and see
 * (time + frequency, input vs output) and hear (Web Audio) the filtering.
 * Proakis & Salehi §2.4: Y(f) = H(f)·X(f).
 */

import { useEffect, useRef, useState } from 'react';
import { Panel, Slider, Select, Segmented, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, shadeRegion, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import {
  buildFilterStudio, DEFAULT_STUDIO, STUDIO_FS,
  type FilterStudioParams, type StudioSource, type StudioFilterType, type StudioResponse,
} from './filterStudio';
import {
  audioSupported, biquadParams, playFilteredSource, type FilteredSourceHandle,
} from '@/lib/audio/filter-audio';

const PAD = { l: 56, r: 20, t: 20, b: 40 };

export function FilterStudioPanel() {
  const [source, setSource] = useState<StudioSource>(DEFAULT_STUDIO.source);
  const [f0, setF0] = useState(DEFAULT_STUDIO.f0);
  const [filterType, setFilterType] = useState<StudioFilterType>(DEFAULT_STUDIO.filterType);
  const [response, setResponse] = useState<StudioResponse>(DEFAULT_STUDIO.response);
  const [order, setOrder] = useState(DEFAULT_STUDIO.order);
  const [fc, setFc] = useState(DEFAULT_STUDIO.fc);
  const [fc2, setFc2] = useState(DEFAULT_STUDIO.fc2);

  const params: FilterStudioParams = {
    ...DEFAULT_STUDIO, source, f0, filterType, response, order, fc, fc2, tStart: 0,
  };
  const view = buildFilterStudio(params);
  const showFc2 = filterType === 'bpf' || filterType === 'bsf';
  const isWave = source !== 'white' && source !== 'pink' && source !== 'multitone';

  // Shared frequency zoom for the spectrum canvas (cutoff-drag handles pointer; no pan here).
  const [fLo, fHi, onWheelF] = useZoom(0, view.fMax, { minSpan: 20, maxSpan: view.fMax * 2, clampMin: 0 });
  // Time zoom/pan.
  const tMax = view.time[view.time.length - 1];
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(0, tMax / 4, { minSpan: 0.002, maxSpan: tMax });

  // Drag the cutoff on the spectrum: map xFraction → frequency.
  const onScrubCutoff = (xFraction: number) => {
    const f = fLo + xFraction * (fHi - fLo);
    const clamped = Math.max(5, Math.min(view.fMax - 5, f));
    if (showFc2) {
      // Drag the nearer of the two edges.
      if (Math.abs(clamped - fc) <= Math.abs(clamped - fc2)) setFc(Math.min(clamped, fc2 - 5));
      else setFc2(Math.max(clamped, fc + 5));
    } else {
      setFc(clamped);
    }
  };

  // --- Audio ---
  const handleRef = useRef<FilteredSourceHandle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bypass, setBypass] = useState(false);

  const startAudio = () => {
    const wavetable = view.xInput.slice(0, Math.max(2, Math.round(STUDIO_FS / Math.max(f0, 20))));
    const h = playFilteredSource({
      source, wavetable, pitchHz: f0, filter: biquadParams(filterType, fc, fc2),
    });
    if (!h) return;
    handleRef.current = h;
    setPlaying(true);
  };
  const stopAudio = () => { handleRef.current?.stop(); handleRef.current = null; setPlaying(false); };
  useEffect(() => () => { handleRef.current?.stop(); }, []);
  useEffect(() => {
    handleRef.current?.setFilter(biquadParams(filterType, fc, fc2));
  }, [filterType, fc, fc2]);
  useEffect(() => { handleRef.current?.setBypass(bypass); }, [bypass]);

  return (
    <div className="module-layout">
      {/* LEFT SIDEBAR — controls */}
      <aside className="fourier__controls">
        <Panel title={t('fourier.studio.panel')}>
          <Select
            label={t('fourier.studio.source')} value={source} onChange={setSource}
            options={[
              { value: 'square', label: t('fourier.studio.source.square') },
              { value: 'sawtooth', label: t('fourier.studio.source.sawtooth') },
              { value: 'triangle', label: t('fourier.studio.source.triangle') },
              { value: 'pulse', label: t('fourier.studio.source.pulse') },
              { value: 'multitone', label: t('fourier.studio.source.multitone') },
              { value: 'white', label: t('fourier.studio.source.white') },
              { value: 'pink', label: t('fourier.studio.source.pink') },
            ]}
          />
          {isWave && (
            <Slider label={<HintText text={t('fourier.studio.f0')} />} value={f0} min={20} max={200} step={10} unit="Hz" onChange={setF0} />
          )}
          <Select
            label={t('fourier.studio.filterType')} value={filterType} onChange={setFilterType}
            options={[
              { value: 'lpf', label: t('fourier.filter.type.lpf') },
              { value: 'hpf', label: t('fourier.filter.type.hpf') },
              { value: 'bpf', label: t('fourier.filter.type.bpf') },
              { value: 'bsf', label: t('fourier.filter.type.bsf') },
            ]}
          />
          <div className="studio__filter-box">
            <Segmented
              ariaLabel={t('fourier.studio.response')} value={response}
              options={[
                { value: 'ideal', label: t('fourier.studio.response.ideal') },
                { value: 'butterworth', label: t('fourier.studio.response.butter') },
              ]}
              onChange={setResponse}
            />
            {response === 'butterworth' && (
              <Slider label={t('fourier.studio.order')} value={order} min={1} max={10} step={1} onChange={setOrder} />
            )}
            <Slider label={<HintText text={t('fourier.studio.fc')} />} value={fc} min={5} max={view.fMax - 5} step={5} unit="Hz" onChange={setFc} />
            {showFc2 && (
              <Slider label={<HintText text={t('fourier.studio.fc2')} />} value={fc2} min={fc + 5} max={view.fMax - 5} step={5} unit="Hz" onChange={setFc2} />
            )}
            {audioSupported() && (
              <div className="studio__audio">
                <button
                  type="button"
                  className={`studio__audio__listen${playing ? ' studio__audio__listen--playing' : ''}`}
                  onClick={playing ? stopAudio : startAudio}
                >
                  {playing ? t('fourier.studio.stop') : t('fourier.studio.listen')}
                </button>
                {playing && (
                  <button
                    type="button"
                    className="studio__audio__bypass"
                    onClick={() => setBypass((b) => !b)}
                  >
                    {bypass ? t('fourier.studio.bypass') + ' ON' : t('fourier.studio.bypass')}
                  </button>
                )}
              </div>
            )}
          </div>
        </Panel>
      </aside>

      {/* RIGHT CONTENT — plots + theory */}
      <div className="fourier__content">
        <Panel title={t('fourier.studio.panelPlot')}>
          {/* Spectrum: |X| line, shaded passband + |H|, |Y| output */}
          <p className="fourier__hint">{t('fourier.studio.spectrumTitle')}</p>
          <Canvas
            height={220}
            ariaLabel="Filter Studio spectrum"
            deps={[view, fLo, fHi]}
            onScrub={onScrubCutoff}
            scrubPadding={{ l: PAD.l, r: PAD.r }}
            onWheel={onWheelF}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const mMax = Math.max(...view.magX, 1e-6) * 1.15;
              const ax: Axes = {
                x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
                y: linScale([0, mMax], [h - PAD.b, PAD.t]),
              };
              // shaded passband (where |H| ≳ 0.5)
              for (let i = 1; i < view.freqs.length; i++) {
                if (view.magH[i] >= 0.5) {
                  shadeRegion(ctx, ax, view.freqs[i - 1], view.freqs[i], 0, mMax, 'rgba(255,140,66,0.10)');
                }
              }
              drawAxes(ctx, ax, [fLo, fHi], { xLabel: '$f\\,(\\mathrm{Hz})$', yLabel: '$|X(f)|$' });
              drawLine(ctx, ax, view.freqs, view.magX, CHART.green, 1.5);
              drawLine(ctx, ax, view.freqs, view.magY, CHART.blue, 2);
              // |H| scaled to the axis top for visibility (dashed)
              drawLine(ctx, ax, view.freqs, view.magH.map((v) => v * mMax), CHART.orange, 1.5, true);
              // cutoff handles
              drawVLine(ctx, ax, fc, 0, mMax, CHART.pink, false, 2);
              if (showFc2) drawVLine(ctx, ax, fc2, 0, mMax, CHART.pink, false, 2);
            }}
          />
          <p className="fourier__hint"><HintText text={t('fourier.studio.hint.spectrum')} /></p>

          {/* Time domain: input vs filtered output */}
          <p className="fourier__plot-title">{t('fourier.studio.timeTitle')}</p>
          <Canvas
            height={200}
            ariaLabel="Filter Studio time domain"
            deps={[view, tLo, tHi]}
            onWheel={onWheelT}
            onPan={onPanT}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const yMax = Math.max(1e-6, ...view.xInput.map(Math.abs), ...view.yOutput.map(Math.abs)) * 1.1;
              const ax: Axes = {
                x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
                y: linScale([-yMax, yMax], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$x(t),\\,y(t)$' });
              drawLine(ctx, ax, view.time, view.xInput, CHART.orange, 1.5);
              drawLine(ctx, ax, view.time, view.yOutput, CHART.blue, 2);
            }}
          />
          <p className="fourier__hint" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ color: CHART.orange }}>— <HintText text={t('fourier.studio.legend.time.input')} /></span>
            <span style={{ color: CHART.blue }}>— <HintText text={t('fourier.studio.legend.time.output')} /></span>
          </p>
          <p className="fourier__hint"><HintText text={t('fourier.studio.hint.time')} /></p>
        </Panel>

      </div>
    </div>
  );
}
