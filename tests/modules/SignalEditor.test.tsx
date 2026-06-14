import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalEditor } from '@/modules/modulation/SignalEditor';

const amps = [
  [1, 1, 0],
  [1, -1, 0],
];

describe('SignalEditor', () => {
  it('renders one number input per amplitude cell', () => {
    render(<SignalEditor amplitudes={amps} onChange={() => {}} />);
    expect(screen.getByLabelText('Signal 1 segment 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Signal 2 segment 3')).toBeInTheDocument();
  });

  it('editing a cell emits an updated copy', () => {
    const onChange = vi.fn();
    render(<SignalEditor amplitudes={amps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Signal 1 segment 1'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0][0]).toBe(3);
  });

  it('adding a signal appends a non-zero row', () => {
    const onChange = vi.fn();
    render(<SignalEditor amplitudes={amps} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Signal' }));
    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(3);
    expect(next[2].some((x: number) => x !== 0)).toBe(true);
  });

  it('marks a dependent signal row', () => {
    render(<SignalEditor amplitudes={amps} dependent={[false, true]} onChange={() => {}} />);
    expect(screen.getByText(/dependent/i)).toBeInTheDocument();
  });
});
