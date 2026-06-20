import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DpcmSection } from '@/modules/sampling-quantization/sections/waveform/DpcmSection';

describe('DpcmSection', () => {
  it('renders the trace plot, prediction-gain readout, and info cards', () => {
    render(<DpcmSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Prediction gain')).toBeInTheDocument();
    expect(screen.getByText('Differential PCM')).toBeInTheDocument();
  });
});
