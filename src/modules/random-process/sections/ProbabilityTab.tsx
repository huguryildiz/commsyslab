import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { BayesSection } from './prob/BayesSection';
import { RandomVariableSection } from './prob/RandomVariableSection';
import { FunctionsSection } from './prob/FunctionsSection';
import { JointGaussianSection } from './prob/JointGaussianSection';
import { CltSection } from './prob/CltSection';

type Sub = 'bayes' | 'rv' | 'func' | 'joint' | 'clt';

/**
 * §5.1 Review of Probability and Random Variables.
 * Five sub-tabs mapping 1:1 to the book subsections: Probability & Bayes (5.1.1–5.1.2),
 * Random Variables + Q-function (5.1.3), Functions of an RV (5.1.4), Jointly Gaussian /
 * correlation (5.1.5), Sums & the central limit theorem (5.1.6).
 */
export function ProbabilityTab() {
  const [sub, setSub] = useState<Sub>('bayes');

  return (
    <div className="rp__section">
      <div className="rp__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('rp.prob.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'bayes', label: t('rp.prob.sub.bayes') },
            { value: 'rv', label: t('rp.prob.sub.rv') },
            { value: 'func', label: t('rp.prob.sub.func') },
            { value: 'joint', label: t('rp.prob.sub.joint') },
            { value: 'clt', label: t('rp.prob.sub.clt') },
          ]}
          onChange={setSub}
        />
      </div>

      {sub === 'bayes' && <BayesSection />}
      {sub === 'rv' && <RandomVariableSection />}
      {sub === 'func' && <FunctionsSection />}
      {sub === 'joint' && <JointGaussianSection />}
      {sub === 'clt' && <CltSection />}
    </div>
  );
}
