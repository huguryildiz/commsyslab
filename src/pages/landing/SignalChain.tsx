import { t } from '@/i18n';
import { FLOW_STOPS } from './modules.config';

/** Thin, animated signal-chain strip: source → ... → sink. */
export function SignalChain() {
  return (
    <div className="flow">
      <span className="flow__label">{t('landing.flow.label')}</span>
      <div className="flow__track">
        <svg className="flow__svg" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-x)" />
              <stop offset="55%" stopColor="var(--color-y)" />
              <stop offset="100%" stopColor="var(--color-h)" />
            </linearGradient>
          </defs>
          <line
            x1="20"
            y1="16"
            x2="980"
            y2="16"
            stroke="url(#flowGrad)"
            strokeWidth="2"
            strokeDasharray="2 6"
            opacity="0.55"
          />
          <path
            d="M560 16 q10 -9 20 0 t20 0 t20 0 t20 0"
            fill="none"
            stroke="var(--color-marker)"
            strokeWidth="1.6"
            opacity="0.7"
          />
        </svg>
        <span className="flow__packet" aria-hidden="true" />
        <div className="flow__stops">
          {FLOW_STOPS.map((s) => (
            <span
              key={s.key}
              className={`flow__stop${s.channel ? ' flow__stop--chan' : ''}`}
              style={{ left: `${s.x / 10}%` }}
            >
              {t(s.key)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
