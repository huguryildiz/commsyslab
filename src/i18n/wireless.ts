// Wireless Communications module strings (Proakis Ch. 10). English UI copy.
export const wireless: Record<string, string> = {
  'nav.wireless': 'Wireless & Fading',

  'wl.title': 'Wireless Communications',
  'wl.subtitle': 'Multipath fading channels: delay spread, frequency selectivity, and Doppler.',
  'wl.reset': 'Reset',

  // SS Synchronization tab (§15.6)
  'wl.tab.sync': 'SS Sync',
  'wl.sync.title': 'Spread-spectrum synchronization',
  'wl.sync.subtab.ariaLabel': 'Synchronization stage',
  'wl.sync.subtab.acq': 'Acquisition',
  'wl.sync.subtab.track': 'Tracking',
  'wl.sync.pd': 'Detection probability P_d',
  'wl.sync.pfa': 'False-alarm probability P_fa',
  'wl.sync.delta': 'Early–late spacing δ (chips)',
  'wl.sync.acq.title': 'Serial search — correlation vs offset',
  'wl.sync.track.title': 'Delay-locked loop — S-curve',
  'wl.sync.readout.offset': 'Peak offset (true delay)',
  'wl.sync.readout.acqTime': 'Mean acquisition time',
  'wl.sync.readout.delta': 'Gate spacing δ',
  'wl.sync.theory.title': 'Acquire, then track',
  'wl.sync.theory.body':
    'Synchronization happens in two stages. Acquisition slides the local PN replica past the incoming code one cell at a time until the correlation crosses a threshold — coarse alignment to within a chip. The mean acquisition time grows with the code length. Tracking then uses a delay-locked loop with an early–late gate: its discriminator S-curve crosses zero at perfect alignment with a restoring slope, so the loop holds the replica to a fraction of a chip against drift and Doppler.',
  'wl.sync.card.phases.title': 'Acquisition vs tracking',
  'wl.sync.card.phases.body': 'Coarse search to get within one chip, then a fine loop to stay locked.',
  'wl.sync.card.search.title': 'Serial search',
  'wl.sync.card.search.body':
    'Test each code phase in turn against a threshold; the expected time scales with the number of cells $N$ and worsens as $P_d$ falls.',
  'wl.sync.card.dll.title': 'Delay-locked loop',
  'wl.sync.card.dll.body':
    'A feedback loop whose discriminator output drives the timing error to zero — the stable lock point of the S-curve.',
  'wl.sync.card.earlylate.title': 'Early–late gate',
  'wl.sync.card.earlylate.body':
    'Correlate with replicas advanced and delayed by $\\delta/2$; their difference $S(\\tau)$ is positive for early error and negative for late, pulling the replica back.',

  // PN Codes tab (§15.4)
  'wl.tab.pn': 'PN Codes',
  'wl.pn.title': 'PN-sequence generation',
  'wl.pn.n': 'Register length n',
  'wl.pn.goldShift': 'Gold code shift',
  'wl.pn.lfsr.title': 'Linear feedback shift register',
  'wl.pn.wave.title': 'm-sequence waveform',
  'wl.pn.autocorr.title': 'Autocorrelation (thumbtack)',
  'wl.pn.cross.title': 'Gold-code cross-correlation',
  'wl.pn.readout.taps': 'Feedback taps',
  'wl.pn.readout.period': 'Period (2ⁿ−1)',
  'wl.pn.readout.balance': 'Balance (+1 / −1)',
  'wl.pn.readout.gp': 'Processing gain',
  'wl.pn.readout.crossPeak': 'Peak |cross-corr|',
  'wl.pn.readout.threeValued': 'Allowed values',
  'wl.pn.theory.title': 'Why spreading codes matter',
  'wl.pn.theory.body':
    'A maximal-length (m-)sequence from an n-stage LFSR has period 2ⁿ−1, near-equal numbers of ±1, and a two-valued "thumbtack" autocorrelation — ideal for synchronization and despreading. But only a few m-sequences exist per length and their mutual cross-correlation can be large. Gold codes combine a preferred pair of m-sequences to give a large family whose cross-correlation is bounded to three small values — the property that lets many CDMA users share one band.',
  'wl.pn.card.lfsr.title': 'LFSR',
  'wl.pn.card.lfsr.body':
    'A shift register whose input is the XOR of selected (tapped) stages. A primitive feedback polynomial makes it cycle through all $2^n-1$ nonzero states.',
  'wl.pn.card.mseq.title': 'm-sequence',
  'wl.pn.card.mseq.body':
    'The maximal-length output: period $2^n-1$, balanced, with the run-length and shift-and-add properties of pseudo-random noise.',
  'wl.pn.card.thumbtack.title': 'Thumbtack autocorrelation',
  'wl.pn.card.thumbtack.body':
    'Periodic autocorrelation is $N$ at zero lag and $-1$ everywhere else — a sharp peak the receiver uses to lock onto the code.',
  'wl.pn.card.gold.title': 'Gold codes',
  'wl.pn.card.gold.body':
    'XOR a preferred pair of m-sequences (with relative shifts) to build $2^n+1$ codes whose cross-correlation stays within $\\{-1,-t(n),t(n)-2\\}$.',

  // OFDM sub-tabs (Ch 11)
  'wl.ofdm.subtab.ariaLabel': 'OFDM sub-topic',
  'wl.ofdm.subtab.eq': 'Equalization',
  'wl.ofdm.subtab.papr': 'PAPR',
  'wl.ofdm.subtab.apps': 'Applications',
  'wl.ofdm.theory.title': 'Why OFDM works',
  'wl.ofdm.theory.body':
    'OFDM splits one fast, frequency-selective channel into many slow, flat subchannels. A cyclic prefix longer than the channel delay spread turns the linear multipath convolution into a circular one, so each subcarrier sees a single complex gain H[k] and is corrected by one complex division — at the cost of noise enhancement on deep-fade subcarriers.',
  'wl.ofdm.card.cp.title': 'Cyclic prefix',
  'wl.ofdm.card.cp.body':
    'The tail of each symbol is copied to its front. If it is at least as long as the channel delay spread, the multipath leaves the symbol body as a clean circular convolution — no inter-symbol or inter-carrier interference.',
  'wl.ofdm.card.eq.title': 'One-tap equalizer',
  'wl.ofdm.card.eq.body':
    'Each subcarrier is divided by its own channel gain, $\\hat{X}[k]=Y[k]/H[k]$ — a single complex multiply per subcarrier instead of a long time-domain equalizer.',
  'wl.ofdm.card.orth.title': 'Subcarrier orthogonality',
  'wl.ofdm.card.orth.body':
    'Subcarriers are spaced at $1/T$ so each sits on the spectral nulls of all the others; the receiver FFT separates them without cross-talk.',

  // OFDM Applications (§11.6)
  'wl.ofdm.apps.title': 'OFDM in the real world',
  'wl.ofdm.apps.intro': 'Where multicarrier modulation is deployed and the parameters each system uses.',
  'wl.ofdm.apps.theory.title': 'Common thread',
  'wl.ofdm.apps.theory.body':
    'Every system below picks the subcarrier count and cyclic-prefix length to match its channel: a longer delay spread needs a longer CP, and a more time-variant channel needs wider subcarrier spacing (fewer subcarriers).',
  'wl.ofdm.apps.dsl.title': 'DSL / ADSL (DMT)',
  'wl.ofdm.apps.dsl.body':
    'Discrete multitone over copper pairs uses up to 256 subcarriers with per-subcarrier bit loading — more bits on clean tones, fewer on noisy ones.',
  'wl.ofdm.apps.dvb.title': 'DVB-T',
  'wl.ofdm.apps.dvb.body':
    'Terrestrial digital TV uses 2k/8k subcarriers with a long guard interval to survive echoes in single-frequency broadcast networks.',
  'wl.ofdm.apps.wifi.title': 'Wi-Fi 802.11a/g/n',
  'wl.ofdm.apps.wifi.body':
    '64-point FFT, 52 active subcarriers, 0.8 µs cyclic prefix in a 20 MHz channel — short symbols for low-latency indoor links.',
  'wl.ofdm.apps.lte.title': 'LTE / 4G',
  'wl.ofdm.apps.lte.body':
    'Scalable OFDMA with 15 kHz subcarrier spacing and FFT sizes from 128 to 2048, letting one design span 1.4–20 MHz bandwidths.',

  // PAPR (§11.5)
  'wl.papr.title': 'Peak-to-average power',
  'wl.papr.subcarriers': 'Number of subcarriers N',
  'wl.papr.clip': 'Clip ratio (dB above RMS)',
  'wl.papr.trials': 'Monte-Carlo symbols',
  'wl.papr.ccdf.title': 'PAPR distribution (CCDF)',
  'wl.papr.env.title': 'Symbol envelope & clipping',
  'wl.papr.readout.papr': 'PAPR (this symbol)',
  'wl.papr.readout.clipped': 'PAPR after clipping',
  'wl.papr.readout.evm': 'Clipping EVM',
  'wl.papr.theory.title': 'The PAPR problem',
  'wl.papr.theory.body':
    'Because an OFDM symbol sums N independent subcarriers, they occasionally add in phase and produce a large peak. A high peak-to-average ratio forces the power amplifier into an expensive linear back-off; clipping the peaks cheaply lowers PAPR but adds in-band distortion (EVM) and out-of-band spectral regrowth.',
  'wl.papr.card.papr.title': 'PAPR',
  'wl.papr.card.papr.body': 'The ratio of the instantaneous peak power to the average power of the symbol.',
  'wl.papr.card.ccdf.title': 'CCDF',
  'wl.papr.card.ccdf.body':
    'The complementary CDF gives the probability a symbol exceeds a PAPR threshold. The empirical curve tracks the theoretical $1-(1-e^{-\\gamma})^N$ and rises with N.',
  'wl.papr.card.clip.title': 'Clipping vs back-off',
  'wl.papr.card.clip.body':
    'Hard-clipping the envelope lowers PAPR but injects distortion (EVM). The clip ratio trades distortion against amplifier efficiency.',

  'wl.gen.title': 'Channel scenario',
  'wl.gen.nTaps': 'Number of paths (taps)',
  'wl.gen.tauRms': 'Delay constant τ_rms (µs)',
  'wl.gen.tapSpacing': 'Tap spacing (µs)',
  'wl.gen.K': 'Rician K-factor (0 = Rayleigh)',
  'wl.gen.fD': 'Max Doppler f_D (Hz)',

  'wl.pdp.title': 'Power-delay profile',
  'wl.freq.title': 'Channel frequency response |H(f)|',
  'wl.env.title': 'Fading envelope & distribution',

  'wl.readout.sigmaTau': 'RMS delay spread σ_τ',
  'wl.readout.coherenceBw': 'Coherence bandwidth B_c',
  'wl.readout.coherenceTime': 'Coherence time T_c',

  // Tabs
  'wl.tab.fading': 'Fading Channel',
  'wl.tab.ber': 'BER, Diversity & Shadowing',

  // BER / shadowing section
  'wl.ber.title': 'Error performance over fading',
  'wl.ber.modulation': 'Binary modulation',
  'wl.ber.mod.antipodal': 'Antipodal (BPSK)',
  'wl.ber.mod.orthogonal': 'Orthogonal (BFSK)',
  'wl.ber.diversityL': 'Diversity order L (MRC)',
  'wl.ber.sigma': 'Shadowing σ (dB)',
  'wl.ber.threshold': 'Outage threshold γ_th (dB)',
  'wl.ber.curve.title': 'BER vs E_b/N₀ — AWGN, Rayleigh, MRC',
  'wl.ber.outage.title': 'Outage probability vs average SNR (shadowing)',

  // Spread-spectrum (DS-SS) section
  'wl.tab.spread': 'Spread Spectrum (DS-SS)',
  'wl.ss.title': 'Direct-sequence spread spectrum',
  'wl.ss.registerLength': 'PN register length n (N = 2ⁿ−1)',
  'wl.ss.ebN0': 'E_b/N₀ (dB)',
  'wl.ss.jsr': 'Jammer-to-signal ratio (dB)',
  'wl.ss.jammerOffset': 'Jammer frequency (× chip rate)',
  'wl.ss.autocorr.title': 'PN autocorrelation (peak N, off-peak −1)',
  'wl.ss.spectrum.title': 'Spectrum before vs after despreading',
  'wl.ss.ber.title': 'BER vs jammer power — spread vs unspread',
  'wl.ss.readout.gp': 'Processing gain G_p',
  'wl.ss.readout.N': 'Chips per bit N',

  // OFDM / multicarrier section
  'wl.tab.ofdm': 'OFDM',
  'wl.ofdm.title': 'OFDM / multicarrier',
  'wl.ofdm.subcarriers': 'Number of subcarriers N',
  'wl.ofdm.cp': 'Cyclic-prefix length (samples)',
  'wl.ofdm.taps': 'Channel delay spread L (taps)',
  'wl.ofdm.ebN0': 'E_b/N₀ (dB)',
  'wl.ofdm.time.title': 'OFDM symbol with cyclic prefix (time domain)',
  'wl.ofdm.channel.title': 'Channel |H(f)| across subcarriers',
  'wl.ofdm.preeq.title': 'Received constellation (before equalization)',
  'wl.ofdm.posteq.title': 'After one-tap equalization',
  'wl.ofdm.readout.cp': 'Cyclic prefix',
  'wl.ofdm.readout.evm': 'Post-EQ error (EVM)',
  'wl.ofdm.readout.cpState': 'CP vs delay spread',
  'wl.ofdm.cp.ok': 'sufficient (no ISI)',
  'wl.ofdm.cp.bad': 'too short → ISI/ICI',

  // Link budget section
  'wl.tab.linkbudget': 'Link Budget',
  'wl.lb.title': 'Link budget',
  'wl.lb.txPower': 'Tx power (dBm)',
  'wl.lb.txGain': 'Tx antenna gain (dBi)',
  'wl.lb.rxGain': 'Rx antenna gain (dBi)',
  'wl.lb.freq': 'Frequency (GHz)',
  'wl.lb.distance': 'Distance (km)',
  'wl.lb.otherLoss': 'Other losses (dB)',
  'wl.lb.bandwidth': 'Bandwidth (MHz)',
  'wl.lb.bitRate': 'Bit rate (Mbps)',
  'wl.lb.noiseFigure': 'Noise figure (dB)',
  'wl.lb.modulation': 'Modulation',
  'wl.lb.targetBer': 'Target BER',
  'wl.lb.model': 'Path-loss model',
  'wl.lb.model.freespace': 'Free space (Friis)',
  'wl.lb.model.logdistance': 'Log-distance',
  'wl.lb.model.hata': 'Hata (urban)',
  'wl.lb.exponent': 'Path-loss exponent n',
  'wl.lb.hBase': 'Base height (m)',
  'wl.lb.hMobile': 'Mobile height (m)',
  'wl.lb.sigma': 'Shadowing σ (dB)',
  'wl.lb.outage': 'Target outage',
  'wl.lb.waterfall.title': 'Link-budget waterfall',
  'wl.lb.range.title': 'Received power vs distance',
  'wl.lb.readout.pathLoss': 'Path loss',
  'wl.lb.readout.rxPower': 'Received power',
  'wl.lb.readout.noiseFloor': 'Noise floor',
  'wl.lb.readout.ebn0': 'Received E_b/N₀',
  'wl.lb.readout.required': 'Required E_b/N₀',
  'wl.lb.readout.fade': 'Fade margin',
  'wl.lb.readout.margin': 'Effective margin',
  'wl.lb.readout.range': 'Max range',
  'wl.lb.closes': 'Link closes',
  'wl.lb.fails': 'Link fails',

  // RAKE receiver section
  'wl.tab.rake': 'RAKE',
  'wl.rake.title': 'RAKE receiver',
  'wl.rake.nTaps': 'Number of paths (taps)',
  'wl.rake.tauRms': 'Delay spread τ_rms (ns)',
  'wl.rake.tapSpacing': 'Tap spacing (ns)',
  'wl.rake.chipRate': 'Chip rate (Mcps)',
  'wl.rake.ebN0': 'E_b/N₀ for finger SNRs (dB)',
  'wl.rake.pdp.title': 'Power-delay profile & resolvable fingers',
  'wl.rake.ber.title': 'BER vs E_b/N₀ — RAKE diversity',
  'wl.rake.snr.title': 'Per-finger SNR',
  'wl.rake.readout.fingers': 'Resolvable fingers L',
  'wl.rake.readout.chip': 'Chip duration',

  // MIMO section
  'wl.tab.mimo': 'MIMO',
  'wl.mimo.title': 'MIMO antennas',
  'wl.mimo.nt': 'Transmit antennas N_t',
  'wl.mimo.nr': 'Receive antennas N_r',
  'wl.mimo.trials': 'Monte-Carlo trials',
  'wl.mimo.seed': 'Seed',
  'wl.mimo.ber.title': 'BER vs E_b/N₀ — Alamouti diversity',
  'wl.mimo.cap.title': 'Ergodic capacity vs SNR',
  'wl.mimo.readout.divSiso': 'SISO diversity order',
  'wl.mimo.readout.divAlamouti': 'Alamouti 2×N_r order',
  'wl.mimo.readout.capAt': 'Capacity (N_t×N_r) @ 10 dB',

  // MIMO sub-tabs (§14.4)
  'wl.mimo.subtab.ariaLabel': 'MIMO sub-topic',
  'wl.mimo.subtab.mux': 'Spatial multiplexing',
  'wl.mimo.subtab.stc': 'Space-Time (Alamouti)',
  'wl.mimo.subtab.err': 'Error rate',
  'wl.mimo.theory.title': 'Multiple antennas, two gains',
  'wl.mimo.theory.body':
    'Receive antennas add array gain (a shift). Multiple antennas at BOTH ends add a slope: at high SNR the ergodic capacity grows like min(N_t,N_r)·log₂(ρ), the spatial-multiplexing gain — several independent data streams sharing the same band.',
  'wl.mimo.card.mux.title': 'Spatial multiplexing',
  'wl.mimo.card.mux.body':
    'A rich scattering channel lets $\\min(N_t,N_r)$ independent streams be separated at the receiver, multiplying the data rate without extra bandwidth.',
  'wl.mimo.card.cap.title': 'Ergodic capacity',
  'wl.mimo.card.cap.body':
    'Averaged over fading, $C=\\log_2\\det(I+\\tfrac{\\rho}{N_t}HH^{\\mathsf H})$ — the mutual information a random MIMO channel supports.',
  // Space-Time / Alamouti
  'wl.mimo.stc.title': 'Space-Time coding',
  'wl.mimo.stc.ebN0Max': 'E_b/N₀ axis max (dB)',
  'wl.mimo.stc.matrix.title': 'Alamouti 2×1 space-time block',
  'wl.mimo.stc.matrix.note':
    'Over two symbol periods the two antennas send (s₁,s₂) then (−s₂*,s₁*). The orthogonal structure lets a 1-antenna receiver recover both symbols with simple linear combining.',
  'wl.mimo.stc.ber.title': 'BER vs E_b/N₀ — transmit diversity',
  'wl.mimo.stc.theory.title': 'Diversity without a receive array',
  'wl.mimo.stc.theory.body':
    'Alamouti 2×1 achieves the same diversity order (2) as 1×2 MRC but pays a 3 dB penalty because the transmit power is split across two antennas. It gives transmit diversity to devices that cannot fit multiple receive antennas.',
  'wl.mimo.card.txdiv.title': 'Transmit diversity',
  'wl.mimo.card.txdiv.body': 'Diversity created at the transmitter, so a small handset with one antenna still benefits.',
  'wl.mimo.card.alamouti.title': 'Alamouti scheme',
  'wl.mimo.card.alamouti.body':
    'A rate-1 orthogonal space-time block code for two transmit antennas with a simple linear-combining decoder.',
  'wl.mimo.card.divorder.title': 'Diversity order',
  'wl.mimo.card.divorder.body':
    'The high-SNR BER slope on a log-log plot; order $L$ means $P_b\\propto \\gamma^{-L}$. Alamouti 2×1 reaches order 2.',
  // Spatial-multiplexing error rate
  'wl.mimo.err.title': 'Spatial-mux detection',
  'wl.mimo.err.plot.title': 'BER vs SNR — ZF vs MMSE',
  'wl.mimo.err.readout.config': 'Antenna config (N_t×N_r)',
  'wl.mimo.err.theory.title': 'Linear MIMO detection',
  'wl.mimo.err.theory.body':
    'Zero-forcing inverts the channel and enhances noise on weak eigenmodes; MMSE balances noise against interference and is always at least as good. With N_r ≥ N_t the streams are separable; extra receive antennas steepen the BER curve.',
  'wl.mimo.card.zfmmse.title': 'ZF vs MMSE',
  'wl.mimo.card.zfmmse.body':
    'ZF: $\\mathbf{W}=(\\mathbf{H}^{\\mathsf H}\\mathbf{H})^{-1}\\mathbf{H}^{\\mathsf H}$ removes interference but amplifies noise. MMSE adds $N_0\\mathbf{I}$ to trade a little residual interference for much less noise.',
  'wl.mimo.card.dmt.title': 'Diversity–multiplexing',
  'wl.mimo.card.dmt.body':
    'A fixed antenna array can be used for more streams (multiplexing) or more reliability (diversity), but not both at once — a fundamental tradeoff.',

  // Doppler / time-selective fading section
  'wl.tab.doppler': 'Doppler',
  'wl.doppler.title': 'Doppler & mobility',
  'wl.doppler.speed': 'Mobile speed (km/h)',
  'wl.doppler.carrier': 'Carrier frequency (GHz)',
  'wl.doppler.threshold': 'Fade threshold ρ (dB)',
  'wl.doppler.seed': 'Envelope seed',
  'wl.doppler.psd.title': 'Doppler power spectrum (classical/Jakes)',
  'wl.doppler.env.title': 'Fading envelope vs time',
  'wl.doppler.acf.title': 'Autocorrelation J₀(2π f_m τ)',
  'wl.doppler.readout.fm': 'Max Doppler f_m',
  'wl.doppler.readout.tc': 'Coherence time T_ct',
  'wl.doppler.readout.tcRule': 'T_c ≈ 0.423/f_m',
  'wl.doppler.readout.lcr': 'Level-crossing rate',
  'wl.doppler.readout.afd': 'Average fade duration',

  // Frequency-Hopped Spread Spectrum section
  'wl.tab.fhss': 'FH-SS',
  'wl.fhss.title': 'Frequency hopping',
  'wl.fhss.channels': 'Hop channels (W/R)',
  'wl.fhss.hops': 'Hops shown',
  'wl.fhss.beta': 'Partial-band fraction β',
  'wl.fhss.ebn0j': 'E_b/N_J (dB)',
  'wl.fhss.seed': 'Hop-pattern seed',
  'wl.fhss.hop.title': 'Hop pattern (time–frequency)',
  'wl.fhss.ber.title': 'BER vs E_b/N_J — partial-band jamming',
  'wl.fhss.readout.gain': 'Processing gain',
  'wl.fhss.readout.worstBeta': 'Worst-case β*',
  'wl.fhss.readout.worstBer': 'Worst-case BER @ op',
  'wl.fhss.readout.betaBer': 'BER at chosen β @ op',

  // CPM / MSK section
  'wl.tab.cpm': 'CPM / MSK',
  'wl.cpm.title': 'Continuous-phase modulation',
  'wl.cpm.h': 'Modulation index h',
  'wl.cpm.depth': 'Phase-tree depth (symbols)',
  'wl.cpm.tree.title': 'CPFSK phase tree',
  'wl.cpm.psd.title': 'Power spectrum: MSK vs QPSK',
  'wl.cpm.readout.mode': 'Scheme',
  'wl.cpm.readout.phase': 'Phase change per symbol',

  // CDMA multi-user / near-far section
  'wl.tab.cdma': 'CDMA',
  'wl.cdma.title': 'CDMA multi-user',
  'wl.cdma.gain': 'Processing gain L_c',
  'wl.cdma.users': 'Active users N_u',
  'wl.cdma.ebn0': 'E_b/N₀ (dB)',
  'wl.cdma.nearfar': 'Near-far ratio Γ (dB)',
  'wl.cdma.users.title': 'BER vs number of users',
  'wl.cdma.ebn0.title': 'BER vs E_b/N₀ — power control vs near-far',
  'wl.cdma.readout.sir': 'SIR',
  'wl.cdma.readout.ber': 'BER at operating point',
  'wl.cdma.readout.capacity': 'User capacity @ BER 1e-3',
};
