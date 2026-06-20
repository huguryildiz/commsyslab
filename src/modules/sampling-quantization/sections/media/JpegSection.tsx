// JPEG Transform Coding section (Proakis §7.7)
// Two-column layout: controls (left) · heatmap panels + theory (right)
// DSP pipeline: compressBlock() from src/lib/dsp/dct.ts
import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  InfoCard,
  HintText,
} from '@/components';
import { t } from '@/i18n';
import { compressBlock, energyCompaction } from '@/lib/dsp/dct';
import { BlockHeatmap, QuantTablePanel, ZigzagPanel } from './jpeg-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ── Source-block presets (8×8, values ≈ 0..255) ──────────────────────────────
// Representative luminance patterns used in textbook examples (§7.7).

type PresetKey = 'gradient' | 'edge' | 'texture' | 'ramp';

function makeGradient(): number[][] {
  // Smooth horizontal gradient: high compaction → few DCT coefficients needed
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => Math.round(32 + (c / 7) * 190 + (r / 7) * 10)),
  );
}

function makeEdge(): number[][] {
  // Vertical step edge at column 4: triggers high-frequency AC coefficients
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, (_, c) => (c < 4 ? 240 : 30)),
  );
}

function makeTexture(): number[][] {
  // Checkerboard / high-frequency texture: worst case for JPEG — many non-zero AC terms
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => ((r + c) % 2 === 0 ? 240 : 20)),
  );
}

function makeRamp(): number[][] {
  // Diagonal ramp: moderate frequency mix
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => Math.round(((r + c) / 14) * 220 + 20)),
  );
}

const PRESETS: Record<PresetKey, number[][]> = {
  gradient: makeGradient(),
  edge: makeEdge(),
  texture: makeTexture(),
  ramp: makeRamp(),
};

// ── Component ────────────────────────────────────────────────────────────────

/** §7.7 JPEG Transform Coding — interactive 8×8 block compressor. */
export function JpegSection() {
  const [preset, setPreset] = useState<PresetKey>('gradient');
  const [quality, setQuality] = useState(50);

  const block = PRESETS[preset];

  // Full JPEG pipeline: DCT → quantize → dequantize → IDCT
  const res = useMemo(() => compressBlock(block, quality), [block, quality]);

  // Energy compaction: fraction of total DCT energy in the top-8 coefficients
  const compaction8 = useMemo(
    () => energyCompaction(res.coeffs, 8),
    [res.coeffs],
  );

  // PSNR from MSE (guard mse = 0 → perfect reconstruction)
  const psnr = res.mse > 0 ? 10 * Math.log10((255 * 255) / res.mse) : Infinity;
  const psnrLabel = Number.isFinite(psnr) ? `${psnr.toFixed(1)} dB` : '∞ dB';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="module-layout">
      {/* ── Left sidebar: controls ── */}
      <aside className="sampling__controls">
        <Panel title={t('adc.sub.jpeg')}>
          <Select<PresetKey>
            label={t('adc.jpeg.preset')}
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'gradient', label: t('adc.jpeg.preset.gradient') },
              { value: 'edge',     label: t('adc.jpeg.preset.edge') },
              { value: 'texture',  label: t('adc.jpeg.preset.texture') },
              { value: 'ramp',     label: t('adc.jpeg.preset.ramp') },
            ]}
          />

          <Slider
            label={t('adc.jpeg.quality')}
            value={quality}
            min={1}
            max={100}
            step={1}
            onChange={setQuality}
          />
        </Panel>

        {/* Readouts */}
        <Panel title="Readouts">
          <Readout label={t('adc.jpeg.quality')} value={quality} />
          <Readout
            label={t('adc.jpeg.nonzero')}
            value={`${res.nonZero}/64`}
          />
          <Readout
            label={t('adc.jpeg.compaction')}
            value={`${(compaction8 * 100).toFixed(1)}%`}
          />
          <Readout
            label={t('adc.jpeg.psnr')}
            value={psnrLabel}
          />
        </Panel>
      </aside>

      {/* ── Right content: heatmaps + theory ── */}
      <div className="sampling__content">
        {/* Four main heatmap panels in a responsive grid */}
        <Panel title="8×8 Block Pipeline">
          {/*
           * Grid layout: 2 columns on wide, 1 column on narrow.
           * min(220px, 100%) prevents overflow on mobile portrait (CLAUDE.md rule).
           */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
              gap: '12px',
            }}
          >
            {/* 1. Original block */}
            <div>
              <BlockHeatmap
                block={block}
                title={t('adc.jpeg.panel.original')}
                mode="pixel"
              />
            </div>

            {/* 2. DCT coefficient magnitude (log scale, DC highlighted) */}
            <div>
              <BlockHeatmap
                block={res.coeffs}
                title={t('adc.jpeg.panel.dct')}
                mode="coeff"
                highlightDc
              />
            </div>

            {/* 3. Quantized levels (sparsity: mostly zeros) */}
            <div>
              <BlockHeatmap
                block={res.quantized}
                title={t('adc.jpeg.panel.quantized')}
                mode="level"
              />
            </div>

            {/* 4. Reconstructed block (compare to original) */}
            <div>
              <BlockHeatmap
                block={res.reconstructed}
                title={t('adc.jpeg.panel.recon')}
                mode="pixel"
              />
            </div>
          </div>
        </Panel>

        {/* Q-table + zig-zag scan panels (supplementary) */}
        <Panel title="Quantization Table & Scan Order">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
              gap: '12px',
            }}
          >
            {/* 5. Scaled quantization table */}
            <div>
              <QuantTablePanel qTable={res.qTable} />
            </div>

            {/* 6. Zig-zag scan order overlay */}
            <div>
              <ZigzagPanel />
            </div>
          </div>
        </Panel>

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.dct.title')} accent="green">
            <p>
              <HintText text={t('adc.card.dct.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.qtable.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.qtable.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.quality.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.quality.body')} />
            </p>
          </InfoCard>
        </div>

      </div>
    </div>
  );
}
