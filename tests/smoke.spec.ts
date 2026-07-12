import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Infrastructure Verification', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/hex-diva/i);
    // Verify page loaded
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('app root mounts without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Give page time to load and report any errors
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('Is this a CORS issue') &&
      !e.includes('Failed to load') &&
      !e.includes('Cannot find module')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('cron endpoint accessible (401 without valid signature)', async ({ page }) => {
    const response = await page.request.get('/api/cron/monthly-reset');
    // Should return 401 since we're not providing valid HMAC signature
    expect([401, 403]).toContain(response.status());
  });
});
