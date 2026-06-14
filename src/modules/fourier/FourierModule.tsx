/**
 * Signals & Spectra module — 4-tab shell (Proakis & Salehi Chapter 2).
 * Tabs: Signals & Systems · Fourier Series · Fourier Transform & Spectra · Filters & Bandpass.
 */
import { useEffect, useState } from 'react';
import { Segmented, Panel, TransportControls } from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { SignalsSystemsSection } from './sections/SignalsSystemsSection';
import { FourierSeriesSection } from './sections/FourierSeriesSection';
import { FourierTransformSection } from './sections/FourierTransformSection';
import { FilterBandpassSection } from './sections/FilterBandpassSection';
import './fourier.css';

type Tab = 'signals' | 'series' | 'transform' | 'filters';

export function FourierModule() {
  const [tab, setTab] = useState<Tab>('signals');
  const [clock, setClock] = useState(0);
  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => setClock(simTime),
    onReset: () => setClock(0),
  });

  // Auto-play on mount unless the user prefers reduced motion.
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) loop.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fourier">
      <div className="fourier__tabbar">
        <Segmented
          ariaLabel={t('fourier.tab.signals')}
          value={tab}
          options={[
            { value: 'signals', label: t('fourier.tab.signals') },
            { value: 'series', label: t('fourier.tab.series') },
            { value: 'transform', label: t('fourier.tab.transform') },
            { value: 'filters', label: t('fourier.tab.filters') },
          ]}
          onChange={(v) => setTab(v as Tab)}
        />
        <Panel title={t('fourier.animation')}>
          <TransportControls loop={loop} />
        </Panel>
      </div>

      {tab === 'signals' && <SignalsSystemsSection clock={clock} loop={loop} />}
      {tab === 'series' && <FourierSeriesSection clock={clock} loop={loop} />}
      {tab === 'transform' && <FourierTransformSection clock={clock} loop={loop} />}
      {tab === 'filters' && <FilterBandpassSection clock={clock} loop={loop} />}
    </div>
  );
}
