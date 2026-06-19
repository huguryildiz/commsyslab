import { useState } from 'react';
import { Panel, Slider, Segmented, HintText } from '@/components';
import { t } from '@/i18n';
import { BasebandSection } from './am/BasebandSection';
import { DsbScSection } from './am/DsbScSection';
import { SsbSection } from './am/SsbSection';
import { ConventionalAmSection } from './am/ConventionalAmSection';

export type AmSectionProps = { gammaDb: number; W: number; fm: number; fs: number; N: number };

type Sub = 'baseband' | 'dsb' | 'ssb' | 'am';
const DEFAULTS = { gammaDb: 20, fm: 4, W: 15000 };
const FS = 400;
const N = 512;

export function AmNoiseTab() {
  const [sub, setSub] = useState<Sub>('baseband');
  const [gammaDb, setGammaDb] = useState(DEFAULTS.gammaDb);
  const [fm, setFm] = useState(DEFAULTS.fm);
  const props: AmSectionProps = { gammaDb, W: DEFAULTS.W, fm, fs: FS, N };

  return (
    <div className="an__section">
      <div className="an__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('an.am.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'baseband', label: t('an.am.sub.baseband') },
            { value: 'dsb', label: t('an.am.sub.dsb') },
            { value: 'ssb', label: t('an.am.sub.ssb') },
            { value: 'am', label: t('an.am.sub.am') },
          ]}
          onChange={setSub}
        />
      </div>
      <div className="an__channel">
        <Panel title={t('an.am.channel')}>
          <Slider
            label={<HintText text={t('an.gen.gamma')} />}
            min={0}
            max={40}
            step={1}
            unit="dB"
            value={gammaDb}
            onChange={setGammaDb}
          />
          <Slider
            label={<HintText text={t('an.gen.fm')} />}
            min={1}
            max={12}
            step={1}
            unit="Hz"
            value={fm}
            onChange={setFm}
          />
        </Panel>
      </div>
      {sub === 'baseband' && <BasebandSection {...props} />}
      {sub === 'dsb' && <DsbScSection {...props} />}
      {sub === 'ssb' && <SsbSection {...props} />}
      {sub === 'am' && <ConventionalAmSection {...props} />}
    </div>
  );
}
