import { useState } from 'react';
import { Panel, Slider, Toggle, HintText, Formula } from '@/components';
import { t } from '@/i18n';
import { buildAnalogSuperView } from '../model';
import { SuperheterodynePanel } from '../panels';
import type { SectionProps } from './types';

function InfoCard({
  title,
  accent = 'green',
  children,
}: {
  title: string;
  accent?: 'green' | 'orange' | 'blue';
  children: React.ReactNode;
}) {
  return (
    <div className="analog__card">
      <h3 className={`analog__card__title analog__card__title--${accent}`}>{title}</h3>
      <div className="analog__card__body">{children}</div>
    </div>
  );
}

const DEFAULT_STATION = 1_000_000; // 1 MHz (AM band)
const DEFAULT_IF = 455_000; // 455 kHz standard IF

export function AmRadioSection({ clock }: SectionProps) {
  const [stationFreq, setStationFreq] = useState(DEFAULT_STATION);
  const [ifFreq, setIfFreq] = useState(DEFAULT_IF);
  const [showImage, setShowImage] = useState(false);
  const [preselectorOn, setPreselectorOn] = useState(true);
  // Remounts SuperheterodynePanel on reset so every stage's useZoom re-inits.
  const [resetKey, setResetKey] = useState(0);

  const superView = buildAnalogSuperView({ stationFreq, ifFreq, showImage, preselectorOn });

  const reset = () => {
    setStationFreq(DEFAULT_STATION);
    setIfFreq(DEFAULT_IF);
    setShowImage(false);
    setPreselectorOn(true);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title="Parameters">
          <Slider
            label={<HintText text="Station frequency $(f_c)$" />}
            value={stationFreq / 1000}
            min={540}
            max={1600}
            step={10}
            unit="kHz"
            onChange={(v) => setStationFreq(v * 1000)}
          />
          <Slider
            label={<HintText text="IF frequency $(f_\mathrm{IF})$" />}
            value={ifFreq / 1000}
            min={100}
            max={500}
            step={5}
            unit="kHz"
            onChange={(v) => setIfFreq(v * 1000)}
          />
          <Toggle
            label={t('analog.super.showImage')}
            checked={showImage}
            onChange={setShowImage}
          />
          <Toggle
            label={t('analog.super.preselector')}
            checked={preselectorOn}
            onChange={setPreselectorOn}
          />
          <button type="button" className="analog__reset" onClick={reset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6" />
              <path d="M2.5 22v-6h6" />
              <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
              <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
            </svg>
            {t('analog.super.reset')}
          </button>
        </Panel>
      </aside>

      <div className="analog__content">

        <Panel title={t('analog.super.title')}>
          <SuperheterodynePanel key={resetKey} view={superView} clock={clock} />
        </Panel>

        <div className="analog__cards">
          <InfoCard title="Local Oscillator" accent="green">
            <p>
              The LO is tuned above the station by exactly <Formula tex="f_\mathrm{IF}" />.
              The mixer produces a difference term that always lands on the fixed IF
              regardless of which station is selected (Proakis §3.5).
            </p>
            <div className="analog__card__formula">
              <Formula tex="f_\mathrm{LO} = f_c + f_\mathrm{IF}" block />
            </div>
            <ul>
              <li>
                <span className="analog__card__label">Current value:</span>{' '}
                <Formula tex={`f_\\mathrm{LO} = ${(superView.loFreq / 1000).toFixed(0)}\\,\\mathrm{kHz}`} />
              </li>
              <li>
                <span className="analog__card__label">Strategy:</span> High-side injection keeps
                <Formula tex="f_\mathrm{LO}" /> above the AM band, simplifying filter design
              </li>
            </ul>
          </InfoCard>

          <InfoCard title="Image Frequency" accent="orange">
            <p>
              A station at <Formula tex="f_c + 2f_\mathrm{IF}" /> also mixes down to
              <Formula tex="f_\mathrm{IF}" /> and cannot be rejected by the IF filter alone —
              it must be suppressed before the mixer.
            </p>
            <div className="analog__card__formula">
              <Formula tex="f_\mathrm{image} = f_c + 2f_\mathrm{IF}" block />
            </div>
            <ul>
              <li>
                <span className="analog__card__label">Current value:</span>{' '}
                <Formula tex={`f_\\mathrm{image} = ${(superView.imageFreq / 1000).toFixed(0)}\\,\\mathrm{kHz}`} />
              </li>
              <li>
                <span className="analog__card__label">Rejection:</span> The RF preselector
                (bandwidth <Formula tex="B_\mathrm{RF} < 2f_\mathrm{IF}" />) blocks the image
                before it reaches the mixer
              </li>
            </ul>
          </InfoCard>

          <InfoCard title="IF Filter &amp; Selectivity" accent="blue">
            <p>
              The IF filter operates at a fixed centre frequency, so it can be made
              extremely narrow and stable — all adjacent-channel selectivity is achieved here,
              not at the RF stage.
            </p>
            <div className="analog__card__formula">
              <Formula tex="f_\mathrm{IF} = |\,f_c - f_\mathrm{LO}\,|" block />
            </div>
            <ul>
              <li>
                <span className="analog__card__label">Standard AM IF:</span>{' '}
                <Formula tex="455\,\mathrm{kHz}" />
              </li>
              <li>
                <span className="analog__card__label">Advantage:</span> One fixed, highly
                selective filter replaces a tunable RF filter
              </li>
            </ul>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
