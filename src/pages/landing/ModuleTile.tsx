import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import type { LandingModule, VizKind } from './modules.config';
import { ConstellationViz } from './viz/ConstellationViz';
import { SamplingViz } from './viz/SamplingViz';
import { EntropyViz } from './viz/EntropyViz';
import { LinkPulseViz } from './viz/LinkPulseViz';
import { FourierViz } from './viz/FourierViz';
import { AmFmViz } from './viz/AmFmViz';
import { NoiseViz } from './viz/NoiseViz';

function Viz({ kind }: { kind: VizKind }) {
  switch (kind) {
    case 'constellation':
      return <ConstellationViz />;
    case 'sampling':
      return <SamplingViz />;
    case 'entropy':
      return <EntropyViz />;
    case 'linkpulse':
      return <LinkPulseViz />;
    case 'fourier':
      return <FourierViz />;
    case 'amfm':
      return <AmFmViz />;
    case 'noise':
      return <NoiseViz />;
    default:
      return null;
  }
}

export function ModuleTile({ m }: { m: LandingModule }) {
  const soon = m.status === 'soon';
  const className = ['tile', m.flagship && 'tile--flagship', m.compact && 'tile--compact', soon && 'tile--soon']
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <div className="tile__top">
        <span className="tile__num">
          {t('landing.module')} {m.num}
        </span>
        {soon ? (
          <span className="tile__soon">{t('landing.tile.soon')}</span>
        ) : (
          <span className="tile__chapter">{m.chapter}</span>
        )}
      </div>
      <h3 className="tile__title">{t(m.titleKey)}</h3>
      <p className="tile__desc">{t(m.descKey)}</p>
      <span className="tile__open">{soon ? m.chapter : `${t('landing.tile.open')} →`}</span>
      {m.viz ? (
        <div className={`tile__viz tile__viz--${m.viz}`} aria-hidden="true">
          <Viz kind={m.viz} />
        </div>
      ) : null}
    </>
  );

  if (soon) {
    return (
      <div className={className} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link to={m.route} className={className}>
      {body}
    </Link>
  );
}
