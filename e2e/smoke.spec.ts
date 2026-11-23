import { test, expect } from '@playwright/test';

test.describe('AirWise E2E Flow', () => {
  test('Demo mode: Loads Delhi, inspects air quality, submits profile, reviews plan, adjusts what-if slider', async ({
    page,
  }) => {
    // 1. Visit demo mode URL
    await page.goto('/?demo=1');

    // 2. Validate branding and hero
    const mainTitle = page.getByRole('heading', { level: 1 });
    await expect(mainTitle).toContainText(/AirWise/i);

    // 3. Verify Delhi air quality data rendered
    await expect(page.getByText(/Current Air Quality/i)).toBeVisible();
    await expect(page.getByText(/Hazardous/i)).toBeVisible();
    await expect(page.getByText(/Best Ventilation Window/i)).toBeVisible();

    // 4. Verify pre-filled household form and submit
    const submitBtn = page.getByRole('button', { name: /get my air quality plan/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 5. Verify plan recommendations rendered
    await expect(page.getByText(/Your Air Quality Plan/i)).toBeVisible();
    await expect(page.getByText(/Low-Emission Daily Routine/i)).toBeVisible();
    await expect(page.getByText(/Indoor Air Quality Hacks/i)).toBeVisible();
    await expect(page.getByText(/Sustainable Alternatives/i)).toBeVisible();
    await expect(page.getByText(/Protection Guidance/i)).toBeVisible();

    // 6. Verify What-If Slider interactive calculation
    const slider = page.getByLabel(/metro days/i);
    await expect(slider).toBeVisible();
    await slider.fill('4');

    // 7. Verify Community Share is present
    await expect(page.getByRole('button', { name: /share/i })).toBeVisible();
  });
});
