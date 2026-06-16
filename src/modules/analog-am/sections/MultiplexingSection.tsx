import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import { buildFdmView } from '../model';
import { FdmBlockDiagram } from '../FdmBlockDiagram';
import { FdmPanel } from '../panels';
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

function FdmInfoCards() {
  return (
    <div className="analog__cards">
      <InfoCard title="FDM — Frequency Division Multiplexing" accent="green">
        <p>
          Each message is bandlimited to <Formula tex="W\,(\mathrm{Hz})" /> by a lowpass filter,
          then modulated onto its own carrier frequency. All modulator outputs are summed into one
          composite signal and transmitted over a single wideband channel (§3.4.1).
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)=\sum_{k=1}^{K}m_k(t)\cos(2\pi f_k t),\quad f_k=f_0+(k-1)\Delta f" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Channels:</span> <Formula tex="K" /> independent messages, each <Formula tex="W\,(\mathrm{Hz})" /> wide</li>
          <li><span className="analog__card__label">Total bandwidth:</span> <Formula tex="K\cdot\Delta f" /> (grows with channel count)</li>
          <li><span className="analog__card__label">Applications:</span> Telephone networks, radio broadcasting, cable TV</li>
        </ul>
      </InfoCard>

      <InfoCard title="Channel Separation Condition" accent="orange">
        <p>
          Adjacent carriers must be spaced far enough apart so their sidebands do not overlap.
          For DSB-AM, each channel occupies <Formula tex="2W\,(\mathrm{Hz})" />, so the spacing must satisfy:
        </p>
        <div className="analog__card__formula">
          <Formula tex="\Delta f\ge 2W\;(\text{DSB-AM})\qquad\Delta f\ge W\;(\text{SSB})" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Overlap:</span> When <Formula tex="\Delta f<2W" />, adjacent bands interfere</li>
          <li><span className="analog__card__label">Effect:</span> Recovered channel picks up its neighbours</li>
          <li><span className="analog__card__label">Guard bands:</span> Extra spacing added in practice to ease filter design</li>
        </ul>
      </InfoCard>

      <InfoCard title="Receiver: BPF + Demodulator" accent="blue">
        <p>
          Each receiver tunes a bandpass filter (BPF) to channel <Formula tex="k" />,
          demodulates to baseband, then lowpass-filters to recover <Formula tex="m_k(t)" />.
          If <Formula tex="\Delta f\ge 2W" />, the BPF completely isolates the desired channel.
        </p>
        <ul>
          <li><span className="analog__card__label">BPF:</span> Centred at <Formula tex="f_k" />, passband width <Formula tex="2W\,(\mathrm{Hz})" /></li>
          <li><span className="analog__card__label">Demodulator:</span> Coherent (DSB-SC) or envelope detector (conventional AM)</li>
          <li><span className="analog__card__label">Crosstalk:</span> Negligible when <Formula tex="\Delta f\ge 2W" />, grows when spacing is tightened</li>
        </ul>
      </InfoCard>
    </div>
  );
}

const FDM_DEFAULTS = { channels: 3, spacing: 19000, bandwidth: 3000, selected: 0 };

export function MultiplexingSection({ clock }: SectionProps) {
  const [channels, setChannels] = useState(FDM_DEFAULTS.channels);
  const [spacing, setSpacing] = useState(FDM_DEFAULTS.spacing);
  const [bandwidth, setBandwidth] = useState(FDM_DEFAULTS.bandwidth);
  const [selected, setSelected] = useState(FDM_DEFAULTS.selected);
  const [resetKey, setResetKey] = useState(0);

  const sel = Math.min(selected, channels - 1);
  const fdmView = useMemo(
    () => buildFdmView({ channels, spacing, bandwidth, selected: sel }),
    [channels, spacing, bandwidth, sel],
  );

  const resetFdm = () => {
    setChannels(FDM_DEFAULTS.channels);
    setSpacing(FDM_DEFAULTS.spacing);
    setBandwidth(FDM_DEFAULTS.bandwidth);
    setSelected(FDM_DEFAULTS.selected);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title="Parameters">
          <Slider label={<HintText text="Channels $(K)$" />} value={channels} min={2} max={4} step={1} onChange={setChannels} />
          <Slider label={<HintText text="Carrier spacing $(\Delta f)$" />} value={spacing / 1000} min={4} max={30} step={1} unit="kHz" onChange={(v) => setSpacing(v * 1000)} />
          <Slider label={<HintText text="Channel bandwidth $(W)$" />} value={bandwidth} min={1000} max={6000} step={500} unit="Hz" onChange={setBandwidth} />
          <Slider label={t('analog.mux.fdm.channel')} value={sel} min={0} max={channels - 1} step={1} onChange={setSelected} />
          <button className="btn--reset" style={{ width: '100%' }} onClick={resetFdm}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6" />
              <path d="M2.5 22v-6h6" />
              <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
              <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
            </svg>
            {t('analog.am.reset')}
          </button>
        </Panel>
      </aside>

      <div className="analog__content">
        <Panel title={t('analog.mux.fdm.diagram')}>
          <div className="analog__fdm-diagram">
            <FdmBlockDiagram key={resetKey} view={fdmView} clock={clock} />
          </div>
        </Panel>
        <Panel title={t('analog.tab.mux')}>
          <FdmPanel key={`${Math.round(fdmView.fMax)}-${resetKey}`} view={fdmView} clock={clock} />
        </Panel>
        <FdmInfoCards />
      </div>
    </div>
  );
}
