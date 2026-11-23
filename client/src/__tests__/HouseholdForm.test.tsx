import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseholdForm } from '../components/HouseholdForm';

describe('HouseholdForm Component', () => {
  it('renders all key fields and allows updating values', async () => {
    const handleSubmit = vi.fn();
    render(
      <HouseholdForm
        initialProfile={null}
        onSubmit={handleSubmit}
        loading={false}
        language="en"
      />,
    );

    const sizeInput = screen.getByLabelText(/household size/i);
    expect(sizeInput).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /get my air quality plan/i });
    expect(submitBtn).toBeInTheDocument();

    await userEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders children, elderly, and sensitive checkboxes', () => {
    render(
      <HouseholdForm
        initialProfile={null}
        onSubmit={vi.fn()}
        loading={false}
        language="en"
      />,
    );

    expect(screen.getByLabelText(/children/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/elderly/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/respiratory/i)).toBeInTheDocument();
  });
});
