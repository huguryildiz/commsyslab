export const randomprocess: Record<string, string> = {
  'nav.randomProcess': 'Random Processes',
  'rp.title': 'Probability & Random Processes',
  'rp.subtitle':
    'Probability review, random processes, autocorrelation, PSD, Gaussian & white noise — Proakis Ch 5',

  // ── Tabs (§5.1 / §5.2 / §5.3) ────────────────────────────────────────────
  'rp.tab.ariaLabel': 'Chapter 5 section',
  'rp.tab.prob': 'Probability & RVs',
  'rp.tab.process': 'Random Processes',
  'rp.tab.gaussian': 'Gaussian & White',

  // ── Process generator (shared §5.2 controls) ─────────────────────────────
  'rp.gen.title': 'Process generator',
  'rp.gen.kind': 'Process',
  'rp.gen.kind.sine': 'Random-phase sine',
  'rp.gen.kind.white': 'White Gaussian',
  'rp.gen.kind.colored': 'Filtered / colored',
  'rp.gen.kind.nrz': 'Binary NRZ',
  'rp.gen.resample': 'Resample',
  'rp.gen.reset': 'Reset',
  'rp.gen.realizations': '$M$ (realizations)',

  // ── Filter generator (§5.3 controls) ─────────────────────────────────────
  'rp.filt.title': 'White noise → filter',
  'rp.filt.kind': 'Filter',
  'rp.filt.kind.rc': 'RC low-pass',
  'rp.filt.kind.ideal': 'Ideal LPF',

  // ── §5.2 section titles ──────────────────────────────────────────────────
  'rp.ensemble.title': 'Ensemble & mean (§5.2.1)',
  'rp.autocorr.title': 'Autocorrelation & ergodicity (§5.2.2)',
  'rp.psd.title': 'Power spectral density (§5.2.5)',
  'rp.filter.title': 'LTI filtering (§5.2.4)',

  // ── §5.3 section titles ──────────────────────────────────────────────────
  'rp.filtermag.title': 'Filter magnitude $|H(f)|^2$ (§5.2.4)',
  'rp.filterhist.title': 'Filtered Gaussian stays Gaussian (§5.3.3)',

  // ── Readouts ─────────────────────────────────────────────────────────────
  'rp.readout.mean': 'ensemble mean $\\hat{m}_X$',
  'rp.readout.power': 'power $P_X = R_X(0)$',

  // ── Plot titles / traces ─────────────────────────────────────────────────
  'rp.plot.ensemble': 'Sample functions & mean $m_X(t)$',
  'rp.plot.autocorr': 'Autocorrelation $R_X(\\tau)$',
  'rp.plot.psd': 'Power spectral density $S_X(f)$',
  'rp.trace.theory': 'theory',
  'rp.trace.timeAvg': 'time average',
  'rp.trace.ensemble': 'ensemble average',
  'rp.trace.estimate': 'estimate',

  // ── Placeholders (built in later phases) ─────────────────────────────────
  'rp.soon.title': 'Coming soon',
  'rp.soon.prob':
    'The §5.1 probability review (distributions, Q-function, Bayes, functions of a random variable, joint Gaussian, and the central limit theorem) is under construction.',
  'rp.soon.gaussianExtra':
    'Dedicated §5.3.1 Gaussian-process and §5.3.2 white-noise sections (thermal-noise model, in-phase/quadrature decomposition, noise-equivalent bandwidth) are under construction.',
};
