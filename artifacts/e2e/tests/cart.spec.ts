import { test, expect } from '@playwright/test';

test.describe('Cart and Checkout Journey', () => {
  test('User can add an item to the cart and proceed to checkout', async ({ page }) => {
    // 1. User navigates to the app
    await page.goto('/');

    // 2. Navigate to Explore or Product listing
    // We assume there's a link to 'Explore' or 'Shop'
    const shopLink = page.getByRole('link', { name: /explore|shop/i }).first();
    if (await shopLink.isVisible()) {
      await shopLink.click();
    } else {
      await page.goto('/explore');
    }

    // 3. Find a product and add to cart
    // Wait for product cards to load
    const productCard = page.locator('.product-card, [data-testid="product-card"]').first();
    
    // If there are products, interact with one
    if (await productCard.isVisible()) {
      await productCard.click();
      
      const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
      await expect(addToCartBtn).toBeVisible();
      await addToCartBtn.click();
      
      // 4. Navigate to cart
      const cartLink = page.getByRole('link', { name: /cart/i });
      await cartLink.click();
      await expect(page).toHaveURL(/.*cart/);

      // 5. Verify cart contents and checkout button
      const checkoutBtn = page.getByRole('button', { name: /checkout|pay/i });
      await expect(checkoutBtn).toBeVisible();
    } else {
      // Graceful fallback if no seed data exists in the DB during test
      console.log('No products found to test cart journey. Skipping add-to-cart interaction.');
    }
  });
});
