import { useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import type { Periodic } from '@/lib/dsp/signals';
import { buildSeriesSynth } from '../model';
import { SeriesSynthPlots } from '../panels';
import type { SectionProps } from './types';

export function FourierSeriesSection({ clock }: SectionProps) {
  const [waveKind, setWaveKind] = useState<Periodic>('square');
  const [f0, setF0] = useState(1);
  const [N, setN] = useState(20);
  const [duty, setDuty] = useState(0.5);
  const data = buildSeriesSynth(waveKind, f0, N, duty, clock);

  // Parseval: fraction of total signal power captured by the N retained harmonics.
  // mags are sine amplitudes Aₙ → power = DC² + Σ Aₙ²/2; total power = mean(x²).
  const capturedPower = data.mags.reduce(
    (s, m, i) => s + (data.freqs[i] === 0 ? m * m : (m * m) / 2),
    0,
  );
  const totalPower = data.ideal.reduce((s, v) => s + v * v, 0) / Math.max(1, data.ideal.length);
  const pct = totalPower > 1e-9 ? Math.min(100, (capturedPower / totalPower) * 100) : 0;
  const pctText = `${pct.toFixed(0)}%`;

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.synthesis')}>
          <Select
            label={t('fourier.syn.waveform')}
            value={waveKind}
            options={[
              { value: 'square', label: t('fourier.syn.waveform.square') },
              { value: 'triangle', label: t('fourier.syn.waveform.triangle') },
              { value: 'sawtooth', label: t('fourier.syn.waveform.sawtooth') },
              { value: 'pulse', label: t('fourier.syn.waveform.pulse') },
            ]}
            onChange={setWaveKind}
          />
          <Slider label={t('fourier.syn.f0')} value={f0} min={0.5} max={5} step={0.1} unit="Hz" onChange={setF0} />
          <Slider label={t('fourier.syn.harmonics')} value={N} min={1} max={50} step={1} onChange={setN} />
          {waveKind === 'pulse' && (
            <Slider label={t('fourier.syn.duty')} value={duty} min={0.1} max={0.9} step={0.05} onChange={setDuty} />
          )}
          <button
            type="button"
            className="fourier__preset"
            onClick={() => {
              setWaveKind('square');
              setN(45);
            }}
          >
            {t('fourier.preset.gibbs')}
          </button>
        </Panel>
      </aside>

      <div className="fourier__content">
        <div className="fourier__readouts">
          <Readout label={t('fourier.readout.dc')} value={data.dcMag.toFixed(3)} />
          <Readout label={t('fourier.readout.c1')} value={data.c1Mag.toFixed(3)} />
          <Readout label={t('fourier.readout.powerN')} value={pctText} />
        </div>
        <Panel title={t('fourier.panel.synthesis')}>
          <SeriesSynthPlots data={data} />
          <p className="fourier__hint">{t('fourier.hint.gibbs')}</p>
        </Panel>
        <TheoryBox title={t('fourier.tab.series')}>
          <Formula tex="x(t)=\sum_{n=-\infty}^{\infty} c_n\,e^{j2\pi n f_0 t}" block />
          <p>Proakis §2.2 (p. 43): a periodic signal is a sum of harmonics of f₀.</p>
          <Formula tex="\frac{1}{T_0}\int_{T_0}|x(t)|^2\,dt=\sum_{n=-\infty}^{\infty}|c_n|^2" block />
          <p>Parseval (§2.2.3): power splits across harmonics — watch how fast it converges as N grows.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
