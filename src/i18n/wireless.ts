// Wireless Communications module strings (Proakis Ch. 10). English UI copy.
export const wireless: Record<string, string> = {
  'nav.wireless': 'Wireless & Fading',

  'wl.title': 'Wireless Communications',
  'wl.subtitle': 'Multipath fading channels: delay spread, frequency selectivity, and Doppler.',

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
  'wl.ber.readout.rayleighPenalty': 'Rayleigh penalty @ 1e-3',
};
