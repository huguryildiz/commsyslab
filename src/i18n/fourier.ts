/**
 * i18n strings for Signals & Spectra module.
 * Will be merged into the dictionary during integration.
 */
export const fourier: Record<string, string> = {
  'nav.fourier': 'Signals & Spectra',
  'landing.mod.fourier.title': 'Signals & Spectra',
  'landing.mod.fourier.desc':
    'Analyze signals in the frequency domain. Fourier series, DFT, filters, and analytical signals.',

  // Animation
  'fourier.animation': 'Animation',

  // Tabs
  'fourier.tab.signals': 'Signals & Systems',
  'fourier.tab.series': 'Fourier Series',
  'fourier.tab.transform': 'Fourier Transform & Spectra',
  'fourier.tab.filters': 'Filters & Bandpass',

  // Panel titles
  'fourier.panel.synthesis': 'Fourier Series Synthesis',
  'fourier.panel.analyzer': 'DFT / FFT Spectrum Analyzer',
  'fourier.panel.filter': 'LTI Filter H(f)',
  'fourier.panel.pairs': 'FT Pairs & Properties',
  'fourier.panel.analytic': 'Bandpass & Hilbert Transform',

  // Controls — Panel 1: Series Synthesis
  'fourier.syn.waveform': 'Waveform',
  'fourier.syn.waveform.square': 'Square',
  'fourier.syn.waveform.triangle': 'Triangle',
  'fourier.syn.waveform.sawtooth': 'Sawtooth',
  'fourier.syn.waveform.pulse': 'Pulse',
  'fourier.syn.f0': 'Fundamental f₀',
  'fourier.syn.harmonics': 'Harmonic count N',
  'fourier.syn.duty': 'Duty cycle (pulse)',

  // Controls — Panel 2: Spectrum Analyzer
  'fourier.analyzer.signalType': 'Signal type',
  'fourier.analyzer.signalType.tones': 'Sum of tones',
  'fourier.analyzer.signalType.wave': 'Periodic wave',
  'fourier.analyzer.f1': 'Frequency f₁',
  'fourier.analyzer.amp1': 'Amplitude A₁',
  'fourier.analyzer.fs': 'Sampling rate fₛ',
  'fourier.analyzer.numSamples': 'Samples N',
  'fourier.analyzer.window': 'Window',
  'fourier.analyzer.window.rect': 'Rectangular',
  'fourier.analyzer.window.hann': 'Hann',
  'fourier.analyzer.window.hamming': 'Hamming',

  // Controls — Panel 3: Filter
  'fourier.filter.type': 'Filter type',
  'fourier.filter.type.lpf': 'Lowpass',
  'fourier.filter.type.hpf': 'Highpass',
  'fourier.filter.type.bpf': 'Bandpass',
  'fourier.filter.type.rc': 'RC (first-order)',
  'fourier.filter.fc': 'Cutoff fᶜ',
  'fourier.filter.fc2': 'Upper cutoff f₂',

  // Controls — Panel 4: FT Pairs
  'fourier.pairs.kind': 'Transform pair',
  'fourier.pairs.kind.rect': 'rect ↔ sinc',
  'fourier.pairs.kind.tri': 'tri ↔ sinc²',
  'fourier.pairs.kind.gauss': 'gauss ↔ gauss',
  'fourier.pairs.param': 'Width / σ',
  'fourier.pairs.shift': 'Time shift t₀',
  'fourier.pairs.scale': 'Amplitude scale',

  // Controls — Panel 5: Bandpass & Hilbert
  'fourier.bp.fc': 'Carrier fᶜ',
  'fourier.bp.fm': 'Message fₘ',
  'fourier.bp.m': 'Modulation index m',
  'fourier.bp.showAnalytic': 'Analytic signal z(t)',
  'fourier.bp.showIQ': 'I/Q components',
  'fourier.bp.showEnv': 'Envelope V(t)',

  // Readouts
  'fourier.readout.dc': 'DC component',
  'fourier.readout.c1': 'c₁ magnitude',
  'fourier.readout.power': 'Power',
  'fourier.readout.leakage': 'Spectral leakage',
  'fourier.readout.env': 'Envelope mean',

  // Theory box
  'fourier.theory.title': 'Theory — Signals & Spectra',
  'fourier.theory.series': 'Fourier Series',
  'fourier.theory.formula.series': 'x(t) = Σ cₙ e^(j2πnf₀t)',
  'fourier.theory.dft': 'Discrete Fourier Transform',
  'fourier.theory.formula.dft': 'X[k] = Σₙ₌₀^(N-1) x[n] e^(-j2πkn/N)',
  'fourier.theory.filter': 'Frequency Response',
  'fourier.theory.formula.filter': 'Y(f) = H(f) X(f)',
  'fourier.theory.hilbert': 'Hilbert Transform',
  'fourier.theory.formula.hilbert': 'x̂(t) = (1/π) ∫ x(τ)/(t-τ) dτ',
  'fourier.theory.analytic': 'Analytic Signal',
  'fourier.theory.formula.analytic': 'z(t) = x(t) + j x̂(t)',

  // Tab 2 — Fourier Series
  'fourier.readout.powerN': 'Power in N harmonics',
  'fourier.preset.gibbs': 'Show Gibbs overshoot',
  'fourier.hint.gibbs': 'More harmonics sharpen the edges but the overshoot near jumps stays ~9% (Gibbs).',
};
