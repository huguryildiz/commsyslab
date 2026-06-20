import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText, InfoCard } from '@/components';
import { Schematic, Block, Wire, Arrowhead, MathLabel } from '@/lib/plot/schematic';
import { t } from '@/i18n';
import { friisCascade, type FriisStage } from '@/lib/dsp/linkbudget';
import { Metric } from '../shared';

const DEFAULTS: FriisStage[] = [
  { gainDb: 7, noiseFigureDb: 3 },
  { gainDb: 7, noiseFigureDb: 3 },
  { gainDb: 7, noiseFigureDb: 3 },
];

/** §6.4.2 — noise figure & Friis cascade; first-stage dominance. */
export function NoiseFigureSection() {
  const [stages, setStages] = useState<FriisStage[]>(DEFAULTS);
  const setStage = (i: number, key: keyof FriisStage, v: number) =>
    setStages((s) => s.map((st, j) => (j === i ? { ...st, [key]: v } : st)));
  const reset = () => setStages(DEFAULTS);

  const result = useMemo(() => friisCascade(stages), [stages]);

  // Per-stage contribution to the total (linear) noise figure F.
  const contrib = useMemo(() => {
    let gainProd = 1;
    return stages.map((st, i) => {
      const Fi = 10 ** (st.noiseFigureDb / 10);
      const c = i === 0 ? Fi : (Fi - 1) / gainProd;
      gainProd *= 10 ** (st.gainDb / 10);
      return c;
    });
  }, [stages]);

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.figure.title')}>
            {stages.map((st, i) => (
              <div key={i} className="an__stage">
                <span className="an__stage-label">
                  {t('an.figure.stage')} {i + 1}
                </span>
                <Slider
                  label={<HintText text={`$G_${i + 1}$`} />}
                  min={0}
                  max={20}
                  step={1}
                  unit="dB"
                  value={st.gainDb}
                  onChange={(v) => setStage(i, 'gainDb', v)}
                />
                <Slider
                  label={<HintText text={`$F_${i + 1}$`} />}
                  min={0}
                  max={12}
                  step={0.5}
                  unit="dB"
                  value={st.noiseFigureDb}
                  onChange={(v) => setStage(i, 'noiseFigureDb', v)}
                />
              </div>
            ))}
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content">
          <div className="an__readouts">
            <Metric label={<HintText text="$F$ total" />} value={result.fDb.toFixed(2)} unit="dB" />
            <Metric label={<HintText text="$T_e$" />} value={result.Te.toFixed(0)} unit="K" />
          </div>
          <Panel title={t('an.figure.diagram')}>
            <div style={{ maxWidth: 690 }}>
              {/* Coordinate space 420×90, BH=30. cy=45 → block 30–60; per-stage G/F label
                  at y=78 (18px below block, 12px above bottom edge 90). */}
              <Schematic
                width={420}
                height={90}
                ariaLabel="Friis cascade of three amplifiers (§6.4.2)"
              >
                <MathLabel x={16} y={45} tex="P_i" w={24} />
                <Wire points={[30, 45, 62, 45]} />
                <Arrowhead x={64} y={45} />
                {[66, 168, 270].map((x, i) => (
                  <g key={i}>
                    <Block x={x} y={30} w={82} h={30} label="" tex={`\\text{Amp }${i + 1}`} />
                    <MathLabel
                      x={x + 41}
                      y={78}
                      tex={`${stages[i].gainDb}/${stages[i].noiseFigureDb}\\,\\mathrm{dB}`}
                      w={78}
                    />
                  </g>
                ))}
                <Wire points={[148, 45, 166, 45]} />
                <Arrowhead x={168} y={45} />
                <Wire points={[250, 45, 268, 45]} />
                <Arrowhead x={270} y={45} />
                <Wire points={[352, 45, 392, 45]} />
                <Arrowhead x={394} y={45} />
                <MathLabel x={406} y={45} tex="P_o" w={24} />
              </Schematic>
            </div>
            <div className="an__readouts">
              {contrib.map((c, i) => (
                <Metric
                  key={i}
                  label={`${t('an.figure.stage')} ${i + 1}`}
                  value={`${((c / result.F) * 100).toFixed(0)}%`}
                />
              ))}
            </div>
          </Panel>
          <div className="info-cards">
            <InfoCard title={t('an.figure.c1.t')} accent="green">
              <HintText text={t('an.figure.c1.b')} />
              <Formula tex="F=1+\dfrac{T_e}{T_0},\quad T_e=T_0(F-1)" block />
            </InfoCard>
            <InfoCard title={t('an.figure.c2.t')} accent="orange">
              <HintText text={t('an.figure.c2.b')} />
              <Formula
                tex="F=F_1+\dfrac{F_2-1}{G_1}+\dfrac{F_3-1}{G_1 G_2}+\cdots"
                block
              />
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
