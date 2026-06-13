import { useMemo, useState } from 'react';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ProcessParams } from './model';
import { GeneratorControls } from './panels';
import { EnsembleSection } from './sections/EnsembleSection';
import { AutocorrSection } from './sections/AutocorrSection';
import { PsdSection } from './sections/PsdSection';
import { FilterSection } from './sections/FilterSection';
import './random-process.css';

export function RandomProcessModule() {
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PARAMS);
  const set = (patch: Partial<ProcessParams>) => setParams((p) => ({ ...p, ...patch }));
  const resample = () => setParams((p) => ({ ...p, seed: p.seed + 1 }));

  const d = useMemo(() => deriveAll(params), [params]);

  return (
    <div className="rp">
      <header className="rp__head">
        <h1>{t('rp.title')}</h1>
        <p>{t('rp.subtitle')}</p>
      </header>
      <GeneratorControls params={params} set={set} resample={resample} />
      <div className="rp__grid">
        <EnsembleSection params={params} d={d} />
        <AutocorrSection d={d} />
        <PsdSection params={params} d={d} />
        <FilterSection params={params} d={d} />
      </div>
    </div>
  );
}
