/**
 * Landing module map — single source of truth for the landing cards, the /start launcher,
 * and the top-bar module menu. Ordered by book chapter (Proakis & Salehi); see the `num`
 * field and `docs/book-reference.md`.
 */
export type ModuleStatus = 'live' | 'soon';
export type VizKind =
  | 'constellation'
  | 'sampling'
  | 'entropy'
  | 'linkpulse'
  | 'fourier'
  | 'am'
  | 'fm'
  | 'fading'
  | 'noise'
  | 'noisysignal'
  | 'eye'
  | 'channelcoding'
  | 'chain';

export interface LandingModule {
  id: string;
  num: string;
  titleKey: string;
  descKey: string;
  chapter: string;
  route: string;
  status: ModuleStatus;
  viz?: VizKind;
  flagship?: boolean;
  feature?: boolean;
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
    viz: 'fourier',
    compact: true,
  },
  {
    id: 'analog-am',
    num: '02',
    titleKey: 'landing.mod.analog-am.title',
    descKey: 'landing.mod.analog-am.desc',
    chapter: 'CH 3',
    route: '/analog-am',
    status: 'live',
    viz: 'am',
    compact: true,
  },
  {
    id: 'analog-fm',
    num: '03',
    titleKey: 'landing.mod.analog-fm.title',
    descKey: 'landing.mod.analog-fm.desc',
    chapter: 'CH 4',
    route: '/analog-fm',
    status: 'live',
    viz: 'fm',
    compact: true,
  },
  {
    id: 'random-process',
    num: '04',
    titleKey: 'rp.title',
    descKey: 'rp.subtitle',
    chapter: 'CH 5',
    route: '/random-process',
    status: 'live',
    viz: 'noise',
    compact: true,
  },
  {
    id: 'analog-noise',
    num: '05',
    titleKey: 'an.title',
    descKey: 'an.subtitle',
    chapter: 'CH 6',
    route: '/analog-noise',
    status: 'live',
    viz: 'noisysignal',
    compact: true,
  },
  {
    id: 'sampling',
    num: '06',
    titleKey: 'landing.mod.sampling.title',
    descKey: 'landing.mod.sampling.desc',
    chapter: 'CH 7',
    route: '/sampling',
    status: 'live',
    viz: 'sampling',
    compact: true,
  },
  {
    id: 'modulation',
    num: '07',
    titleKey: 'landing.mod.modulation.title',
    descKey: 'landing.mod.modulation.desc',
    chapter: 'CH 8',
    route: '/modulation',
    status: 'live',
    viz: 'constellation',
    flagship: true,
    feature: true,
  },
  {
    id: 'baseband',
    num: '08',
    titleKey: 'landing.mod.baseband.title',
    descKey: 'landing.mod.baseband.desc',
    chapter: 'CH 10',
    route: '/baseband',
    status: 'live',
    viz: 'eye',
    compact: true,
  },
  {
    id: 'infotheory',
    num: '09',
    titleKey: 'landing.mod.infotheory.title',
    descKey: 'landing.mod.infotheory.desc',
    chapter: 'CH 12',
    route: '/information-theory',
    status: 'live',
    viz: 'entropy',
    compact: true,
  },
  {
    id: 'channel-coding',
    num: '10',
    titleKey: 'cc.title',
    descKey: 'cc.subtitle',
    chapter: 'CH 13',
    route: '/channel-coding',
    status: 'live',
    viz: 'channelcoding',
    compact: true,
  },
  {
    id: 'wireless',
    num: '11',
    titleKey: 'wl.title',
    descKey: 'wl.subtitle',
    chapter: 'CH 14·15',
    route: '/wireless',
    status: 'live',
    viz: 'fading',
    compact: true,
  },
  {
    id: 'end-to-end',
    num: '12',
    titleKey: 'landing.mod.e2e.title',
    descKey: 'landing.mod.e2e.desc',
    chapter: 'All',
    route: '/end-to-end',
    status: 'live',
    viz: 'chain',
    compact: true,
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
