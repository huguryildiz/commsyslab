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
  'fourier.tab.filters': 'Filters',
  'fourier.tab.bandpass': 'Bandpass Signals',
  // Filters sub-tabs
  'fourier.filters.sub.lti': 'LTI Filter',
  'fourier.filters.sub.butter': 'Realizable Filters',
  'fourier.filters.sub.studio': 'Filter Studio',
  // LTI Filter sub-tab — three stacked spectra
  'fourier.lti.inTitle': 'Input spectrum $|X(f)|$',
  'fourier.lti.filtTitle': 'Filter response $|H(f)|$',
  'fourier.lti.outTitle': 'Output spectrum $|Y(f)|=|H(f)|\\,|X(f)|$',
  'fourier.lti.hint': 'Each input harmonic is scaled by $|H(f)|$; harmonics outside the passband (orange) are removed, so $|Y(f)|$ is $|X(f)|$ minus the stopband lines.',

  // Panel titles
  'fourier.panel.synthesis': 'Fourier Series Synthesis',
  'fourier.panel.analyzer': 'DFT / FFT Spectrum Analyzer',
  'fourier.panel.filter': 'Filter Explorer',
  'fourier.panel.pairs': 'FT Pairs & Properties',
  'fourier.panel.analytic': 'I/Q Modulation',

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
  'fourier.filter.fc': 'Cutoff frequency $(f_c)$',
  'fourier.filter.fc2': 'Upper cutoff frequency $(f_2)$',

  // Realizable Filters comparison panel (Butterworth / Chebyshev)
  'fourier.panel.realfilt': 'Realizable Filters',
  'fourier.realfilt.order': 'Order $(N)$',
  'fourier.realfilt.ripple': 'Passband ripple $(R_p)$',
  'fourier.realfilt.stop': 'Stopband atten. $(R_s)$',
  'fourier.realfilt.scale.db': 'dB scale',
  'fourier.realfilt.ideal': 'Ideal',
  'fourier.realfilt.butter': 'Butterworth',
  'fourier.realfilt.cheby1': 'Chebyshev I',
  'fourier.realfilt.cheby2': 'Chebyshev II',
  'fourier.realfilt.hint':
    'Increase the order $N$ to see each approximation approach the ideal brick-wall: the roll-off steepens by about $-20N$ dB/decade.',
  'fourier.realfilt.theory.butter':
    'Butterworth is maximally flat in the passband (no ripple) and monotonic everywhere. It is $-3$ dB at $f=f_c$ for every order $N$; larger $N$ gives a steeper transition.',
  'fourier.realfilt.theory.cheby1':
    'Chebyshev type I trades equiripple ($R_p$ dB) in the passband for a steeper roll-off than Butterworth of the same order. $T_N$ is the Chebyshev polynomial; the response touches $10^{-R_p/20}$ at $f=f_c$.',
  'fourier.realfilt.theory.cheby2':
    'Chebyshev type II (inverse Chebyshev) keeps a maximally flat passband and places equiripple in the stopband, bounded by the attenuation $R_s$ dB reached at $f=f_c$.',
  'fourier.realfilt.theory.note':
    'These are standard analog-filter approximation functions (an extension beyond Proakis & Salehi, which references the Butterworth filter only in passing for D/A reconstruction).',

  // Controls — Panel 4: FT Pairs
  'fourier.pairs.kind': 'Transform pair',
  'fourier.pairs.kind.rect': 'rect ↔ sinc',
  'fourier.pairs.kind.tri': 'tri ↔ sinc²',
  'fourier.pairs.kind.gauss': 'gauss ↔ gauss',
  'fourier.pairs.param': 'Width / σ',
  'fourier.pairs.shift': 'Time shift t₀',
  'fourier.pairs.scale': 'Amplitude scale',

  // Controls — Panel 5: Bandpass & Hilbert
  'fourier.bp.fc': 'Carrier frequency $(f_c)$',
  'fourier.bp.fm': 'Message $(f_m)$',
  'fourier.bp.m': 'Modulation index $(m)$',
  'fourier.bp.iMsg': 'I-channel message $(x_c)$',
  'fourier.bp.qMsg': 'Q-channel message $(x_s)$',
  'fourier.bp.W': 'Message bandwidth $(W)$',
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
  'fourier.sig.reset': '🔄 Reset',
  'fourier.sig.play': '🎧 Listen',
  'fourier.sig.stop': 'Stop',
  'fourier.hint.signal': '$x(t) = A\\cdot g(F\\cdot(t-t_0))$. Adjust $A$, $t_0$, $F$ and axis range to explore.',
  'fourier.hint.conv': '$y(t)$ (blue) is the running overlap of $x$ (green) and the flipped, sliding $h$ (orange).',

  // Convolution tab — interactive flip-and-slide
  'fourier.conv.slide': 'Slide position',
  'fourier.conv.play': '▶️ Play',
  'fourier.conv.pause': '⏸️ Pause',
  'fourier.conv.reset': '🔄 Reset',
  // Per-tab "reset to defaults" buttons (Series / Transform / Filters tabs)
  'fourier.series.reset': '🔄 Reset',
  'fourier.spec.reset': '🔄 Reset',
  'fourier.filter.reset': '🔄 Reset',
  'fourier.conv.readout': 'Output',
  'fourier.conv.panel.x': 'Input',
  'fourier.conv.panel.h': 'Impulse Response',
  'fourier.conv.panel.overlap': 'Overlap',
  'fourier.conv.panel.y': 'Output',
  'fourier.conv.hint.overlap':
    'Drag here to slide the flipped response $h(t-\\tau)$. The shaded pink area is the overlap — and that area is exactly $y$ at this $t$.',
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
  'fourier.hint.prop.shift': 'Shifting in time leaves $|X(f)|$ unchanged — only the phase ramps.',
  'fourier.hint.prop.modulate': 'Multiplying by a carrier copies the spectrum up to $\\pm f_0$.',
  'fourier.hint.prop.scale': 'Compressing in time stretches the spectrum: narrower pulse $\\Rightarrow$ wider bandwidth.',
  'fourier.hint.prop.amp': 'Scaling amplitude scales the spectrum by the same factor.',

  // Bandpass Signals sub-tabs
  'fourier.bandpass.sub.hilbert': 'Hilbert Transform',
  'fourier.bandpass.sub.lowpass': 'Lowpass & Bandpass',
  'fourier.bandpass.sub.iq': 'I/Q Representation',
  'fourier.bandpass.hilbert.title': 'Signal & Hilbert Transform',
  'fourier.bandpass.hilbert.orig': 'Original signal x(t)',
  'fourier.bandpass.hilbert.xhat': 'Hilbert transform x̂(t)',
  'fourier.bandpass.iq.title': 'I/Q Components & Envelope',
  'fourier.iq.fig.x': 'Bandpass signal $x(t)$ and envelope $V(t)$',
  'fourier.iq.fig.i': 'I component: recovered (solid) vs true $x_c$ (dashed)',
  'fourier.iq.fig.q': 'Q component: recovered (solid) vs true $x_s$ (dashed)',
  'fourier.iq.fig.plane': 'I/Q plane: $(I,Q)$ trajectory (Lissajous)',
  'fourier.iq.play': 'Play',
  'fourier.iq.pause': 'Pause',

  // Tab 4 — Filters & Bandpass
  'fourier.filter.type.bsf': 'Band-stop',
  'fourier.panel.baseband': 'Baseband vs Bandpass',
  'fourier.panel.bbMessage': 'Baseband Message',
  'fourier.bb.signal': 'Message signal',
  'fourier.bb.scale': 'Message bandwidth ($W$)',
  'fourier.bb.basebandFig': 'Baseband — centered at $f=0$',
  'fourier.bb.bandpassFig': 'Bandpass — shifted to $\\pm f_c$',
  'fourier.hint.filter': 'The output spectrum is the input times $|H(f)|$; outside the passband it is suppressed.',
  'fourier.hint.baseband': 'Baseband sits at $f=0$ over $[-W,\\,W]$; bandpass is the same shape shifted to $\\pm f_c$.',
  'fourier.hint.iq': 'Independent messages $x_c(t)$ and $x_s(t)$ form the bandpass signal $x(t)=x_c\\cos(2\\pi f_c t)-x_s\\sin(2\\pi f_c t)$; coherent demodulation recovers both separately.',

  // Tab 3 — Spectrum Explorer (Fourier transform of any Basic Signal)
  'fourier.panel.spectrum': 'Spectrum Explorer',
  'fourier.spec.signal': 'Signal',
  'fourier.spec.mod': 'Modulation $\\cos(2\\pi f_m t)$',
  'fourier.spec.fm': 'Mod. frequency',
  'fourier.spec.db': 'dB magnitude',
  'fourier.spec.twoSided': 'Two-sided spectrum',
  'fourier.spec.overlay': 'Theory overlay (Table 2.1)',
  'fourier.spec.time': 'Time Domain Signal',
  'fourier.spec.mag': 'Magnitude Spectrum',
  'fourier.spec.phase': 'Phase Spectrum',
  'fourier.spec.legend.fft': 'computed',
  'fourier.spec.legend.theory': 'theory',
  'fourier.readout.peakF': 'Peak frequency',
  'fourier.spec.noOverlay': 'FFT only — no simple closed-form transform for this signal (Proakis Table 2.1).',
  'fourier.spec.lineNote': 'Theory lines show $|c_n|$ at $\\pm n f_0$, scaled to the FFT peak for comparison.',
  'fourier.hint.spectrum': 'Pick a signal and watch its Fourier transform $X(f)$. Time shift $t_0$ ramps the phase; scaling $\\alpha$ spreads $|X(f)|$; modulation copies it to $\\pm f_m$.',

  // Filter Studio
  'fourier.studio.panel': 'Filter Studio',
  'fourier.studio.source': 'Source',
  'fourier.studio.source.square': 'Square wave',
  'fourier.studio.source.sawtooth': 'Sawtooth',
  'fourier.studio.source.triangle': 'Triangle',
  'fourier.studio.source.pulse': 'Pulse train',
  'fourier.studio.source.multitone': 'Multi-tone',
  'fourier.studio.source.white': 'White noise',
  'fourier.studio.source.pink': 'Pink noise',
  'fourier.studio.f0': 'Fundamental frequency $(f_0)$',
  'fourier.studio.filterType': 'Filter type',
  'fourier.studio.response': 'Response',
  'fourier.studio.response.ideal': 'Ideal',
  'fourier.studio.response.butter': 'Butterworth',
  'fourier.studio.order': 'Order N',
  'fourier.studio.fc': 'Cutoff frequency $(f_c)$',
  'fourier.studio.fc2': 'Upper cutoff frequency $(f_2)$',
  'fourier.studio.listen': '🎧 Listen',
  'fourier.studio.stop': '⏹ Stop',
  'fourier.studio.bypass': 'A/B: filtered ↔ bypass',
  'fourier.studio.spectrumTitle': 'Spectrum — drag the cutoff',
  'fourier.studio.timeTitle': 'Time domain — input vs filtered output',
  'fourier.studio.hint.spectrum': 'Output spectrum $|Y(f)|=|X(f)|\\,|H(f)|$. Drag the cutoff on the plot; harmonics outside the passband vanish.',
  'fourier.studio.hint.time': 'As the cutoff drops, removing high harmonics rounds the waveform — a square wave melts toward a sine.',
  'fourier.studio.legend.input': 'Input |X(f)|',
  'fourier.studio.legend.filter': 'Filter |H(f)|',
  'fourier.studio.legend.output': 'Output |Y(f)|',
  'fourier.studio.legend.time.input': 'input $x(t)$',
  'fourier.studio.legend.time.output': 'filtered output $y(t)$',
};
