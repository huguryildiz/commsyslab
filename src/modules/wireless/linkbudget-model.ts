import {
  freeSpacePathLossDb,
  logDistancePathLossDb,
  hataUrbanPathLossDb,
  noiseFloorDbm,
  receivedPowerDbm,
  fadeMarginDb,
} from '@/lib/dsp/linkbudget';
import { requiredEbN0DbForBer } from '@/lib/dsp/ser';
import type { Scheme } from '@/lib/dsp/modulation';
import { linspace } from '@/lib/dsp/math';

export type PathLossModel = 'freespace' | 'logdistance' | 'hata';

export interface LinkBudgetParams {
  txPowerDbm: number;
  txGainDbi: number;
  rxGainDbi: number;
  freqGHz: number;
  distanceKm: number;
  otherLossDb: number;
  bandwidthMHz: number;
  bitRateMbps: number;
  noiseFigureDb: number;
  tempK: number;
  scheme: Scheme;
  M: number;
  targetBer: number;
  pathLossModel: PathLossModel;
  pathLossExponent: number; // n, for log-distance
  hBaseM: number; // base-station height, for Hata
  hMobileM: number; // mobile height, for Hata
  shadowSigmaDb: number;
  targetOutage: number;
}

export const DEFAULT_LINK_BUDGET_PARAMS: LinkBudgetParams = {
  txPowerDbm: 43, // ~20 W base station
  txGainDbi: 15,
  rxGainDbi: 0,
  freqGHz: 0.9,
  distanceKm: 2,
  otherLossDb: 2,
  bandwidthMHz: 5,
  bitRateMbps: 1,
  noiseFigureDb: 7,
  tempK: 290,
  scheme: 'mpsk',
  M: 4, // QPSK (matches the QPSK modulation preset in the panel)
  targetBer: 1e-3,
  pathLossModel: 'hata',
  pathLossExponent: 3.5,
  hBaseM: 30,
  hMobileM: 1.5,
  shadowSigmaDb: 8,
  targetOutage: 0.1,
};

export interface LinkBudgetDerived {
  pathLossDb: number;
  rxPowerDbm: number;
  noiseFloorDbm: number;
  snrDb: number;
  ebN0Db: number;
  requiredEbN0Db: number;
  fadeMarginDb: number;
  linkMarginDb: number;
  effectiveMarginDb: number;
  linkCloses: boolean;
  sensitivityDbm: number;
  maxRangeKm: number;
  waterfall: { label: string; cumDbm: number }[];
  distKm: number[];
  rxByDist: number[];
}

const D0_M = 1000; // log-distance reference distance (1 km)
const RANGE_MIN_KM = 0.05;
const RANGE_MAX_KM = 50;

/** Path loss (dB) at a given distance for the selected model. */
function pathLossAt(p: LinkBudgetParams, distanceKm: number): number {
  const freqHz = p.freqGHz * 1e9;
  switch (p.pathLossModel) {
    case 'freespace':
      return freeSpacePathLossDb(freqHz, distanceKm * 1000);
    case 'logdistance':
      return logDistancePathLossDb(freqHz, distanceKm * 1000, p.pathLossExponent, D0_M);
    case 'hata':
      return hataUrbanPathLossDb(p.freqGHz * 1000, distanceKm, p.hBaseM, p.hMobileM);
  }
}

/** Pure derivation of the link budget. Memoize on params. */
export function deriveLinkBudget(p: LinkBudgetParams): LinkBudgetDerived {
  const bandwidthHz = p.bandwidthMHz * 1e6;
  const bitRate = p.bitRateMbps * 1e6;
  const noiseFloor = noiseFloorDbm(bandwidthHz, p.tempK, p.noiseFigureDb);
  const requiredEbN0Db = requiredEbN0DbForBer(p.scheme, p.M, p.targetBer);
  const fadeMargin = fadeMarginDb(p.shadowSigmaDb, p.targetOutage);
  const bwToRateDb = 10 * Math.log10(bandwidthHz / bitRate);

  const ebN0AtDist = (distanceKm: number): number => {
    const rx = receivedPowerDbm(
      p.txPowerDbm,
      p.txGainDbi,
      p.rxGainDbi,
      pathLossAt(p, distanceKm),
      p.otherLossDb,
    );
    const snr = rx - noiseFloor;
    return snr + bwToRateDb;
  };
  const effMarginAtDist = (distanceKm: number): number =>
    ebN0AtDist(distanceKm) - requiredEbN0Db - fadeMargin;

  const pathLoss = pathLossAt(p, p.distanceKm);
  const rxPower = receivedPowerDbm(
    p.txPowerDbm,
    p.txGainDbi,
    p.rxGainDbi,
    pathLoss,
    p.otherLossDb,
  );
  const snrDb = rxPower - noiseFloor;
  const ebN0Db = snrDb + bwToRateDb;
  const linkMarginDb = ebN0Db - requiredEbN0Db;
  const effectiveMarginDb = linkMarginDb - fadeMargin;
  const sensitivityDbm = noiseFloor + requiredEbN0Db - bwToRateDb;

  let maxRangeKm: number;
  if (effMarginAtDist(RANGE_MIN_KM) < 0) {
    maxRangeKm = 0;
  } else if (effMarginAtDist(RANGE_MAX_KM) >= 0) {
    maxRangeKm = RANGE_MAX_KM;
  } else {
    let lo = RANGE_MIN_KM;
    let hi = RANGE_MAX_KM;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (effMarginAtDist(mid) >= 0) lo = mid;
      else hi = mid;
    }
    maxRangeKm = (lo + hi) / 2;
  }

  const waterfall = [
    { label: 'Tx', cumDbm: p.txPowerDbm },
    { label: '+Gt', cumDbm: p.txPowerDbm + p.txGainDbi },
    { label: '+Gr', cumDbm: p.txPowerDbm + p.txGainDbi + p.rxGainDbi },
    { label: '−PL', cumDbm: p.txPowerDbm + p.txGainDbi + p.rxGainDbi - pathLoss },
    { label: 'Pr', cumDbm: rxPower },
  ];

  const distKm = linspace(RANGE_MIN_KM, RANGE_MAX_KM, 120);
  const rxByDist = distKm.map((d) =>
    receivedPowerDbm(p.txPowerDbm, p.txGainDbi, p.rxGainDbi, pathLossAt(p, d), p.otherLossDb),
  );

  return {
    pathLossDb: pathLoss,
    rxPowerDbm: rxPower,
    noiseFloorDbm: noiseFloor,
    snrDb,
    ebN0Db,
    requiredEbN0Db,
    fadeMarginDb: fadeMargin,
    linkMarginDb,
    effectiveMarginDb,
    linkCloses: effectiveMarginDb >= 0,
    sensitivityDbm,
    maxRangeKm,
    waterfall,
    distKm,
    rxByDist,
  };
}
