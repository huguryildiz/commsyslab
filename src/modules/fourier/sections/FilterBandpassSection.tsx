import { useState } from 'react';
import { Panel, Slider, Select, Toggle, TheoryBox, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawBandwidthSpan, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { halfPowerBandwidth } from '@/lib/dsp/bandwidth';
import { t } from '@/i18n';
import { buildFilter, buildAnalytic, buildBasebandBandpass } from '../model';
import { FilterPlots, AnalyticPlots } from '../panels';
import type { SectionProps } from './types';

const PAD = { l: 50, r: 20, t: 20, b: 40 };

type FilterKind = 'lpf' | 'hpf' | 'bpf' | 'bsf' | 'rc';

export function FilterBandpassSection({ clock }: SectionProps) {
  const [filterType, setFilterType] = useState<FilterKind>('lpf');
  const [fc, setFc] = useState(30);
  const [fc2, setFc2] = useState(70);
  const filterData = buildFilter(filterType, fc, fc2, 30, 500, clock);

  const [fcBP, setFcBP] = useState(200);
  const [fm, setFm] = useState(10);
  const [m, setM] = useState(0.5);
  const analytic = buildAnalytic(fcBP, fm, m, 1000, clock);

  const [mode, setMode] = useState<'baseband' | 'bandpass'>('bandpass');
  const bb = buildBasebandBandpass(60, fcBP, 1000);
  const trace = mode === 'baseband' ? bb.baseband : bb.bandpass;
  const span = halfPowerBandwidth(bb.freqs, trace);

  const showFc2 = filterType === 'bpf' || filterType === 'bsf';

  const fMax = bb.fs / 2;
  const [bbLo, bbHi, onWheelBB, , onPanBB] = useZoom(-fMax, fMax, { minSpan: 10, maxSpan: fMax * 2 });

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.filter')}>
          <Select
            label={t('fourier.filter.type')}
            value={filterType}
            options={[
              { value: 'lpf', label: t('fourier.filter.type.lpf') },
              { value: 'hpf', label: t('fourier.filter.type.hpf') },
              { value: 'bpf', label: t('fourier.filter.type.bpf') },
              { value: 'bsf', label: t('fourier.filter.type.bsf') },
              { value: 'rc', label: t('fourier.filter.type.rc') },
            ]}
            onChange={setFilterType}
          />
          <Slider label={t('fourier.filter.fc')} value={fc} min={5} max={100} step={5} unit="Hz" onChange={setFc} />
          {showFc2 && (
            <Slider label={t('fourier.filter.fc2')} value={fc2} min={fc + 5} max={150} step={5} unit="Hz" onChange={setFc2} />
          )}
        </Panel>
        <Panel title={t('fourier.panel.analytic')}>
          <Slider label={t('fourier.bp.fc')} value={fcBP} min={50} max={500} step={10} unit="Hz" onChange={setFcBP} />
          <Slider label={t('fourier.bp.fm')} value={fm} min={1} max={50} step={1} unit="Hz" onChange={setFm} />
          <Slider label={t('fourier.bp.m')} value={m} min={0.1} max={0.9} step={0.1} onChange={setM} />
        </Panel>
        <Panel title={t('fourier.panel.baseband')}>
          <Toggle
            label={t('fourier.bb.mode')}
            checked={mode === 'bandpass'}
            onChange={(c) => setMode(c ? 'bandpass' : 'baseband')}
          />
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.panel.filter')}>
          <FilterPlots data={filterData} />
          <p className="fourier__hint"><HintText text={t('fourier.hint.filter')} /></p>
        </Panel>

        <Panel title={t('fourier.panel.baseband')}>
          <Canvas
            height={200}
            ariaLabel="Baseband vs bandpass spectrum with bandwidth marker"
            deps={[bb, mode, bbLo, bbHi]}
            onWheel={onWheelBB}
            onPan={onPanBB}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const ax: Axes = {
                x: linScale([bbLo, bbHi], [PAD.l, w - PAD.r]),
                y: linScale([0, 1.1], [h - PAD.b, PAD.t]),
              };
              drawBandwidthSpan(ctx, ax, span.fLo, span.fHi, `W ≈ ${span.W.toFixed(0)} Hz`);
              drawAxes(ctx, ax, [bbLo, bbHi], { xLabel: '$f\\,(Hz)$', yLabel: '$|X(f)|$' });
              drawLine(ctx, ax, bb.freqs, trace, CHART.blue, 2);
            }}
          />
          <p className="fourier__hint"><HintText text={t('fourier.hint.baseband')} /></p>
        </Panel>

        <Panel title={t('fourier.panel.analytic')}>
          <AnalyticPlots data={analytic} />
          <p className="fourier__hint"><HintText text={t('fourier.hint.iq')} /></p>
        </Panel>

        <TheoryBox title={t('fourier.tab.filters')}>
          {filterType === 'rc' ? (
            <Formula tex="|H(f)|=\dfrac{1}{\sqrt{1+(f/f_c)^2}}" block />
          ) : (
            <Formula tex="Y(f)=H(f)\,X(f)" block />
          )}
          <p>Proakis §2.4 (p. 85): filtering multiplies the spectrum by |H(f)|. Band-stop is the complement of band-pass.</p>
          <Formula tex="x(t)=x_c(t)\cos(2\pi f_c t)-x_s(t)\sin(2\pi f_c t)" block />
          <p>§2.7 (p. 98): I/Q components x_c, x_s are the baseband parts of the lowpass equivalent x_ℓ = x_c + j x_s.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
