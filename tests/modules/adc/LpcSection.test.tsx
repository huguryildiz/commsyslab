import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LpcSection } from '@/modules/sampling-quantization/sections/media/LpcSection';

describe('LpcSection', () => {
  it('renders the model diagram, waveform/spectrum/residual plots, and info cards', () => {
    render(<LpcSection />);
    // Source-filter diagram + 3 zoomable canvases (waveform, spectrum, residual).
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Source-Filter Model')).toBeInTheDocument();
  });
});
