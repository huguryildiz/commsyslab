import { HintText } from '@/components';
import { t } from '@/i18n';

/**
 * §5.1 Review of Probability and Random Variables — placeholder.
 * The full build (Bayes/binary-channel, distribution explorer + Q-function, functions of a
 * random variable, joint Gaussian / correlation ρ, and the central limit theorem) lands in
 * Phase 2 with a new `dsp/probability.ts`.
 */
export function ProbabilityTab() {
  return (
    <div className="rp__section">
      <div className="rp__placeholder">
        <h3>{t('rp.soon.title')}</h3>
        <p>
          <HintText text={t('rp.soon.prob')} />
        </p>
      </div>
    </div>
  );
}
