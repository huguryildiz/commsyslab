import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WaveformTab } from '@/modules/sampling-quantization/sections/waveform/WaveformTab';

describe('WaveformTab', () => {
  it('defaults to PCM and can switch to the DPCM placeholder', () => {
    render(<WaveformTab />);
    expect(screen.getByText('PCM bitstream')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'DPCM' }));
    expect(screen.getByText('Planned simulation')).toBeInTheDocument();
  });
});
