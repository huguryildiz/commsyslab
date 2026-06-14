import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StartPage } from '@/pages/StartPage';

describe('StartPage (launcher)', () => {
  it('renders the heading and a button per module', () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Choose a module/i);
    expect(screen.getByRole('link', { name: /Sampling & Quantization/i })).toHaveAttribute('href', '/sampling');
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });
});
