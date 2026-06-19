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

  // ── §5.1 sub-tabs ────────────────────────────────────────────────────────
  'rp.prob.sub.ariaLabel': '§5.1 topic',
  'rp.prob.sub.bayes': 'Probability & Bayes',
  'rp.prob.sub.rv': 'Random Variables',
  'rp.prob.sub.func': 'Functions of an RV',
  'rp.prob.sub.joint': 'Joint Gaussian',
  'rp.prob.sub.clt': 'Sums & CLT',

  // ── §5.1.2 Bayes (binary channel) ────────────────────────────────────────
  'rp.bayes.controls': 'Binary channel',
  'rp.bayes.prior': 'prior $P(X{=}1)$',
  'rp.bayes.eps0': '$P(Y{=}1\\mid X{=}0)$',
  'rp.bayes.eps1': '$P(Y{=}0\\mid X{=}1)$',
  'rp.bayes.plot': 'Posterior $P(X\\mid Y)$ after observing $Y$',
  'rp.bayes.py1': '$P(Y{=}1)$',
  'rp.bayes.py0': '$P(Y{=}0)$',
  'rp.bayes.postX1Y1': '$P(X{=}1\\mid Y{=}1)$',
  'rp.bayes.postX0Y0': '$P(X{=}0\\mid Y{=}0)$',
  'rp.bayes.theory':
    'Bayes’ rule inverts the channel: from the prior $P(X)$ and the transition probabilities it gives the posterior $P(X\\mid Y)$ after a symbol is received. The total-probability theorem gives $P(Y)$ in the denominator.',
  'rp.bayes.recvX1': 'received $Y=1$',
  'rp.bayes.recvX0': 'received $Y=0$',

  // ── §5.1.3 Random variables / Q-function ─────────────────────────────────
  'rp.rv.controls': 'Distribution',
  'rp.rv.kind': 'Distribution',
  'rp.rv.kind.gaussian': 'Gaussian',
  'rp.rv.kind.uniform': 'Uniform',
  'rp.rv.kind.rayleigh': 'Rayleigh',
  'rp.rv.kind.binomial': 'Binomial',
  'rp.rv.kind.bernoulli': 'Bernoulli',
  'rp.rv.samples': 'samples',
  'rp.rv.pdf': 'pdf $f_X(x)$ & sample histogram',
  'rp.rv.cdf': 'cdf $F_X(x)$',
  'rp.rv.mean': 'mean $m_X$',
  'rp.rv.var': 'variance $\\sigma_X^2$',
  'rp.rv.theory':
    'A random variable maps outcomes to numbers. The pdf $f_X(x)=\\frac{d}{dx}F_X(x)$ describes how probability is distributed; the histogram of many samples approaches it. Thermal noise is Gaussian (§5.1.3).',
  'rp.rv.trace.pdf': 'pdf',
  'rp.rv.trace.hist': 'samples',
  'rp.qfunc.title': 'Q-function tail $Q(x)=P(X>x)$',
  'rp.qfunc.threshold': 'threshold $x$',
  'rp.qfunc.value': '$Q(x)$',
  'rp.qfunc.theory':
    'The Q-function is the tail probability of a standard Gaussian, $Q(x)=\\int_x^{\\infty}\\frac{1}{\\sqrt{2\\pi}}e^{-t^2/2}\\,dt$ (Eq. 5.1.7). The shaded area is $Q(x)$; the dashed lines are the bounds of Eqs. 5.1.8–5.1.10.',
  'rp.qfunc.boundExp': 'upper $\\tfrac12 e^{-x^2/2}$',
  'rp.qfunc.boundTight': 'upper $\\tfrac{1}{\\sqrt{2\\pi}x}e^{-x^2/2}$',

  // ── §5.1.4 Functions of an RV ────────────────────────────────────────────
  'rp.func.controls': 'Linear map $Y=aX+b$',
  'rp.func.a': '$a$',
  'rp.func.b': '$b$',
  'rp.func.m': 'mean $m_X$',
  'rp.func.sigma': 'std. $\\sigma_X$',
  'rp.func.plot': 'Input $f_X$ and output $f_Y$ densities',
  'rp.func.result': '$Y\\sim\\mathcal{N}(am_X{+}b,\\ a^2\\sigma_X^2)$',
  'rp.func.theory':
    'A function $Y=g(X)$ is itself a random variable, with $f_Y(y)=\\sum_i f_X(x_i)/|g′(x_i)|$ (Eq. 5.1.11). A linear function of a Gaussian stays Gaussian (Eq. 5.1.12): only its mean and variance shift.',
  'rp.func.trace.in': 'input $f_X$',
  'rp.func.trace.out': 'output $f_Y$',

  // ── §5.1.5 Jointly Gaussian / correlation ────────────────────────────────
  'rp.joint.controls': 'Correlation',
  'rp.joint.rho': 'correlation $\\rho$',
  'rp.joint.plot': 'Jointly Gaussian samples $(X,Y)$',
  'rp.joint.cov': 'covariance $\\operatorname{cov}(X,Y)$',
  'rp.joint.theory':
    'Two jointly Gaussian variables are fully described by their means, variances and correlation $\\rho$. The cloud tilts with $\\rho$; the ellipses are constant-density contours. For Gaussians, uncorrelated ($\\rho{=}0$) $\\Leftrightarrow$ independent (§5.1.5).',

  // ── §5.1.6 Sums of RVs / CLT ─────────────────────────────────────────────
  'rp.clt.controls': 'Central limit theorem',
  'rp.clt.base': 'base distribution',
  'rp.clt.base.uniform': 'Uniform',
  'rp.clt.base.bernoulli': 'Bernoulli',
  'rp.clt.base.exponential': 'Exponential',
  'rp.clt.n': '$n$ (terms averaged)',
  'rp.clt.plot': 'Histogram of $\\bar{Y}=\\frac1n\\sum X_i$ vs Gaussian',
  'rp.clt.theory':
    'The central limit theorem: the average of $n$ i.i.d. variables tends to a Gaussian $\\mathcal{N}(m,\\sigma^2/n)$ as $n$ grows, whatever the base distribution (§5.1.6). This is why summed noise contributions are Gaussian.',
  'rp.clt.trace.hist': 'sample means',
  'rp.clt.trace.gauss': 'Gaussian limit',

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
