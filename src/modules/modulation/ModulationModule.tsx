import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  TheoryBox,
  Formula,
  TransportControls,
  Segmented,
} from '@/components';
import { t } from '@/i18n';
import type { Scheme } from '@/lib/dsp/modulation';
import { simulateSer } from '@/lib/dsp/ser';
import { addAwgn } from '@/lib/dsp/awgn';
import { detectML, detectMAP } from '@/lib/dsp/detector';
import { makeRng, textToBits, bitsToText } from '@/lib/sim/sources';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { buildModulationView, type Decision } from './model';
import { transmit, SMILEY } from './codec';
import {
  ConstellationPanel,
  ThresholdPanel,
  SerCurvePanel,
  BitmapView,
  type CloudPt,
} from './panels';
import { OptimumReceiverSection } from './OptimumReceiverSection';
import './modulation.css';

const M_OPTIONS: Record<Scheme, number[]> = {
  bpsk: [2],
  bask: [2],
  bfsk: [2],
  mpsk: [2, 4, 8, 16],
  mask: [2, 4, 8],
  mqam: [4, 16, 64],
  mfsk: [2, 4, 8],
};

const CLOUD_MAX = 400;
const BATCH = 40;

export function ModulationModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab = (slug as 'detection' | 'optrx') || 'detection';

  const handleTabChange = (v: string) => {
    navigate(v === 'detection' ? '/modulation' : `/modulation/${v}`, { replace: true });
  };
  const [scheme, setScheme] = useState<Scheme>('mpsk');
  const [M, setM] = useState(4);
  const [ebN0Db, setEbN0Db] = useState(8);
  const [numSymbols, setNumSymbols] = useState(2000);
  const [decision, setDecision] = useState<Decision>('ml');
  const [prior0, setPrior0] = useState(0.5);
  const [showRegions, setShowRegions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const [simPoints, setSimPoints] = useState<{ ebN0Db: number; ser: number }[]>([]);
  const [cloud, setCloud] = useState<CloudPt[]>([]);
  const [arrow, setArrow] = useState<
    { from: { x: number; y: number }; to: { x: number; y: number } } | undefined
  >();
  const [liveSer, setLiveSer] = useState<{ errors: number; total: number } | null>(null);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const cloudRef = useRef<CloudPt[]>([]);
  const rngRef = useRef(makeRng(12345));

  // Clear accumulated live/sweep results so visuals never mix data from a
  // previous constellation or decision rule.
  const resetResults = () => {
    setSimPoints([]);
    setCloud([]);
    setArrow(undefined);
    setLiveSer(null);
    cloudRef.current = [];
    errRef.current = 0;
    totRef.current = 0;
  };

  const handleScheme = (s: Scheme) => {
    setScheme(s);
    const opts = M_OPTIONS[s];
    if (!opts.includes(M)) setM(opts[0]);
    resetResults();
  };

  const handleM = (m: number) => {
    setM(m);
    resetResults();
  };

  const handleDecision = (d: Decision) => {
    setDecision(d);
    resetResults();
  };

  const view = useMemo(
    () => buildModulationView({ scheme, M, ebN0Db, decision, prior0 }),
    [scheme, M, ebN0Db, decision, prior0],
  );

  const project = (p: number[]): { x: number; y: number } => ({
    x: p[0] ?? 0,
    y: view.dim === 1 ? (rngRef.current() - 0.5) * 0.6 : (p[1] ?? 0),
  });

  const pickTx = (): number => {
    if (decision === 'map') {
      let acc = 0;
      const u = rngRef.current();
      for (let i = 0; i < M; i++) {
        acc += view.priors[i];
        if (u < acc) return i;
      }
      return M - 1;
    }
    return Math.min(M - 1, Math.floor(rngRef.current() * M));
  };

  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: () => {
      const c = view.constellation;
      let lastArrow: typeof arrow;
      const newCloud: CloudPt[] = [];
      for (let b = 0; b < BATCH; b++) {
        const tx = pickTx();
        const r = addAwgn(c.points[tx], view.sigma, rngRef.current);
        const rx =
          decision === 'map' ? detectMAP(r, c.points, view.priors, view.n0) : detectML(r, c.points);
        const err = rx !== tx;
        if (err) errRef.current++;
        totRef.current++;
        if (view.drawable) {
          const rp = project(r);
          newCloud.push({ x: rp.x, y: rp.y, err });
          if (b === BATCH - 1) {
            const ideal = view.points2d[tx];
            lastArrow = { from: ideal, to: rp };
          }
        }
      }
      const merged = [...cloudRef.current, ...newCloud].slice(-CLOUD_MAX);
      cloudRef.current = merged;
      setCloud(merged);
      setArrow(lastArrow);
      setLiveSer({ errors: errRef.current, total: totRef.current });
    },
    onReset: () => {
      errRef.current = 0;
      totRef.current = 0;
      cloudRef.current = [];
      setCloud([]);
      setArrow(undefined);
      setLiveSer(null);
    },
  });

  const runSweep = () => {
    const points: { ebN0Db: number; ser: number }[] = [];
    for (let db = 0; db <= 14; db += 2) {
      const r = simulateSer({
        constellation: view.constellation,
        ebN0Db: db,
        numSymbols,
        decision,
        priors: decision === 'map' ? view.priors : undefined,
        seed: 999,
      });
      points.push({ ebN0Db: db, ser: r.ser });
    }
    setSimPoints(points);
  };

  const livePoint =
    liveSer && liveSer.total > 0 ? { ebN0Db, ser: liveSer.errors / liveSer.total } : undefined;

  return (
    <div className="modulation__tabwrap">
      <Segmented<'detection' | 'optrx'>
        ariaLabel={t('modulation.optrx.tabs')}
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: 'detection', label: t('modulation.optrx.tab.detection') },
          { value: 'optrx', label: t('modulation.optrx.tab.optrx') },
        ]}
      />
      {tab === 'optrx' && <OptimumReceiverSection />}
      <div className="module-layout" hidden={tab !== 'detection'}>
        <aside className="modulation__controls">
          <Panel title={t('nav.modulation')}>
            <Select<Scheme>
              label={t('modulation.scheme')}
              value={scheme}
              onChange={handleScheme}
              options={[
                { value: 'bpsk', label: t('modulation.scheme.bpsk') },
                { value: 'bask', label: t('modulation.scheme.bask') },
                { value: 'bfsk', label: t('modulation.scheme.bfsk') },
                { value: 'mpsk', label: t('modulation.scheme.mpsk') },
                { value: 'mask', label: t('modulation.scheme.mask') },
                { value: 'mqam', label: t('modulation.scheme.mqam') },
                { value: 'mfsk', label: t('modulation.scheme.mfsk') },
              ]}
            />
            <Select<string>
              label={t('modulation.M')}
              value={String(M)}
              onChange={(v) => handleM(Number(v))}
              options={M_OPTIONS[scheme].map((m) => ({ value: String(m), label: String(m) }))}
            />
            <Slider
              label={t('modulation.ebn0')}
              value={ebN0Db}
              min={0}
              max={14}
              step={0.5}
              unit="dB"
              onChange={setEbN0Db}
            />
            <Slider
              label={t('modulation.numSymbols')}
              value={numSymbols}
              min={500}
              max={20000}
              step={500}
              onChange={setNumSymbols}
            />
            <Select<Decision>
              label={t('modulation.decision')}
              value={decision}
              onChange={handleDecision}
              options={[
                { value: 'ml', label: t('modulation.decision.ml') },
                { value: 'map', label: t('modulation.decision.map') },
              ]}
            />
            {decision === 'map' && (
              <Slider
                label={t('modulation.prior0')}
                value={prior0}
                min={0.05}
                max={0.95}
                step={0.05}
                onChange={setPrior0}
              />
            )}
            <Toggle
              label={t('modulation.showRegions')}
              checked={showRegions}
              onChange={setShowRegions}
            />
            <Toggle
              label={t('modulation.showLabels')}
              checked={showLabels}
              onChange={setShowLabels}
            />
            <button type="button" onClick={runSweep}>
              {t('modulation.runSweep')}
            </button>
            <TransportControls loop={loop} />
          </Panel>
        </aside>

        <div className="modulation__content">
          <div className="modulation__readouts">
            <Readout label={t('modulation.readout.dim')} value={view.dim} />
            <Readout label={t('modulation.readout.bits')} value={view.bitsPerSymbol} />
            <Readout label={t('modulation.readout.dmin')} value={view.dMin.toFixed(3)} />
            <Readout label={t('modulation.readout.esavg')} value={view.EsAvg.toFixed(3)} />
            <Readout label={t('modulation.readout.sigma')} value={view.sigma.toFixed(3)} />
            <Readout
              label={t('modulation.readout.serTheory')}
              value={view.theoreticalSerNow.toExponential(2)}
            />
            <Readout
              label={t('modulation.readout.serLive')}
              value={livePoint ? livePoint.ser.toExponential(2) : '—'}
              tone={livePoint ? 'ok' : undefined}
            />
            <Readout
              label={t('modulation.readout.errors')}
              value={liveSer ? `${liveSer.errors} / ${liveSer.total}` : '—'}
            />
          </div>

          <div className="modulation__plots">
            <Panel
              title={
                view.dim === 1
                  ? t('modulation.panel.threshold')
                  : t('modulation.panel.constellation')
              }
            >
              {view.dim === 1 ? (
                <ThresholdPanel
                  view={view}
                  decision={decision}
                  showLabels={showLabels}
                  cloud={cloud}
                />
              ) : view.drawable ? (
                <ConstellationPanel
                  view={view}
                  decision={decision}
                  showRegions={showRegions}
                  showLabels={showLabels}
                  cloud={cloud}
                  arrow={arrow}
                />
              ) : (
                <p className="modulation__notice">{t('modulation.notDrawable')}</p>
              )}
            </Panel>

            <Panel title={t('modulation.panel.ser')}>
              <SerCurvePanel
                view={view}
                ebN0Db={ebN0Db}
                simPoints={simPoints}
                livePoint={livePoint}
              />
              <div className="modulation__legend">
                <span className="lg-theory">{t('modulation.legend.theory')}</span>
                <span className="lg-sim">{t('modulation.legend.sim')}</span>
                <span className="lg-live">{t('modulation.legend.live')}</span>
              </div>
            </Panel>
          </div>

          <MessageTransmission
            ebN0Db={ebN0Db}
            decision={decision}
            priors={view.priors}
            constellation={view.constellation}
          />

          <TheoryBox title={t('modulation.theory.title')}>
            <p>
              <Formula tex="\hat{s}_{\mathrm{ML}}=\arg\min_i \lVert r-s_i\rVert^2" block />
            </p>
            <p>
              <Formula
                tex="\hat{s}_{\mathrm{MAP}}=\arg\min_i\{\lVert r-s_i\rVert^2 - N_0\ln P(s_i)\}"
                block
              />
            </p>
            <p>
              <Formula tex="x^*=\tfrac{s_0+s_1}{2}+\dfrac{N_0\ln(p_0/p_1)}{2(s_1-s_0)}" block />
            </p>
            <p>
              <Formula
                tex="P_e^{\mathrm{BPSK}}=Q\!\left(\sqrt{2E_b/N_0}\right),\quad Q(x)=\tfrac12\operatorname{erfc}\!\left(\tfrac{x}{\sqrt2}\right)"
                block
              />
            </p>
          </TheoryBox>
        </div>
      </div>
    </div>
  );
}

function MessageTransmission({
  ebN0Db,
  decision,
  priors,
  constellation,
}: {
  ebN0Db: number;
  decision: Decision;
  priors: number[];
  constellation: ReturnType<typeof buildModulationView>['constellation'];
}) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CommSysLab');
  const [result, setResult] = useState<{
    rxText?: string;
    rxBits: number[];
    ber: number;
    symErr: number;
    totalSym: number;
  } | null>(null);

  const send = () => {
    const bits = mode === 'text' ? textToBits(text) : SMILEY;
    const r = transmit(bits, constellation, {
      ebN0Db,
      decision,
      priors: decision === 'map' ? priors : undefined,
      seed: 4242,
    });
    setResult({
      rxText: mode === 'text' ? bitsToText(r.rxBits.slice(0, bits.length)) : undefined,
      rxBits: r.rxBits,
      ber: r.totalBits ? r.bitErrors / r.totalBits : 0,
      symErr: r.symErrors,
      totalSym: r.totalSymbols,
    });
  };

  return (
    <Panel title={t('modulation.panel.message')}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <Select<'text' | 'image'>
          label={t('modulation.message.mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'text', label: t('modulation.message.text') },
            { value: 'image', label: t('modulation.message.image') },
          ]}
        />
        <button type="button" onClick={send}>
          {t('modulation.message.send')}
        </button>
      </div>

      {mode === 'text' ? (
        <div className="modulation__message">
          <div>
            <div className="muted">{t('modulation.message.original')}</div>
            <textarea
              aria-label={t('modulation.message.input')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <div className="muted">{t('modulation.message.received')}</div>
            <div className="modulation__rxtext">{result?.rxText ?? '—'}</div>
          </div>
        </div>
      ) : (
        <div className="modulation__message">
          <div>
            <div className="muted">{t('modulation.message.original')}</div>
            <BitmapView width={16} height={16} bits={SMILEY} ariaLabel="Original bitmap" />
          </div>
          <div>
            <div className="muted">{t('modulation.message.received')}</div>
            <BitmapView
              width={16}
              height={16}
              bits={result ? result.rxBits.slice(0, 256) : SMILEY.map(() => 0)}
              ariaLabel="Received bitmap"
            />
          </div>
        </div>
      )}

      {result && (
        <div className="modulation__readouts" style={{ marginTop: 10 }}>
          <Readout label={t('modulation.message.ber')} value={result.ber.toExponential(2)} />
          <Readout
            label={t('modulation.message.symErr')}
            value={`${result.symErr} / ${result.totalSym}`}
          />
        </div>
      )}
    </Panel>
  );
}
