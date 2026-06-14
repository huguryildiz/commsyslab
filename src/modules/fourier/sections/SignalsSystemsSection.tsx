import { useState } from 'react';
import { Panel, Slider, Select, Toggle, Readout, TheoryBox, Formula } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { buildSignalExplorer, buildConvolution, type BasicKind } from '../model';
import type { SectionProps } from './types';

const PAD = { l: 50, r: 20, t: 20, b: 40 };

export function SignalsSystemsSection({ clock }: SectionProps) {
  const [kind, setKind] = useState<BasicKind>('rect');
  const [shift, setShift] = useState(0);
  const [scale, setScale] = useState(1);
  const [amp, setAmp] = useState(1);
  const [reverse, setReverse] = useState(false);
  const sig = buildSignalExplorer(kind, { shift, scale, amp, reverse });

  const [xKind, setXKind] = useState<'rect' | 'tri'>('rect');
  const [hKind, setHKind] = useState<'rect' | 'exp'>('rect');
  const conv = buildConvolution(xKind, hKind, clock);

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.signal')}>
          <Select
            label={t('fourier.sig.kind')}
            value={kind}
            options={[
              { value: 'rect', label: 'Π(t)' },
              { value: 'tri', label: 'Λ(t)' },
              { value: 'sinc', label: 'sinc(t)' },
              { value: 'step', label: 'u(t)' },
              { value: 'sgn', label: 'sgn(t)' },
              { value: 'exp', label: 'e^(−t/τ)·u(t)' },
              { value: 'sine', label: 'sin(2πt)' },
            ]}
            onChange={setKind}
          />
          <Slider label={t('fourier.sig.shift')} value={shift} min={-1} max={1} step={0.05} onChange={setShift} />
          <Slider label={t('fourier.sig.scale')} value={scale} min={0.25} max={3} step={0.05} onChange={setScale} />
          <Slider label={t('fourier.sig.amp')} value={amp} min={-2} max={2} step={0.1} onChange={setAmp} />
          <Toggle label={t('fourier.sig.reverse')} checked={reverse} onChange={setReverse} />
        </Panel>
        <Panel title={t('fourier.panel.conv')}>
          <Select
            label={t('fourier.conv.x')}
            value={xKind}
            options={[
              { value: 'rect', label: 'Π(t)' },
              { value: 'tri', label: 'Λ(t)' },
            ]}
            onChange={setXKind}
          />
          <Select
            label={t('fourier.conv.h')}
            value={hKind}
            options={[
              { value: 'rect', label: 'Π(t)' },
              { value: 'exp', label: 'e^(−t/τ)' },
            ]}
            onChange={setHKind}
          />
        </Panel>
      </aside>

      <div className="fourier__content">
        <div className="fourier__readouts">
          <Readout label={t('fourier.readout.type')} value={sig.classification.type} />
          <Readout
            label={t('fourier.readout.sym')}
            value={sig.classification.even ? 'even' : sig.classification.odd ? 'odd' : '—'}
          />
        </div>

        <Panel title={t('fourier.panel.signal')}>
          <Canvas
            height={200}
            ariaLabel="Signal: original vs transformed"
            deps={[sig]}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const ax: Axes = {
                x: linScale([-2, 2], [PAD.l, w - PAD.r]),
                y: linScale([-2.2, 2.2], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [-2, 2], { xLabel: '$t$', yLabel: '$x(t)$' });
              drawLine(ctx, ax, sig.time, sig.original, CHART.green, 1, false);
              drawLine(ctx, ax, sig.time, sig.transformed, CHART.orange, 2);
            }}
          />
          <p className="fourier__hint">{t('fourier.hint.signal')}</p>
        </Panel>

        <Panel title={t('fourier.panel.conv')}>
          <Canvas
            height={200}
            ariaLabel="Convolution: x, h, and y"
            deps={[conv]}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const ax: Axes = {
                x: linScale([Math.min(...conv.t), Math.max(...conv.t)], [PAD.l, w - PAD.r]),
                y: linScale([-0.2, 1.6], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [Math.min(...conv.t), Math.max(...conv.t)], { xLabel: '$t$', yLabel: '$x,h,y$' });
              drawLine(ctx, ax, conv.t, conv.x, CHART.green, 1.5, false);
              drawLine(ctx, ax, conv.t, conv.h, CHART.orange, 1.5, false);
              drawLine(ctx, ax, conv.t, conv.y, CHART.blue, 2);
            }}
          />
          <p className="fourier__hint">{t('fourier.hint.conv')}</p>
        </Panel>

        <TheoryBox title={t('fourier.tab.signals')}>
          <Formula tex="y(t)=\int_{-\infty}^{\infty}x(\tau)\,h(t-\tau)\,d\tau" block />
          <p>
            Proakis §2.1.5 (p. 41): an LTI system output is the convolution of the input with the
            impulse response (flip h, slide, multiply, sum).
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
