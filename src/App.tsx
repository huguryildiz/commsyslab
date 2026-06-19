import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { t } from '@/i18n';
import { BrandIcon } from '@/components/BrandIcon';
import { ModuleMenu } from '@/components/ModuleMenu';
import { ModuleTitle } from '@/components/ModuleTitle';
import { Home } from '@/pages/Home';
import { StartPage } from '@/pages/StartPage';
import { FourierModule } from '@/modules/fourier/FourierModule';
import { AnalogAmModule } from '@/modules/analog-am/AnalogAmModule';
import { AnalogFmModule } from '@/modules/analog-fm/AnalogFmModule';
import { AnalogNoiseModule } from '@/modules/analog-noise/AnalogNoiseModule';
import { RandomProcessModule } from '@/modules/random-process/RandomProcessModule';
import { AdcModule } from '@/modules/sampling-quantization/AdcModule';
import { ModulationModule } from '@/modules/modulation/ModulationModule';
import { BasebandModule } from '@/modules/baseband/BasebandModule';
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';
import { ChannelCodingModule } from '@/modules/channel-coding/ChannelCodingModule';
import { WirelessModule } from '@/modules/wireless/WirelessModule';
import { EndToEndModule } from '@/modules/end-to-end/EndToEndModule';
import './theme/global.css';
import './components/components.css';
import './pages/pages.css';
import './app.css';

/** App shell: top bar (brand + ≡ Modules overlay + theme) and the routed main area.
 *  Lives inside the router so it can use useLocation to auto-close the overlay. */
function Shell() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the module menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close the module menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const applyTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="app">
      <nav className="app__nav">
        <Link to="/" className="app__brand">
          <BrandIcon size={26} />
          <span>{t('app.title')}</span>
        </Link>
        <button
          type="button"
          className="app__menu-btn"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ≡ {t('nav.modules')}
        </button>
        <span className="app__spacer" />
        <button
          type="button"
          className="app__theme"
          aria-label={theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
          title={theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <span className="app__theme-emoji" role="img" aria-hidden="true">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      </nav>

      {menuOpen && (
        <div className="app__menu-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="app__menu-pop" role="menu" onClick={(e) => e.stopPropagation()}>
            <ModuleMenu variant="overlay" onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="app__main">
        <ModuleTitle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/signals" element={<FourierModule />} />
          <Route path="/signals/:tab" element={<FourierModule />} />
          <Route path="/fourier" element={<Navigate to="/signals" replace />} />
          <Route path="/analog-am" element={<AnalogAmModule />} />
          <Route path="/analog-am/:tab" element={<AnalogAmModule />} />
          <Route path="/analog-fm" element={<AnalogFmModule />} />
          <Route path="/analog-fm/:tab" element={<AnalogFmModule />} />
          <Route path="/analog-noise" element={<AnalogNoiseModule />} />
          <Route path="/analog-noise/:tab" element={<AnalogNoiseModule />} />
          <Route path="/random-process" element={<RandomProcessModule />} />
          <Route path="/random-process/:tab" element={<RandomProcessModule />} />
          <Route path="/sampling" element={<AdcModule />} />
          {/* Old deep link: Delta Modulation now lives under the Waveform Coding tab. */}
          <Route path="/sampling/deltamod" element={<Navigate to="/sampling/waveform" replace />} />
          <Route path="/sampling/:tab" element={<AdcModule />} />
          {/* Delta Modulation is now a tab inside the Analog-to-Digital Conversion module. */}
          <Route path="/delta-modulation" element={<Navigate to="/sampling" replace />} />
          <Route path="/modulation" element={<ModulationModule />} />
          <Route path="/modulation/:tab" element={<ModulationModule />} />
          <Route path="/information-theory" element={<InfoTheoryModule />} />
          <Route path="/information-theory/:tab" element={<InfoTheoryModule />} />
          <Route path="/channel-coding" element={<ChannelCodingModule />} />
          <Route path="/channel-coding/:tab" element={<ChannelCodingModule />} />
          <Route path="/baseband" element={<BasebandModule />} />
          <Route path="/baseband/:tab" element={<BasebandModule />} />
          <Route path="/wireless" element={<WirelessModule />} />
          <Route path="/wireless/:tab" element={<WirelessModule />} />
          <Route path="/end-to-end" element={<EndToEndModule />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
