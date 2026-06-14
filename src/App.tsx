import { useEffect, useState } from 'react';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { t } from '@/i18n';
import { BrandIcon } from '@/components/BrandIcon';
import { ModuleMenu } from '@/components/ModuleMenu';
import { Home } from '@/pages/Home';
import { StartPage } from '@/pages/StartPage';
import { FourierModule } from '@/modules/fourier/FourierModule';
import { AnalogModule } from '@/modules/analog/AnalogModule';
import { AnalogNoiseModule } from '@/modules/analog-noise/AnalogNoiseModule';
import { RandomProcessModule } from '@/modules/random-process/RandomProcessModule';
import { SamplingModule } from '@/modules/sampling-quantization/SamplingModule';
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
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '☀' : '☾'}
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/fourier" element={<FourierModule />} />
          <Route path="/analog" element={<AnalogModule />} />
          <Route path="/analog-noise" element={<AnalogNoiseModule />} />
          <Route path="/random-process" element={<RandomProcessModule />} />
          <Route path="/sampling" element={<SamplingModule />} />
          <Route path="/modulation" element={<ModulationModule />} />
          <Route path="/information-theory" element={<InfoTheoryModule />} />
          <Route path="/channel-coding" element={<ChannelCodingModule />} />
          <Route path="/baseband" element={<BasebandModule />} />
          <Route path="/wireless" element={<WirelessModule />} />
          <Route path="/end-to-end" element={<EndToEndModule />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
