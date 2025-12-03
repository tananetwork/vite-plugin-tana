import { test, expect } from '@playwright/test';

test.describe('Blog Template E2E Tests', () => {
  test.describe('SSR Rendering', () => {
    test('should render the page with SSR content', async ({ page }) => {
      // Navigate to the home page
      await page.goto('/');

      // Check that the main heading is rendered (SSR)
      const heading = page.locator('h1');
      await expect(heading).toContainText('My Blog');

      // Check that the subtitle is rendered
      const subtitle = page.locator('header p');
      await expect(subtitle).toContainText('Thoughts on code, design, and the decentralized web');
    });

    test('should have correct page structure', async ({ page }) => {
      await page.goto('/');

      // Check for header, main, and footer elements
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Client-Side Hydration', () => {
    test('should hydrate and show loading state then content', async ({ page }) => {
      await page.goto('/');

      // Wait for the page to hydrate - the footer should show post count after loading
      // The footer text changes from "Built with Tana" to "Built with Tana - X posts" after fetch
      await page.waitForFunction(() => {
        const footer = document.querySelector('footer');
        return footer && (
          footer.textContent?.includes('post') ||
          footer.textContent?.includes('No posts yet') ||
          footer.textContent?.includes('Built with Tana')
        );
      }, { timeout: 30000 });

      // After hydration, footer should contain "Built with Tana"
      const footer = page.locator('footer');
      await expect(footer).toContainText('Built with Tana');
    });

    test('should display empty state or posts after loading', async ({ page }) => {
      await page.goto('/');

      // Wait for loading to complete (either empty state or posts appear)
      await page.waitForFunction(() => {
        const main = document.querySelector('main');
        return main && (
          main.textContent?.includes('No posts yet') ||
          main.querySelector('article') !== null
        );
      }, { timeout: 30000 });

      // The main content should be visible
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('API Endpoints', () => {
    test('GET /api should return JSON response', async ({ request }) => {
      const response = await request.get('/api');
      expect(response.ok()).toBeTruthy();

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('posts');
      expect(data).toHaveProperty('count');
      expect(Array.isArray(data.posts)).toBeTruthy();
    });

    test('POST /api should create a new post', async ({ request }) => {
      const postData = {
        title: 'E2E Test Post',
        excerpt: 'Created by Playwright E2E test',
        content: 'This post was automatically created during E2E testing.'
      };

      const response = await request.post('/api', {
        data: postData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('post');
      expect(data.post.title).toBe(postData.title);
    });
  });

  test.describe('Full Integration', () => {
    test('should show new post after creation', async ({ page, request }) => {
      // First, create a post via API
      const uniqueTitle = `Integration Test Post ${Date.now()}`;
      await request.post('/api', {
        data: {
          title: uniqueTitle,
          excerpt: 'Testing the full flow',
          content: 'This tests that posts appear after creation.'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Navigate to the page
      await page.goto('/');

      // Wait for posts to load and check for the new post
      await page.waitForFunction(
        (title) => {
          const articles = document.querySelectorAll('article');
          for (const article of articles) {
            if (article.textContent?.includes(title)) {
              return true;
            }
          }
          return false;
        },
        uniqueTitle,
        { timeout: 30000 }
      );

      // Verify the post title is visible
      await expect(page.locator('article', { hasText: uniqueTitle })).toBeVisible();
    });
  });
});
