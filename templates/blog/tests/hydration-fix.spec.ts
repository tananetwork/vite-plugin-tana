import { test, expect } from '@playwright/test';

/**
 * Tests for the client-side hydration fix
 *
 * This tests that React hydration works correctly when the site is deployed
 * to the blockchain and accessed via URLs like:
 * - /{base58Address}/{contractId}/ (direct edge access)
 * - /contracts/{contractId}/ (API gateway access)
 *
 * The fix strips these base paths before route matching so "/" routes
 * can be matched correctly.
 */
test.describe('Deployed Site Hydration', () => {
  // Contract ID from most recent deployment
  const contractId = '21795ef6-ea75-45cf-a14e-e401d90605b2';
  const storageAddress = '6RZ411u7FhSG2DkcKt';
  const edgeUrl = `http://imac:8506/${storageAddress}/${contractId}/`;
  const apiUrl = `http://imac:8080/contracts/${contractId}/`;

  test('should hydrate correctly via direct edge access', async ({ page }) => {
    // Navigate to the deployed site via edge
    await page.goto(edgeUrl);

    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');

    // Check that client.js was loaded
    const clientScript = page.locator('script[src="client.js"]');
    await expect(clientScript).toHaveCount(1);

    // Wait for React hydration to complete
    // The "Loading..." text should be replaced by actual content
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      if (!root) return false;

      // Check that hydration happened (no console error about "No matching route")
      // and content is rendered
      const h1 = root.querySelector('h1');
      return h1 && h1.textContent?.includes('My Blog');
    }, { timeout: 10000 });

    // Verify the page structure after hydration
    await expect(page.locator('h1')).toContainText('My Blog');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should NOT show hydration error in console', async ({ page }) => {
    const consoleMessages: string[] = [];

    // Capture console warnings/errors
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto(edgeUrl);
    await page.waitForLoadState('networkidle');

    // Give time for hydration to complete
    await page.waitForTimeout(3000);

    // Check that there's no "No matching route for hydration" error
    const hydrationError = consoleMessages.find(msg =>
      msg.includes('No matching route for hydration')
    );

    expect(hydrationError).toBeUndefined();
  });

  test('should hydrate correctly via API gateway', async ({ page }) => {
    // Navigate via API gateway
    await page.goto(apiUrl);

    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');

    // Wait for React hydration
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      if (!root) return false;
      const h1 = root.querySelector('h1');
      return h1 && h1.textContent?.includes('My Blog');
    }, { timeout: 10000 });

    await expect(page.locator('h1')).toContainText('My Blog');
  });
});
