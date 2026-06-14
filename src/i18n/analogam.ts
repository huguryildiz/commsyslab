export const analogam: Record<string, string> = {
  // Navigation & landing (new keys for AM module)
  'nav.analogAm': 'Amplitude Modulation (AM)',
  'landing.mod.analog-am.title': 'Amplitude Modulation (AM)',
  'landing.mod.analog-am.desc':
    'Amplitude modulation: DSB-SC, conventional, SSB & VSB, power efficiency, envelope/coherent detection, and the superheterodyne receiver.',

  // Animation + panel selector
  'analog.animation': 'Animation',
  'analog.panel.select': 'Panel',

  // Tab bar (4-tab restructure; 'mux' lands in Plan 3)
  'analog.tab.ariaLabel': 'Amplitude Modulation tabs',
  'analog.tab.schemes': 'AM Schemes',
  'analog.tab.modimpl': 'Modulators & Demodulators',
  'analog.tab.mux': 'Signal Multiplexing',
  'analog.tab.radio': 'AM Radio Broadcasting',

  // AM Schemes — scheme selector + sideband toggle
  'analog.am.scheme': 'AM scheme',
  'analog.am.scheme.dsb': 'DSB-SC',
  'analog.am.scheme.conventional': 'Conventional',
  'analog.am.scheme.ssb': 'SSB',
  'analog.am.scheme.vsb': 'VSB',
  'analog.am.ssbSide': 'Sideband',
  'analog.am.ssbSide.usb': 'Upper (USB)',
  'analog.am.ssbSide.lsb': 'Lower (LSB)',
  'analog.am.vestige': 'Vestige width',
  'analog.am.observe': 'Watch how the spectrum and envelope change as you switch schemes and raise the modulation index a.',

  // AM Modulator panel
  'analog.am.title': 'AM Modulator',
  'analog.am.mode': 'Modulation mode',
  'analog.am.mode.dsb': 'DSB-SC (Double sideband)',
  'analog.am.mode.conventional': 'Conventional AM',
  'analog.am.mode.ssb-usb': 'SSB-USB (Upper sideband)',
  'analog.am.mode.ssb-lsb': 'SSB-LSB (Lower sideband)',
  'analog.am.mode.vsb': 'VSB (Vestigial sideband)',
  'analog.am.messageFreq': 'Message frequency fₘ',
  'analog.am.carrierFreq': 'Carrier frequency fᶜ',
  'analog.am.carrierAmp': 'Carrier amplitude Aᶜ',
  'analog.am.modIndex': 'Modulation index a',
  'analog.am.warning.overmod': 'Warning: Over-modulation (a > 1) detected',
  'analog.am.spectrum': 'Frequency spectrum',
  'analog.am.timeDomain': 'Time domain waveform',

  // Power & Efficiency panel
  'analog.power.title': 'Power & Efficiency',
  'analog.power.carrierPower': 'Carrier power Pᶜ',
  'analog.power.sidebandPower': 'Sideband power Pₛ',
  'analog.power.efficiency': 'Modulation efficiency η',
  'analog.power.chart': 'Power distribution',

  // Superheterodyne panel
  'analog.super.title': 'Superheterodyne Receiver',
  'analog.super.station': 'Station frequency fᶜ',
  'analog.super.if': 'IF frequency f_IF',
  'analog.super.lo': 'Local oscillator f_LO',
  'analog.super.image': 'Image frequency',
  'analog.super.plan': 'RF → IF frequency plan',
  'analog.super.rf': 'RF amp',
  'analog.super.mixer': 'Mixer',
  'analog.super.iffilter': 'IF filter',
  'analog.super.detector': 'Detector',
  'analog.super.audio': 'Audio',
  'analog.super.stationFreq': 'Station frequency fᶜ',
  'analog.super.loFreq': 'Local oscillator fₗₒ',
  'analog.super.ifFreq': 'IF frequency fᵢf',
  'analog.super.rfToIf': 'RF → IF frequency translation',
  'analog.super.imageFreq': 'Image frequency fᵢₘₐgₑ',
  'analog.super.chain': 'Receiver chain: RF → Mixer → IF filter → Detector',

  // Demodulation panel (AM-relevant methods)
  'analog.demod.title': 'Demodulation',
  'analog.demod.method': 'Demodulation method',
  'analog.demod.method.envelope': 'Envelope detector',
  'analog.demod.method.coherent': 'Coherent (sync) detector',
  'analog.demod.method.pll': 'PLL carrier recovery',
  'analog.demod.recovered': 'Recovered message',
  'analog.demod.original': 'Original message',
  'analog.demod.carrier': 'Recovered carrier cos θ̂(t)',
  'analog.demod.distortion': 'Detection distortion',
  'analog.demod.fidelity': 'Recovery fidelity',
  'analog.demod.faithful': 'Faithful',
  'analog.demod.distorted': 'Distorted',
  'analog.demod.warning': 'Envelope detector fails for a > 1 (over-modulation).',
  'analog.demod.lockStatus': 'PLL lock status',
  'analog.demod.locked': 'Locked',
  'analog.demod.unlocked': 'Unlocked',

  // Readouts
  'analog.readout.bandwidth': 'Bandwidth',
  'analog.readout.peakFreq': 'Peak frequency',
  'analog.readout.power': 'Power',
  'analog.readout.efficiency': 'Efficiency',
  'analog.readout.distortion': 'Distortion',

  // Theory box (AM theory)
  'analog.theory.title': 'Analog Modulation Theory',
  'analog.theory.dsb': 'DSB-SC: u(t) = m(t)·cos(2πfᶜt)',
  'analog.theory.conventional': 'Conventional AM: u(t) = Aᶜ[1 + a·mₙ(t)]·cos(2πfᶜt)',
  'analog.theory.efficiency': 'Efficiency: η = a²Pₘₙ/(1+a²Pₘₙ)',
  'analog.theory.pll': 'PLL: θ̂(t) tracks carrier phase',
  'analog.theory.super': 'Heterodyne: fₗₒ = fᶜ + fᵢf',
};
