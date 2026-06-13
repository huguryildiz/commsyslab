/**
 * Landing modül haritası — bento ızgarası, sinyal zinciri ve yönlendirme için
 * tek doğruluk kaynağı. Sıra iletişim zincirini izler:
 * kaynak → örnekleme → kaynak kodlama → modülasyon → kanal → sezim → alıcı.
 */
export type ModuleStatus = 'live' | 'soon';
export type VizKind = 'constellation' | 'sampling' | 'entropy' | 'linkpulse';
export type BentoArea = 'mod' | 'samp' | 'info' | 'base' | 'e2e';

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
  /** Kompakt canlı karo: açıklama gizli, viz alt yarıyı doldurur. */
  compact?: boolean;
}

export const LANDING_MODULES: LandingModule[] = [
  {
    id: 'modulation',
    num: '03',
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
    num: '01',
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
    num: '02',
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
    num: '04',
    titleKey: 'landing.mod.baseband.title',
    descKey: 'landing.mod.baseband.desc',
    chapter: 'CH 8',
    route: '/baseband',
    status: 'soon',
    area: 'base',
  },
  {
    id: 'end-to-end',
    num: '05',
    titleKey: 'landing.mod.e2e.title',
    descKey: 'landing.mod.e2e.desc',
    chapter: 'All',
    route: '/end-to-end',
    status: 'soon',
    area: 'e2e',
    viz: 'linkpulse',
  },
];

/** Sinyal zinciri şeridindeki duraklar (soldan sağa). */
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
