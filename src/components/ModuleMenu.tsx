import { Link, useLocation } from 'react-router-dom';
import { t } from '@/i18n';
import { LANDING_MODULES } from '@/pages/landing/modules.config';

interface ModuleMenuProps {
  /** 'page' = full-width launcher grid; 'overlay' = single-column top-bar popover. */
  variant: 'page' | 'overlay';
  /** Called when a live item is selected (used by the overlay to close itself). */
  onNavigate?: () => void;
}

/**
 * Module launcher shared by the /start page and the top-bar ≡ overlay.
 * Renders LANDING_MODULES in chapter order; "soon" modules are non-interactive.
 */
export function ModuleMenu({ variant, onNavigate }: ModuleMenuProps) {
  const { pathname } = useLocation();
  return (
    <ul className={`modmenu modmenu--${variant}`}>
      {LANDING_MODULES.map((m) => {
        const soon = m.status === 'soon';
        const active = pathname === m.route;
        const inner = (
          <>
            <span className="modmenu__num">{m.num}</span>
            <span className="modmenu__title">{t(m.titleKey)}</span>
            <span className="modmenu__chapter">{soon ? t('landing.tile.soon') : m.chapter}</span>
          </>
        );
        return (
          <li key={m.id}>
            {soon ? (
              <span className="modmenu__item modmenu__item--soon" aria-disabled="true">
                {inner}
              </span>
            ) : (
              <Link
                to={m.route}
                className={`modmenu__item${active ? ' modmenu__item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
