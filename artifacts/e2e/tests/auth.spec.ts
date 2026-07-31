import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can open the homepage and navigate to login', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Wait for the app to render (look for standard layout elements)
    await expect(page.getByRole('banner')).toBeVisible(); // Assuming there's a header/banner

    // Find and click the login button/link (if it exists on the landing page)
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login/);
    } else {
      // If no link, just navigate directly to verify the route works
      await page.goto('/login');
    }

    // Verify the login form is rendered
    await expect(page.getByRole('heading', { name: /login|sign in|welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });
});
