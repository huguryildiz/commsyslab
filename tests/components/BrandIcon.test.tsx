import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandIcon } from '@/components/BrandIcon';

describe('BrandIcon', () => {
  it('renders an accessible svg mark at the requested size', () => {
    render(<BrandIcon size={32} />);
    const img = screen.getByRole('img', { name: 'CommSysLab' });
    expect(img).toHaveAttribute('width', '32');
    expect(img.tagName.toLowerCase()).toBe('svg');
  });
});
