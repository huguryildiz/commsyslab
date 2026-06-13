/**
 * Landing module map — single source of truth for bento grid, signal chain, and routing.
 * Follows the communication chain order:
 * source → sampling → source coding → modulation → channel → detection → sink.
 */
export type ModuleStatus = 'live' | 'soon';
export type VizKind = 'constellation' | 'sampling' | 'entropy' | 'linkpulse' | 'fourier' | 'amfm';
export type BentoArea = 'mod' | 'rp' | 'samp' | 'info' | 'base' | 'e2e' | 'four' | 'anal';

export interface LandingModule {
  id: string;
  num: string;
  titleKey: string;
  descKey: string;
  chapter: string;
  route: string;
  status: ModuleStatus;
  area: BentoArea;
  viz?: VizKind;
  flagship?: boolean;
  /** Compact live tile: description hidden, viz fills bottom half. */
  compact?: boolean;
}

export const LANDING_MODULES: LandingModule[] = [
  {
    id: 'fourier',
    num: '01',
    titleKey: 'landing.mod.fourier.title',
    descKey: 'landing.mod.fourier.desc',
    chapter: 'CH 2',
    route: '/fourier',
    status: 'live',
    area: 'four',
    viz: 'fourier',
    compact: true,
  },
  {
    id: 'analog',
    num: '02',
    titleKey: 'landing.mod.analog.title',
    descKey: 'landing.mod.analog.desc',
    chapter: 'CH 3',
    route: '/analog',
    status: 'live',
    area: 'anal',
    viz: 'amfm',
    compact: true,
  },
  {
    id: 'random-process',
    num: '03',
    titleKey: 'rp.title',
    descKey: 'rp.subtitle',
    chapter: 'CH 4',
    route: '/random-process',
    status: 'live',
    area: 'rp',
    viz: 'sampling',
    compact: true,
  },
  {
    id: 'modulation',
    num: '06',
    titleKey: 'landing.mod.modulation.title',
    descKey: 'landing.mod.modulation.desc',
    chapter: 'CH 7',
    route: '/modulation',
    status: 'live',
    area: 'mod',
    viz: 'constellation',
    flagship: true,
  },
  {
    id: 'sampling',
    num: '04',
    titleKey: 'landing.mod.sampling.title',
    descKey: 'landing.mod.sampling.desc',
    chapter: 'CH 4·6',
    route: '/sampling',
    status: 'live',
    area: 'samp',
    viz: 'sampling',
    compact: true,
  },
  {
    id: 'infotheory',
    num: '05',
    titleKey: 'landing.mod.infotheory.title',
    descKey: 'landing.mod.infotheory.desc',
    chapter: 'CH 6',
    route: '/information-theory',
    status: 'live',
    area: 'info',
    viz: 'entropy',
    compact: true,
  },
  {
    id: 'baseband',
    num: '07',
    titleKey: 'landing.mod.baseband.title',
    descKey: 'landing.mod.baseband.desc',
    chapter: 'CH 8',
    route: '/baseband',
    status: 'soon',
    area: 'base',
  },
  {
    id: 'end-to-end',
    num: '08',
    titleKey: 'landing.mod.e2e.title',
    descKey: 'landing.mod.e2e.desc',
    chapter: 'All',
    route: '/end-to-end',
    status: 'soon',
    area: 'e2e',
    viz: 'linkpulse',
  },
];

/** Flow stops in the signal chain strip (left to right). */
export interface FlowStop {
  key: string;
  x: number;
  channel?: boolean;
}

export const FLOW_STOPS: FlowStop[] = [
  { key: 'landing.flow.source', x: 20 },
  { key: 'landing.flow.sample', x: 190 },
  { key: 'landing.flow.code', x: 360 },
  { key: 'landing.flow.modulate', x: 510 },
  { key: 'landing.flow.channel', x: 650, channel: true },
  { key: 'landing.flow.detect', x: 800 },
  { key: 'landing.flow.sink', x: 930 },
];
