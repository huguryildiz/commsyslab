import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VectorQuantSection } from '@/modules/sampling-quantization/sections/quantization/VectorQuantSection';

describe('VectorQuantSection', () => {
  it('renders the scatter/Voronoi plot, distortion plot, and info cards', () => {
    render(<VectorQuantSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Vector quantization')).toBeInTheDocument();
  });
});
