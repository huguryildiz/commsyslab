import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Readout, InfoCard, HintText } from '@/components';
import { t } from '@/i18n';
import { lbgDesign, gaussianClusters, gaussianCloud, vqRateBitsPerSample } from '@/lib/dsp/vq';
import { ScatterVoronoiPanel, DistortionPanel } from './vq-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

type DataKind = 'clusters' | 'cloud';

/** §7.2.2 Vector quantization — LBG codebook design with Voronoi regions. */
export function VectorQuantSection() {
  const [data, setData] = useState<DataKind>('clusters');
  const [K, setK] = useState(4);
  const [step, setStep] = useState(0);

  const points = useMemo(
    () =>
      data === 'clusters'
        ? gaussianClusters(
            [
              [0, 0],
              [10, 10],
              [0, 10],
              [10, 0],
            ],
            60,
            1.2,
            7,
          )
        : gaussianCloud(240, 3, 7),
    [data],
  );

  const result = useMemo(() => lbgDesign(points, K), [points, K]);
  const maxStep = Math.max(result.snapshots.length - 1, 0);
  const shownStep = Math.min(step, maxStep);
  const rate = vqRateBitsPerSample(K, 2);

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        <Panel title={t('adc.vq.data')}>
          <Select<DataKind>
            label={t('adc.vq.data')}
            value={data}
            onChange={setData}
            options={[
              { value: 'clusters', label: t('adc.vq.clusters') },
              { value: 'cloud', label: t('adc.vq.cloud') },
            ]}
          />
          <Slider label={t('adc.vq.k')} value={K} min={2} max={16} step={1} onChange={setK} />
          <Slider
            label={t('adc.vq.iter')}
            value={shownStep}
            min={0}
            max={maxStep}
            step={1}
            onChange={setStep}
          />
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="sampling__readouts">
          <Readout label={t('adc.vq.k')} value={K} />
          <Readout label={t('adc.vq.rate')} value={rate.toFixed(2)} />
          <Readout label={t('adc.lm.distortion')} value={result.distortionHistory[shownStep].toFixed(3)} />
        </div>

        <Panel title={t('adc.vq.scatter')}>
          <ScatterVoronoiPanel data={points} result={result} step={shownStep} />
        </Panel>
        <Panel title={t('adc.vq.distortion')}>
          <DistortionPanel key={`${data}-${K}`} history={result.distortionHistory} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('adc.card.vq.title')} accent="green">
            <p>
              <HintText text={t('adc.card.vq.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.voronoi.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.voronoi.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.vqrate.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.vqrate.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.vqadv.title')} accent="green">
            <p>
              <HintText text={t('adc.card.vqadv.body')} />
            </p>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
