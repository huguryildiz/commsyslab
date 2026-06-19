import { useMemo, useState } from 'react';
import { Panel, Slider, Segmented, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import { buildFdmView, buildQamView } from '../model';
import { FdmBlockDiagram } from '../FdmBlockDiagram';
import { FdmPanel, QamPanel } from '../panels';
import type { SectionProps } from './types';

type MuxKind = 'fdm' | 'qam';

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

function QamInfoCards() {
  return (
    <div className="analog__cards">
      <InfoCard title="Quadrature-Carrier Multiplexing (QAM)" accent="green">
        <p>
          Two message signals share <strong>one carrier frequency</strong> by riding on the
          orthogonal in-phase (<Formula tex="\cos" />) and quadrature (<Formula tex="\sin" />)
          carriers. Their sum is transmitted over the channel (Eq. 3.4.1):
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)=A_c\,m_1(t)\cos(2\pi f_c t)+A_c\,m_2(t)\sin(2\pi f_c t)" block />
        </div>
        <ul>
          <li><span className="analog__card__label">Channel 1:</span> <Formula tex="m_1(t)" /> on the in-phase carrier <Formula tex="\cos(2\pi f_c t)" /></li>
          <li><span className="analog__card__label">Channel 2:</span> <Formula tex="m_2(t)" /> on the quadrature carrier <Formula tex="\sin(2\pi f_c t)" /></li>
          <li><span className="analog__card__label">Bandwidth:</span> Two messages in the same <Formula tex="2W" /> as one DSB channel</li>
        </ul>
      </InfoCard>

      <InfoCard title="Synchronous Demodulation" accent="orange">
        <p>
          Each channel is recovered by multiplying with its own quadrature carrier, then
          lowpass-filtering away the <Formula tex="2f_c" /> terms (Eq. 3.4.2):
        </p>
        <div className="analog__card__formula">
          <Formula tex="u(t)\cos(2\pi f_c t)\xrightarrow{\text{LPF}}\tfrac{A_c}{2}m_1(t)" block />
        </div>
        <div className="analog__card__formula">
          <Formula tex="u(t)\sin(2\pi f_c t)\xrightarrow{\text{LPF}}\tfrac{A_c}{2}m_2(t)" block />
        </div>
        <ul>
          <li>Orthogonality of <Formula tex="\cos" /> and <Formula tex="\sin" /> keeps the channels separate</li>
          <li>Requires a phase-coherent local carrier (balanced/synchronous detector)</li>
        </ul>
      </InfoCard>

      <InfoCard title="Phase Error → Crosstalk" accent="blue">
        <p>
          A receiver phase error <Formula tex="\phi" /> rotates the I/Q axes, so each recovered
          channel leaks a <Formula tex="\sin\phi" /> fraction of the other — the crosstalk grows
          with <Formula tex="\phi" />:
        </p>
        <div className="analog__card__formula">
          <Formula tex="\hat{m}_1(t)=\tfrac{A_c}{2}\bigl[m_1(t)\cos\phi - m_2(t)\sin\phi\bigr]" block />
        </div>
        <ul>
          <li><Formula tex="\phi=0" /> → perfect separation, no crosstalk</li>
          <li><Formula tex="\phi=90°" /> → the two channels swap entirely</li>
          <li>QAM therefore demands tight carrier phase synchronisation</li>
        </ul>
      </InfoCard>
    </div>
  );
}

const FDM_DEFAULTS = { channels: 3, spacing: 19000, bandwidth: 3000, selected: 0 };
const QAM_DEFAULTS = { m1Freq: 1000, m2Freq: 2000, carrierFreq: 20000, phaseErrorDeg: 0 };

export function MultiplexingSection({ clock }: SectionProps) {
  const [kind, setKind] = useState<MuxKind>('fdm');
  const [channels, setChannels] = useState(FDM_DEFAULTS.channels);
  const [spacing, setSpacing] = useState(FDM_DEFAULTS.spacing);
  const [bandwidth, setBandwidth] = useState(FDM_DEFAULTS.bandwidth);
  const [selected, setSelected] = useState(FDM_DEFAULTS.selected);
  const [m1Freq, setM1Freq] = useState(QAM_DEFAULTS.m1Freq);
  const [m2Freq, setM2Freq] = useState(QAM_DEFAULTS.m2Freq);
  const [qamCarrier, setQamCarrier] = useState(QAM_DEFAULTS.carrierFreq);
  const [phaseErrorDeg, setPhaseErrorDeg] = useState(QAM_DEFAULTS.phaseErrorDeg);
  const [resetKey, setResetKey] = useState(0);

  const sel = Math.min(selected, channels - 1);
  const fdmView = useMemo(
    () => buildFdmView({ channels, spacing, bandwidth, selected: sel }),
    [channels, spacing, bandwidth, sel],
  );
  const qamView = useMemo(
    () => buildQamView({ m1Freq, m2Freq, carrierFreq: qamCarrier, phaseErrorDeg }),
    [m1Freq, m2Freq, qamCarrier, phaseErrorDeg],
  );

  const reset = () => {
    if (kind === 'fdm') {
      setChannels(FDM_DEFAULTS.channels);
      setSpacing(FDM_DEFAULTS.spacing);
      setBandwidth(FDM_DEFAULTS.bandwidth);
      setSelected(FDM_DEFAULTS.selected);
    } else {
      setM1Freq(QAM_DEFAULTS.m1Freq);
      setM2Freq(QAM_DEFAULTS.m2Freq);
      setQamCarrier(QAM_DEFAULTS.carrierFreq);
      setPhaseErrorDeg(QAM_DEFAULTS.phaseErrorDeg);
    }
    setResetKey((k) => k + 1);
  };

  return (
    <div className="analog__section">
      <div className="analog__subtabbar">
        <Segmented<MuxKind>
          ariaLabel={t('analog.mux.kind')}
          value={kind}
          options={[
            { value: 'fdm', label: t('analog.mux.kind.fdm') },
            { value: 'qam', label: t('analog.mux.kind.qam') },
          ]}
          onChange={setKind}
        />
      </div>

      <div className="module-layout">
        <aside className="analog__controls">
          <Panel title={t('analog.am.parameters')}>
            {kind === 'fdm' ? (
              <>
                <Slider label={<HintText text="Channels $(K)$" />} value={channels} min={2} max={4} step={1} onChange={setChannels} />
                <Slider label={<HintText text="Carrier spacing $(\Delta f)$" />} value={spacing / 1000} min={4} max={30} step={1} unit="kHz" onChange={(v) => setSpacing(v * 1000)} />
                <Slider label={<HintText text="Channel bandwidth $(W)$" />} value={bandwidth} min={1000} max={6000} step={500} unit="Hz" onChange={setBandwidth} />
                <Slider label={t('analog.mux.fdm.channel')} value={sel} min={0} max={channels - 1} step={1} onChange={setSelected} />
              </>
            ) : (
              <>
                <Slider label={<HintText text="Channel 1 freq $(m_1)$" />} value={m1Freq} min={500} max={4000} step={100} unit="Hz" onChange={setM1Freq} />
                <Slider label={<HintText text="Channel 2 freq $(m_2)$" />} value={m2Freq} min={500} max={4000} step={100} unit="Hz" onChange={setM2Freq} />
                <Slider label={<HintText text="Carrier $(f_c)$" />} value={qamCarrier / 1000} min={10} max={40} step={1} unit="kHz" onChange={(v) => setQamCarrier(v * 1000)} />
                <Slider label={<HintText text={t('analog.mux.qam.phase')} />} value={phaseErrorDeg} min={0} max={90} step={1} unit="°" onChange={setPhaseErrorDeg} />
              </>
            )}
            <button className="btn--reset" style={{ width: '100%' }} onClick={reset}>
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
          {kind === 'fdm' ? (
            <>
              <Panel title={t('analog.mux.fdm.diagram')}>
                <div className="analog__fdm-diagram">
                  <FdmBlockDiagram key={resetKey} view={fdmView} clock={clock} />
                </div>
              </Panel>
              <Panel title={t('analog.tab.mux')}>
                <FdmPanel key={`${Math.round(fdmView.fMax)}-${resetKey}`} view={fdmView} clock={clock} />
              </Panel>
              <FdmInfoCards />
            </>
          ) : (
            <>
              <div className="analog__readouts">
                <div className="analog__metric">
                  <span className="analog__metric__label">{t('analog.mux.qam.crosstalk')}</span>
                  <span
                    className={`analog__metric__value ${qamView.crosstalkDb <= -20 ? 'analog__metric__value--ok' : 'analog__metric__value--warn'}`}
                  >
                    {qamView.crosstalkDb.toFixed(1)}<small>dB</small>
                  </span>
                </div>
              </div>
              <Panel title={t('analog.mux.kind.qam')}>
                <QamPanel key={resetKey} view={qamView} />
              </Panel>
              <div className="analog__hint">{t('analog.mux.observe.qam')}</div>
              <QamInfoCards />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
