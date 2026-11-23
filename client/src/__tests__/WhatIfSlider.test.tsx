import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatIfSlider } from '../components/WhatIfSlider';
import { DEMO_PROFILE } from '../utils/demo';

describe('WhatIfSlider Component', () => {
  it('renders without error and displays comparison values', () => {
    render(
      <WhatIfSlider
        profile={DEMO_PROFILE}
        outdoorPm25={250}
        language="en"
      />,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/What-If/i);
    expect(screen.getByLabelText(/metro days/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/induction cooking/i)).toBeInTheDocument();
    expect(screen.getByText(/before/i)).toBeInTheDocument();
    expect(screen.getByText(/after/i)).toBeInTheDocument();
  });
});
