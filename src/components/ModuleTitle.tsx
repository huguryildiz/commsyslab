import { useLocation } from 'react-router-dom';
import { t } from '@/i18n';
import { LANDING_MODULES } from '@/pages/landing/modules.config';

/**
 * Per-module page heading shown above each module's tab bar.
 * Resolves the current route against LANDING_MODULES (single source of truth for
 * module titles) so every live module gets a consistent editorial-serif title with
 * the premium green gradient. Renders nothing on non-module routes (Home, /start).
 */
export function ModuleTitle() {
  const { pathname } = useLocation();
  const mod = LANDING_MODULES.find(
    (m) => pathname === m.route || pathname.startsWith(`${m.route}/`),
  );
  if (!mod) return null;
  return <h1 className="module-title">{t(mod.titleKey)}</h1>;
}
