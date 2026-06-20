import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Readout, InfoCard, TheoryBox, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import { dpcmEncode, predictionGainDb } from '@/lib/dsp/dpcm';
import { DpcmTracePanel } from './dpcm-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

type Order = 'first' | 'second';

const N = 256;
const FS = 64; // reference rate for the bit-rate comparison

/** §7.4.2 Differential PCM — predictive coding of the prediction error. */
export function DpcmSection() {
  const [order, setOrder] = useState<Order>('first');
  const [bits, setBits] = useState(4);
  const [freq, setFreq] = useState(3);

  const signal = useMemo(
    () => Array.from({ length: N }, (_, i) => Math.sin((2 * Math.PI * freq * i) / N)),
    [freq],
  );

  const enc = useMemo(() => {
    const coeffs = order === 'first' ? [0.97] : [1.5, -0.6];
    return dpcmEncode(signal, coeffs, bits, 1);
  }, [signal, bits, order]);

  const gainDb = predictionGainDb(signal, enc.rawError);
  const pcmRate = 8 * FS;
  const dpcmRate = bits * FS;

  return (
    <div className="module-layout">
      <aside className="sampling__controls">
        <Panel title="DPCM">
          <Select<Order>
            label={t('adc.dpcm.order')}
            value={order}
            onChange={setOrder}
            options={[
              { value: 'first', label: t('adc.dpcm.first') },
              { value: 'second', label: t('adc.dpcm.second') },
            ]}
          />
          <Slider label={t('adc.dpcm.bits')} value={bits} min={2} max={8} step={1} onChange={setBits} />
          <Slider label={t('adc.dpcm.freq')} value={freq} min={1} max={8} step={1} unit="Hz" onChange={setFreq} />
        </Panel>
      </aside>

      <div className="sampling__content">
        <div className="sampling__readouts">
          <Readout label={t('adc.dpcm.gain')} value={gainDb.toFixed(1)} unit="dB" />
          <Readout label={t('adc.dpcm.bitrate')} value={`${dpcmRate} / ${pcmRate}`} unit="bit/s" />
        </div>

        <Panel title={t('adc.dpcm.trace')}>
          <DpcmTracePanel enc={enc} signal={signal} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('adc.card.dpcm.title')} accent="green">
            <p>
              <HintText text={t('adc.card.dpcm.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.dpcmloop.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.dpcmloop.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title="Theory — DPCM">
          <p>
            <Formula
              tex="y_n = x_n - \hat{x}_{n-1}, \qquad \hat{x}_n = \hat{y}_n + \hat{x}_{n-1}"
              block
            />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
