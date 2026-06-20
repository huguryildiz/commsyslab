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
  'wl.ss.readout.pe': 'Detector P_e @ operating point',
  'wl.ss.theory.title': 'Trading bandwidth for jamming immunity',
  'wl.ss.theory.body':
    'The data bit is multiplied by a fast ±1 PN code, spreading its energy across the whole chip-rate band. At the receiver, multiplying by the same code again collapses the wanted signal back to baseband while smearing any narrowband jammer across the band — so only 1/N of the jammer power lands in the data bandwidth. That factor N is the processing gain, and it sets the jamming margin.',
  'wl.ss.card.gp.title': 'Processing gain',
  'wl.ss.card.gp.body': 'The bandwidth-expansion factor $N$; despreading suppresses narrowband interference by $N$.',
  'wl.ss.card.despread.title': 'Despreading',
  'wl.ss.card.despread.body':
    'Re-multiplying by the PN code de-spreads the signal to baseband and spreads the jammer — concentrating wanted power and diluting interference.',
  'wl.ss.card.margin.title': 'Jamming margin',
  'wl.ss.card.margin.body':
    'The extra jammer power the link can tolerate thanks to the processing gain; $P_e=Q(\\sqrt{2\\gamma_{\\text{eff}}})$ at the detector.',

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

  // ── Retrofit: CPM/MSK cards/theory ──
  'wl.cpm.theory.title': 'Continuous-phase modulation',
  'wl.cpm.theory.body':
    'In CPFSK the carrier phase ramps continuously instead of jumping, so the envelope stays constant — ideal for efficient non-linear power amplifiers. Each bit tilts the phase by ±h·180°; at the modulation index h=½ that is ±90°, exactly MSK. MSK has a wider main lobe than QPSK but its sidelobes fall as f⁻⁴ versus QPSK’s f⁻², leaking far less into neighbouring channels — why constant-envelope CPM (e.g. GSM’s GMSK) is favoured where spectral containment matters.',
  'wl.cpm.card.continuous.title': 'Continuous phase',
  'wl.cpm.card.continuous.body':
    'Phase never jumps, so the envelope is constant — no AM for a non-linear amplifier to distort, unlike QPSK.',
  'wl.cpm.card.index.title': 'Modulation index h',
  'wl.cpm.card.index.body':
    'Each bit changes the phase by $\\pm h\\pi$. Larger $h$ fans the phase tree wider (more bandwidth); $h=\\tfrac12$ gives MSK.',
  'wl.cpm.card.msk.title': 'MSK spectral efficiency',
  'wl.cpm.card.msk.body':
    'MSK sidelobes decay as $f^{-4}$ vs QPSK’s $f^{-2}$, so it spills much less power into adjacent channels despite a wider main lobe.',

  // ── Retrofit: FHSS cards/theory + fast-FH (§15.5.2) ──
  'wl.fhss.hopsPerBit': 'Hops per bit L (fast FH)',
  'wl.fhss.readout.fastBer': 'Fast-FH BER @ op (L hops)',
  'wl.fhss.theory.title': 'Hopping away from the jammer',
  'wl.fhss.theory.body':
    'The carrier hops over W/R frequency slots on a pseudo-random schedule, so a narrowband jammer can only corrupt the few hops that land in its slot. A smart partial-band jammer concentrates power on the optimal fraction β*=2/γ_b of the band, making the BER decay only as 1/(E_b/N_J) — far above the exponential full-band curve. Fast frequency hopping sends each bit over L hops (L-order diversity): a jammer can hit at most a fraction of them, restoring a much steeper BER slope. This is why FH systems pair hopping with coding and interleaving.',
  'wl.fhss.card.hop.title': 'Frequency hopping',
  'wl.fhss.card.hop.body':
    'The carrier jumps over $W/R$ slots on a PN schedule; the slot count is the processing gain and the jammer can sit in only one slot.',
  'wl.fhss.card.partial.title': 'Partial-band jamming',
  'wl.fhss.card.partial.body':
    'Concentrating jam power on a fraction $\\beta^*=2/\\gamma_b$ of the band maximises damage, giving the slow-decaying worst-case $P_e=e^{-1}/\\gamma_b$.',
  'wl.fhss.card.slowfast.title': 'Slow vs fast FH',
  'wl.fhss.card.slowfast.body':
    'Slow FH sends one (or more) bits per hop; fast FH sends each bit over $L$ hops for $L$-order diversity, so $P_e\\propto q^{L}$ and the partial-band jammer loses its advantage.',

  // ── Retrofit: Link budget cards/theory ──
  'wl.lb.theory.title': 'Will the link close?',
  'wl.lb.theory.body':
    'A link budget stacks every gain and loss from transmitter to receiver. Received power $P_r=P_t+G_t+G_r-L-L_{\\text{other}}$ must exceed the receiver sensitivity (the noise floor plus the required $E_b/N_0$) by enough margin to survive shadowing fades. The received power falls with distance as the path loss grows; the maximum range is where the curve just meets the sensitivity-plus-fade-margin band.',
  'wl.lb.card.friis.title': 'Friis & path loss',
  'wl.lb.card.friis.body':
    'Free-space loss grows as $20\\log_{10}(d)+20\\log_{10}(f)$; log-distance and Hata models add an exponent/clutter term for real environments.',
  'wl.lb.card.noise.title': 'Noise floor',
  'wl.lb.card.noise.body':
    'Thermal noise $kTB$ plus the receiver noise figure sets the sensitivity floor; a wider bandwidth $B$ raises the floor and demands more received power.',
  'wl.lb.card.margin.title': 'Link margin',
  'wl.lb.card.margin.body':
    'The dB by which the received $E_b/N_0$ exceeds the requirement after subtracting the shadowing fade margin. Positive margin ⇒ the link closes.',

  // ── Retrofit: CDMA cards/theory ──
  'wl.cdma.theory.title': 'Interference-limited multiple access',
  'wl.cdma.theory.body':
    'In CDMA every user shares the band, separated only by their spreading codes. Each extra user adds interference, so the BER climbs with the user count until it crosses the target — that point is the user capacity, set by the processing gain $L_c$, not by bandwidth. The system also depends on tight power control: a single strong (near) user can swamp distant ones, the near-far problem, flooring the BER no matter how much $E_b/N_0$ is added.',
  'wl.cdma.card.access.title': 'Multiple access',
  'wl.cdma.card.access.body':
    'Users overlap in time and frequency and are distinguished by near-orthogonal codes; capacity is interference-limited, $\\mathrm{SIR}=3L_c/((N_u-1)\\Gamma)$.',
  'wl.cdma.card.nearfar.title': 'Near–far problem',
  'wl.cdma.card.nearfar.body':
    'A nearby transmitter ($\\Gamma>0$ dB) overwhelms far ones, flooring the BER — the defining vulnerability of CDMA.',
  'wl.cdma.card.power.title': 'Power control',
  'wl.cdma.card.power.body':
    'Fast closed-loop power control equalises every user’s received power ($\\Gamma=1$), restoring capacity and removing the BER floor.',

  // ── Retrofit: Fading channel cards/theory ──
  'wl.fading.theory.title': 'Multipath fading channels',
  'wl.fading.theory.body':
    'When a signal arrives via multiple reflected paths, the copies add constructively or destructively depending on their relative delays. The power-delay profile (PDP) gives the average power at each delay τ; the RMS delay spread σ_τ sets the coherence bandwidth B_c ≈ 1/(2πσ_τ), the frequency range over which |H(f)| stays correlated. Narrowband signals (bandwidth ≪ B_c) see a flat fade; wider signals are frequency-selective. Doppler makes the envelope fluctuate in time with coherence time T_c. With no line-of-sight (K=0) the envelope is Rayleigh; a dominant LOS path (K>0) makes it Rician.',
  'wl.fading.card.multipath.title': 'Multipath & delay spread',
  'wl.fading.card.multipath.body':
    'Reflections create delayed copies, each with delay $\\tau_k$ and power $P_k$. The RMS delay spread $\\sigma_\\tau$ summarises how spread out the echoes are — larger $\\sigma_\\tau$ means more inter-symbol interference for wideband signals.',
  'wl.fading.card.coherence.title': 'Coherence bandwidth',
  'wl.fading.card.coherence.body':
    'The coherence bandwidth $B_c \\approx 1/(2\\pi\\sigma_\\tau)$ is the frequency span over which $H(f)$ is roughly constant. Signals narrower than $B_c$ fade flat; wider ones are frequency-selective.',
  'wl.fading.card.distrib.title': 'Rayleigh vs Rician',
  'wl.fading.card.distrib.body':
    'With many scattered paths and no LOS, the envelope $|r|$ is Rayleigh ($K=0$). A dominant LOS path (Rician $K>0$) shifts probability toward the mean and shallows the fades.',

  // ── Retrofit: Doppler cards/theory ──
  'wl.doppler.theory.title': 'Doppler effect and time-selective fading',
  'wl.doppler.theory.body':
    'A moving receiver shifts each scattered path by a Doppler frequency proportional to the cosine of its arrival angle. The superposition occupies ±f_m = v·f_c/c around the carrier. The classical (Jakes) isotropic model gives a U-shaped power spectrum S(f) with energy piled at the band edges. The channel stays correlated only within the coherence time T_c ≈ 1/(2π f_m); faster mobiles fade more often but for shorter durations.',
  'wl.doppler.card.spread.title': 'Doppler spread',
  'wl.doppler.card.spread.body':
    'The maximum shift $f_m = v f_c / c$ sets the one-sided width of the received spectrum. Higher speed or carrier frequency widens it and makes the channel vary faster.',
  'wl.doppler.card.jakes.title': 'Jakes spectrum',
  'wl.doppler.card.jakes.body':
    'Isotropic scattering gives the classical U shape $S(f)=1/\\bigl(\\pi f_m\\sqrt{1-(f/f_m)^2}\\bigr)$, $|f|<f_m$ — energy peaks at $\\pm f_m$ from head-on and trailing paths.',
  'wl.doppler.card.coherence.title': 'Coherence time',
  'wl.doppler.card.coherence.body':
    'The coherence time $T_c \\approx 1/(2\\pi f_m)$ is how long the channel stays roughly constant. Transmissions spaced by more than $T_c$ fade independently — the basis of time interleaving.',

  // ── Retrofit: BER/diversity cards/theory ──
  'wl.ber.theory.title': 'Fading channels: BER and outage',
  'wl.ber.theory.body.ber':
    'On AWGN the bit-error probability falls exponentially with $E_b/N_0$. On Rayleigh fading, deep fades dominate the average so $P_b$ decays only as $1/\\bar\\gamma_b$ — a severe penalty. $L$-branch maximal-ratio combining restores the slope to $1/\\bar\\gamma_b^{L}$: extra branches make a simultaneous deep fade exponentially less likely.',
  'wl.ber.theory.body.outage':
    'Outage is the probability the instantaneous SNR $\\gamma$ falls below a threshold $\\gamma_{th}$. Without shadowing ($\\sigma=0$) the Rayleigh CDF gives $P_{out}=1-e^{-\\gamma_{th}/\\bar\\gamma}$. Log-normal shadowing randomises the local mean SNR itself, so a larger fade margin is needed for the same outage.',
  'wl.ber.card.penalty.title': 'Fading penalty',
  'wl.ber.card.penalty.body':
    'On Rayleigh fading $P_b\\approx \\tfrac{1}{4\\bar\\gamma_b}$ at high SNR — polynomial, not exponential, so the gap to AWGN grows with SNR.',
  'wl.ber.card.diversity.title': 'Diversity order',
  'wl.ber.card.diversity.body':
    '$L$-branch MRC achieves diversity order $L$: the log-log BER slope steepens to $\\bar\\gamma_b^{-L}$. Each independent branch divides the deep-fade probability.',
  'wl.ber.card.outage.title': 'Shadowing & outage',
  'wl.ber.card.outage.body':
    'Log-normal shadowing ($\\sigma$ dB) makes the local mean SNR random. Outage integrates over both Rayleigh fading and the shadow, demanding extra fade margin in coverage planning.',

  // ── Retrofit: RAKE cards/theory ──
  'wl.rake.theory.title': 'RAKE receivers turn multipath into diversity',
  'wl.rake.theory.body':
    'Paths separated by at least one chip $T_c=1/W$ are resolvable. A RAKE receiver assigns one correlator finger to each resolvable path, de-spreads each with a chip-aligned code replica, and combines the $L$ finger outputs by MRC: $\\bar\\gamma_b=\\sum_l\\gamma_l$. The no-RAKE curve falls as $1/\\bar\\gamma_b$; the RAKE curve falls as $1/\\bar\\gamma_b^{L}$, steepening toward the AWGN bound with each finger — multipath becomes free diversity.',
  'wl.rake.card.resolvable.title': 'Resolvable paths',
  'wl.rake.card.resolvable.body':
    'Two paths are resolvable when their delay differs by more than one chip $T_c=1/W$. A higher chip rate $W$ shortens $T_c$ and separates paths that were previously merged.',
  'wl.rake.card.fingers.title': 'RAKE fingers',
  'wl.rake.card.fingers.body':
    'Each finger is a correlator locked to one path: it multiplies by a delayed PN replica and integrates over $T_b$. The peak appears only when the replica is chip-aligned with that path.',
  'wl.rake.card.mrc.title': 'MRC of fingers',
  'wl.rake.card.mrc.body':
    'Maximal-ratio combining weights each finger by its channel gain before summing, maximising $\\gamma_{\\text{MRC}}=\\sum_l\\gamma_l$ and turning $L$ Rayleigh fades into $L$-th order diversity.',
};
