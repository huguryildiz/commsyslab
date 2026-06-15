/**
 * Amplitude Modulation module — 4-tab shell (Proakis & Salehi Chapter 3).
 * Tabs: AM Schemes (§3.2) · Modulators & Demodulators (§3.3) ·
 * Signal Multiplexing (§3.4) · AM Radio Broadcasting (§3.5).
 * Tab selection is URL-addressable: /analog-am (Schemes) and /analog-am/:tab.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { AmSchemesSection } from './sections/AmSchemesSection';
import { ModDemodSection } from './sections/ModDemodSection';
import { AmRadioSection } from './sections/AmRadioSection';
import { MultiplexingSection } from './sections/MultiplexingSection';
import './analog-am.css';

type Tab = 'schemes' | 'modimpl' | 'mux' | 'radio';

export function AnalogAmModule() {
  // Tab is URL-addressable: /analog-am → schemes; /analog-am/:tab → that tab.
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'schemes';

  const handleTabChange = (v: Tab) => {
    navigate(v === 'schemes' ? '/analog-am' : `/analog-am/${v}`, { replace: true });
  };

  // One shared animation clock drives whichever section is active.
  const [clock, setClock] = useState(0);
  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => setClock(simTime),
    onReset: () => setClock(0),
  });
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) loop.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="analog">
      <div className="analog__tabbar">
        <Segmented<Tab>
          ariaLabel={t('analog.tab.ariaLabel')}
          value={tab}
          options={[
            { value: 'schemes', label: t('analog.tab.schemes') },
            { value: 'modimpl', label: t('analog.tab.modimpl') },
            { value: 'mux', label: t('analog.tab.mux') },
            { value: 'radio', label: t('analog.tab.radio') },
          ]}
          onChange={handleTabChange}
        />
      </div>

      {tab === 'schemes' && <AmSchemesSection clock={clock} loop={loop} />}
      {tab === 'modimpl' && <ModDemodSection clock={clock} loop={loop} />}
      {tab === 'mux' && <MultiplexingSection clock={clock} loop={loop} />}
      {tab === 'radio' && <AmRadioSection clock={clock} loop={loop} />}
    </div>
  );
}
