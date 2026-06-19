import { useMemo, useState } from 'react';
import { runLink, type LinkConfig } from '@/lib/sim/link';
import type { Scheme } from '@/lib/dsp/modulation';
import { ChainStrip, type Stage } from './ChainStrip';
import { SourceSinkCompare } from './SourceSinkCompare';
import { StageInspector } from './StageInspector';
import { SourcePanel, ModulationPanel, ChannelPanel } from './panels';
import './end-to-end.css';

export function EndToEndModule() {
  const [freq, setFreq] = useState(2);
  const [fs, setFs] = useState(32);
  const [bits, setBits] = useState(4);
  const [scheme, setScheme] = useState<Scheme>('bpsk');
  const [M, setM] = useState(4);
  const [ebN0Db, setEbN0] = useState(8);
  const [bandlimited, setBandlimited] = useState(true);
  const [alpha, setAlpha] = useState(0.35);
  const [stage, setStage] = useState<Stage>('channel');

  const cfg: LinkConfig = useMemo(
    () => ({
      source: { tones: [{ freq, amp: 0.85 }], fs, tEnd: 1, mMax: 1, bits, type: 'midrise', coding: 'gray' },
      scheme,
      M: scheme === 'bpsk' ? 2 : M,
      channel: { ebN0Db, bandlimited, alpha, sps: 16, span: 4 },
      seed: 1,
    }),
    [freq, fs, bits, scheme, M, ebN0Db, bandlimited, alpha],
  );
  const result = useMemo(() => runLink(cfg), [cfg]);

  const status: Record<Stage, string> = {
    source: `${result.metrics.totalBits} bit`,
    mod: result.constellation.scheme.toUpperCase(),
    channel: `${ebN0Db} dB`,
    detect: `${result.metrics.symErrors} sym err`,
    sink: `BER ${(result.metrics.ber * 100).toFixed(1)}%`,
  };

  return (
    <div className="e2e">
      <ChainStrip selected={stage} onSelect={setStage} status={status} />
      <SourceSinkCompare r={result} />

      <div className="e2e__work">
        <aside className="e2e__controls">
          <SourcePanel freq={freq} fs={fs} bits={bits} onFreq={setFreq} onFs={setFs} onBits={setBits} />
          <ModulationPanel scheme={scheme} M={M} onScheme={setScheme} onM={setM} />
          <ChannelPanel
            ebN0Db={ebN0Db}
            bandlimited={bandlimited}
            alpha={alpha}
            onEbN0={setEbN0}
            onBandlimited={setBandlimited}
            onAlpha={setAlpha}
          />
        </aside>
        <section className="e2e__inspector">
          <StageInspector stage={stage} r={result} />
        </section>
      </div>
    </div>
  );
}
