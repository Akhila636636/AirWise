import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Header } from '../components/Header';
import { RecommendationCard } from '../components/RecommendationCard';
import { HowCalculated } from '../components/HowCalculated';

describe('Accessibility Standards (WCAG 2.2 AA)', () => {
  it('Header passes axe accessibility audits', async () => {
    const { container } = render(
      <Header
        language="en"
        onLanguageChange={() => {}}
        theme="light"
        onThemeChange={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('RecommendationCard passes axe accessibility audits', async () => {
    const mockRec = {
      actionId: 'use_n95_commute',
      title: 'Wear N95/FFP2 respirator during commute',
      steps: ['Put on N95 mask before leaving home', 'Ensure tight seal around nose'],
      whyItHelps: 'Blocks over 80% of fine particles during peak traffic smog',
      difficulty: 'easy' as const,
      cost: 'low' as const,
    };

    const { container } = render(
      <RecommendationCard
        recommendation={mockRec}
        language="en"
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('HowCalculated disclosure passes axe accessibility audits', async () => {
    const { container } = render(<HowCalculated language="en" />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
