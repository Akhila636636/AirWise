import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App';

describe('App Component', () => {
  it('renders skip to main content link and primary brand heading', () => {
    render(<App />);

    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeInTheDocument();

    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toHaveTextContent(/AirWise/i);
  });

  it('renders location search bar input with label', () => {
    render(<App />);

    const searchInput = screen.getByRole('combobox', { name: /search for a city/i });
    expect(searchInput).toBeInTheDocument();
  });
});
