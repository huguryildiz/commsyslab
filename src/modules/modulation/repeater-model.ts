import {
  regenerativeBer,
  analogBer,
  requiredEbN0DbRegen,
  requiredEbN0DbAnalog,
} from '@/lib/dsp/repeater';

export interface RepeaterParams {
  K: number;
  ebN0Db: number;
  targetBer: number;
}

type Pt = { ebN0Db: number; pe: number };

export interface RepeaterView {
  K: number;
  regenNow: number;
  analogNow: number;
  reqRegenDb: number;
  reqAnalogDb: number;
  gapDb: number;
  regenCurve: Pt[];
  analogCurve: Pt[];
  /** Per-hop relative noise: analog accumulates, regenerative resets each hop. */
  hops: { hop: number; analog: number; regen: number }[];
}

const DB_MAX = 20;

/** Build plot-ready regenerative-vs-analog repeater data. */
export function buildRepeaterView(p: RepeaterParams): RepeaterView {
  const { K, ebN0Db, targetBer } = p;
  const regenCurve: Pt[] = [];
  const analogCurve: Pt[] = [];
  for (let db = 0; db <= DB_MAX; db += 1) {
    regenCurve.push({ ebN0Db: db, pe: regenerativeBer(K, db) });
    analogCurve.push({ ebN0Db: db, pe: analogBer(K, db) });
  }
  // Relative accumulated noise variance across hops (regen detects/cleans each hop).
  const hops = Array.from({ length: K }, (_, i) => ({
    hop: i + 1,
    analog: i + 1, // noise variance grows ∝ number of analog hops
    regen: 1, // each regenerative hop starts from a clean decision
  }));
  return {
    K,
    regenNow: regenerativeBer(K, ebN0Db),
    analogNow: analogBer(K, ebN0Db),
    reqRegenDb: requiredEbN0DbRegen(K, targetBer),
    reqAnalogDb: requiredEbN0DbAnalog(K, targetBer),
    gapDb: requiredEbN0DbAnalog(K, targetBer) - requiredEbN0DbRegen(K, targetBer),
    regenCurve,
    analogCurve,
    hops,
  };
}
