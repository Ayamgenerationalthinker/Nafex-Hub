import { test, expect } from '@playwright/test';

test.describe('Buyer Dashboard Journey', () => {
  test('User can navigate to their dashboard and view orders', async ({ page }) => {
    await page.goto('/');

    // Navigate to Dashboard
    const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
    } else {
      await page.goto('/dashboard');
    }

    // Verify dashboard layout renders
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Verify Orders section exists
    const ordersTab = page.getByRole('tab', { name: /orders/i });
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await expect(page.getByRole('table').or(page.locator('.order-list'))).toBeVisible();
    } else {
      // Direct navigation if no tabs
      await page.goto('/orders');
      await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
    }
  });
});
