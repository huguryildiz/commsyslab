import { useMemo, useState } from 'react';
import {
  Panel,
  Select,
  Segmented,
  TransportControls,
  Readout,
  InfoCard,
  HintText,
  TheoryBox,
  Formula,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { useZoom } from '@/lib/plot/useZoom';
import { SignalEditor } from './SignalEditor';
import { DEFAULT_CUSTOM_AMPLITUDES } from './custom-signals';
import { SIGSPACE_PRESETS, buildSignalSpaceView, type SignalSpaceView } from './signalspace-model';
import { WalkthroughPanel, BasisGalleryPanel, ConstellationView } from './signalspace-panels';

const SPS = 60;
type ViewMode = 'walkthrough' | 'result';

export function SignalSpaceSection() {
  const [presetId, setPresetId] = useState('antipodal');
  const [customAmplitudes, setCustomAmplitudes] = useState<number[][]>(DEFAULT_CUSTOM_AMPLITUDES);
  const [mode, setMode] = useState<ViewMode>('walkthrough');
  const [step, setStep] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(
    () => buildSignalSpaceView({ presetId, customAmplitudes, sps: SPS }),
    [presetId, customAmplitudes],
  );

  const lastStep = Math.max(0, view.frames.length - 1);
  const clampedStep = Math.min(step, lastStep);
  const frame = view.frames[clampedStep];

  const loop = useSimulationLoop({
    ticksPerSecond: 1.5,
    onTick: () => setStep((s) => Math.min(s + 1, lastStep)),
    onReset: () => setStep(0),
  });

  const handlePreset = (id: string) => {
    setPresetId(id);
    setStep(0);
    loop.reset();
    setResetKey((k) => k + 1);
  };

  const handleCustom = (next: number[][]) => {
    setCustomAmplitudes(next);
    setStep(0);
    loop.reset();
  };

  const resetAll = () => {
    setStep(0);
    loop.reset();
    setResetKey((k) => k + 1);
  };

  const isCustom = presetId === 'custom';
  // basisCount drives the gallery in walkthrough; in result mode show the full basis.
  const galleryCount = mode === 'result' ? view.dim : frame?.basisCount ?? 0;

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.sigspace.tab')}>
          <Select<string>
            label={t('modulation.sigspace.preset')}
            value={presetId}
            onChange={handlePreset}
            options={SIGSPACE_PRESETS.map((p) => ({ value: p.id, label: t(p.labelKey) }))}
          />
          <Segmented<ViewMode>
            ariaLabel={t('modulation.sigspace.view')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'walkthrough', label: t('modulation.sigspace.view.walkthrough') },
              { value: 'result', label: t('modulation.sigspace.view.result') },
            ]}
          />
          {isCustom && (
            <SignalEditor
              amplitudes={customAmplitudes}
              dependent={view.dependent}
              onChange={handleCustom}
            />
          )}
          {mode === 'walkthrough' && view.frames.length > 0 && <TransportControls loop={loop} />}
          <button type="button" onClick={resetAll}>
            {t('modulation.sigspace.reset')}
          </button>
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.sigspace.readout.dim')} value={`${view.dim} / ${view.M}`} />
          {mode === 'walkthrough' && view.frames.length > 0 && (
            <Readout
              label={t('modulation.sigspace.readout.step')}
              value={`${clampedStep + 1} / ${view.frames.length}`}
            />
          )}
        </div>

        <SigSpacePanels
          key={resetKey}
          view={view}
          mode={mode}
          frame={frame}
          galleryCount={galleryCount}
        />

        <div className="info-cards">
          <InfoCard title={t('modulation.sigspace.card.projection.title')} accent="orange">
            <HintText text={t('modulation.sigspace.card.projection.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.sigspace.card.basis.title')} accent="blue">
            <HintText text={t('modulation.sigspace.card.basis.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.sigspace.card.dimension.title')} accent="green">
            <HintText text={t('modulation.sigspace.card.dimension.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.sigspace.card.dependence.title')} accent="orange">
            <HintText text={t('modulation.sigspace.card.dependence.body')} />
          </InfoCard>
        </div>

        <TheoryBox title={t('modulation.sigspace.theory.title')}>
          <p>
            <Formula
              tex="g_k(t)=s_k(t)-\sum_{j=1}^{k-1}\langle s_k,\varphi_j\rangle\,\varphi_j(t)"
              block
            />
          </p>
          <p>
            <Formula tex="\varphi_k(t)=\dfrac{g_k(t)}{\lVert g_k\rVert}" block />
          </p>
          <p>
            <Formula
              tex="s_m(t)=\sum_{n=1}^{N}s_{mn}\,\varphi_n(t),\quad s_{mn}=\langle s_m,\varphi_n\rangle"
              block
            />
          </p>
          <p>
            <Formula tex="E_m=\sum_{n=1}^{N}s_{mn}^{2},\qquad N\le M" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}

/** Right-content panels; remounted via `key={resetKey}` so `useZoom` re-initialises on Reset. */
function SigSpacePanels({
  view,
  mode,
  frame,
  galleryCount,
}: {
  view: SignalSpaceView;
  mode: ViewMode;
  frame: SignalSpaceView['frames'][number] | undefined;
  galleryCount: number;
}) {
  // Shared sample-index axis for both time-domain canvases.
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, Math.max(1, view.sps - 1), {
    minSpan: 4,
    maxSpan: (view.sps - 1) * 2,
    clampMin: 0,
  });

  return (
    <>
      {mode === 'walkthrough' && frame && (
        <Panel title={t('modulation.sigspace.panel.walkthrough')}>
          <WalkthroughPanel
            frame={frame}
            view={view}
            lo={lo}
            hi={hi}
            onWheel={handleWheel}
            onPan={handlePan}
          />
          <div className="modulation__legend">
            <span className="lg-live">{t('modulation.sigspace.legend.source')}</span>
            <span className="lg-sim">{t('modulation.sigspace.legend.proj')}</span>
            <span className="lg-theory">{t('modulation.sigspace.legend.residual')}</span>
          </div>
        </Panel>
      )}

      <Panel title={t('modulation.sigspace.panel.basis')}>
        <BasisGalleryPanel
          view={view}
          count={galleryCount}
          lo={lo}
          hi={hi}
          onWheel={handleWheel}
          onPan={handlePan}
        />
      </Panel>

      <Panel title={t('modulation.sigspace.panel.constellation')}>
        {view.kind === 'degenerate' ? (
          <div className="modulation__notice">{t('modulation.sigspace.degenerate')}</div>
        ) : (
          <ConstellationView view={view} />
        )}
      </Panel>
    </>
  );
}
