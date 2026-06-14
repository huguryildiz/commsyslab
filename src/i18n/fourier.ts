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
  'fourier.tab.signals': 'Basic Signals',
  'fourier.tab.conv': 'Convolution',
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
  'fourier.readout.c1': '1st harmonic',
  'fourier.readout.power': 'Power',
  'fourier.readout.leakage': 'Spectral leakage',
  'fourier.readout.env': 'Envelope mean',
  'fourier.readout.harmonics': 'Harmonic structure',
  'fourier.readout.convergence': 'Convergence rate',

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

  // Tab 1 — Signals & Systems
  'fourier.panel.signal': 'Signal Explorer',
  'fourier.panel.axis': 'Axis Settings',
  'fourier.panel.conv': 'Convolution (LTI)',
  'fourier.sig.kind': 'Signal',
  'fourier.sig.amp': 'Amplitude',
  'fourier.sig.t0': 'Time shift',
  'fourier.sig.F': 'Frequency',
  'fourier.sig.reverse': 'Time reversal',
  'fourier.sig.tmin': 't min',
  'fourier.sig.tmax': 't max',
  'fourier.sig.N': 'Sampling density',
  'fourier.conv.x': 'Input',
  'fourier.conv.h': 'Impulse response',
  'fourier.readout.type': 'Signal type',
  'fourier.readout.sym': 'Symmetry',
  'fourier.sig.reset': 'Reset Parameters',
  'fourier.sig.play': '🔊 Listen',
  'fourier.sig.stop': 'Stop',
  'fourier.hint.signal': '$x(t) = A\\cdot g(F\\cdot(t-t_0))$. Adjust $A$, $t_0$, $F$ and axis range to explore.',
  'fourier.hint.conv': '$y(t)$ (blue) is the running overlap of $x$ (green) and the flipped, sliding $h$ (orange).',

  // Convolution tab — interactive flip-and-slide
  'fourier.conv.slide': 'Slide position',
  'fourier.conv.play': '▶️ Play',
  'fourier.conv.pause': '⏸️ Pause',
  'fourier.conv.reset': '🔄 Reset',
  'fourier.conv.readout': 'Output',
  'fourier.conv.panel.x': 'Input',
  'fourier.conv.panel.h': 'Impulse Response',
  'fourier.conv.panel.overlap': 'Overlap',
  'fourier.conv.panel.y': 'Output',
  'fourier.conv.hint.overlap':
    'Drag here (or use the slider) to slide the flipped response $h(t-\\tau)$. The shaded pink area is the overlap — and that area is exactly $y$ at this $t$.',
  'fourier.conv.hint.y': 'The pink dot is $y(t)$: the overlap area plotted against the slide position $t$.',
  'fourier.conv.theory':
    'Proakis §2.1.5 (p. 41): an LTI system output is the convolution of the input x(t) with the impulse response h(t). To get y(t), flip h about τ = 0, slide it to position t, multiply by x(τ), and integrate (sum) the overlap. Sweep t to trace out the whole y(t) curve.',

  // Tab 3 — Fourier Transform & Spectra
  'fourier.panel.properties': 'FT Properties',
  'fourier.prop.which': 'Property',
  'fourier.prop.shift': 'Time shift',
  'fourier.prop.modulate': 'Frequency shift',
  'fourier.prop.scale': 'Time scaling',
  'fourier.prop.amp': 'Amplitude scaling',
  'fourier.prop.amount': 'Amount',
  'fourier.prop.showAll': 'Show all properties',
  'fourier.preset.leakage': 'Show spectral leakage',
  'fourier.readout.bw': 'Bandwidth',
  'fourier.readout.eTime': 'Energy (time)',
  'fourier.readout.eFreq': 'Energy (freq)',
  'fourier.hint.leakage': 'A rectangular window on an off-bin tone smears energy into neighboring bins (leakage).',
  'fourier.hint.prop.shift': 'Shifting in time leaves $|X(f)|$ unchanged — only the phase ramps.',
  'fourier.hint.prop.modulate': 'Multiplying by a carrier copies the spectrum up to $\\pm f_0$.',
  'fourier.hint.prop.scale': 'Compressing in time stretches the spectrum: narrower pulse $\\Rightarrow$ wider bandwidth.',
  'fourier.hint.prop.amp': 'Scaling amplitude scales the spectrum by the same factor.',

  // Tab 4 — Filters & Bandpass
  'fourier.filter.type.bsf': 'Band-stop (BSF)',
  'fourier.panel.baseband': 'Baseband vs Bandpass',
  'fourier.bb.mode': 'Bandpass (off = baseband)',
  'fourier.hint.filter': 'The output spectrum is the input times $|H(f)|$; outside the passband it is suppressed.',
  'fourier.hint.baseband': 'Baseband sits at $f=0$ over $[-W,\\,W]$; bandpass is the same shape shifted to $\\pm f_c$.',
  'fourier.hint.iq': '$I$ (green) and $Q$ (blue) are slow baseband signals; the envelope is $\\sqrt{I^2+Q^2}$.',
};
