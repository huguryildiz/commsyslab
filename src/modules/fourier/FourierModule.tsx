/**
 * Signals & Spectra module — 6-tab shell (Proakis & Salehi Chapter 2).
 * Tabs: Signals & Systems · Convolution · Fourier Series · Fourier Transform & Spectra · Filters · Bandpass Signals.
 * URL pattern: /signals (default) · /signals/convolution · /signals/series · /signals/transform · /signals/filters · /signals/bandpass
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { SignalsSystemsSection } from './sections/SignalsSystemsSection';
import { ConvolutionSection } from './sections/ConvolutionSection';
import { FourierSeriesSection } from './sections/FourierSeriesSection';
import { FourierTransformSection } from './sections/FourierTransformSection';
import { FiltersSection } from './sections/FiltersSection';
import { BandpassSignalsSection } from './sections/BandpassSignalsSection';
import './fourier.css';

type Tab = 'signals' | 'conv' | 'series' | 'transform' | 'filters' | 'bandpass';

const TAB_TO_SLUG: Record<Tab, string> = {
  signals: '',
  conv: 'convolution',
  series: 'series',
  transform: 'transform',
  filters: 'filters',
  bandpass: 'bandpass',
};

const SLUG_TO_TAB: Record<string, Tab> = {
  '': 'signals',
  convolution: 'conv',
  series: 'series',
  transform: 'transform',
  filters: 'filters',
  bandpass: 'bandpass',
};

export function FourierModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = SLUG_TO_TAB[slug] ?? 'signals';
  const clock = 0;

  const handleTabChange = (v: string) => {
    const newSlug = TAB_TO_SLUG[v as Tab];
    navigate(newSlug ? `/signals/${newSlug}` : '/signals', { replace: true });
  };

  return (
    <div className="fourier">
      <div className="fourier__tabbar">
        <Segmented
          ariaLabel={t('fourier.tab.signals')}
          value={tab}
          options={[
            { value: 'signals', label: t('fourier.tab.signals') },
            { value: 'conv', label: t('fourier.tab.conv') },
            { value: 'series', label: t('fourier.tab.series') },
            { value: 'transform', label: t('fourier.tab.transform') },
            { value: 'filters', label: t('fourier.tab.filters') },
            { value: 'bandpass', label: t('fourier.tab.bandpass') },
          ]}
          onChange={handleTabChange}
        />
      </div>

      {tab === 'signals' && <SignalsSystemsSection clock={clock} />}
      {tab === 'conv' && <ConvolutionSection />}
      {tab === 'series' && <FourierSeriesSection clock={clock} />}
      {tab === 'transform' && <FourierTransformSection clock={clock} />}
      {tab === 'filters' && <FiltersSection />}
      {tab === 'bandpass' && <BandpassSignalsSection clock={clock} />}
    </div>
  );
}
