/**
 * @fileoverview Visual Regression Tests
 * 
 * Tests for UI consistency and visual regression detection using Playwright screenshots.
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test('welcome screen visual snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('welcome-screen.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow minor differences
    });
  });

  test('query builder visual snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('query-builder.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('results comparison visual snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Visual regression test');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('results-comparison.png', {
      fullPage: true,
      maxDiffPixels: 150, // Allow for dynamic content differences
    });
  });

  test('mobile welcome screen snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('mobile-welcome.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('tablet query builder snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/query-builder');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('tablet-query-builder.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('Component Visual Regression', () => {
  test('technique card component snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Component test');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    const techniqueCard = page.locator('[data-testid="technique-card"]').first();
    await expect(techniqueCard).toHaveScreenshot('technique-card.png', {
      maxDiffPixels: 50,
    });
  });

  test('navigation header snapshot', async ({ page }) => {
    await page.goto('/');
    
    const header = page.locator('header, nav').first();
    await expect(header).toHaveScreenshot('nav-header.png', {
      maxDiffPixels: 50,
    });
  });

  test('query input component snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    
    const queryInput = page.getByPlaceholder(/enter your query/i);
    const inputContainer = queryInput.locator('..');
    
    await expect(inputContainer).toHaveScreenshot('query-input.png', {
      maxDiffPixels: 30,
    });
  });
});

test.describe('Dark Mode Visual Testing', () => {
  test('welcome screen dark mode snapshot', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('welcome-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('results comparison dark mode snapshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Dark mode test');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    await expect(page).toHaveScreenshot('results-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });
});

test.describe('Accessibility Visual Testing', () => {
  test('high contrast mode snapshot', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ 
      colorScheme: 'dark',
      forcedColors: 'active'
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('high-contrast-mode.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('focus state visual verification', async ({ page }) => {
    await page.goto('/query-builder');
    
    const queryInput = page.getByPlaceholder(/enter your query/i);
    await queryInput.focus();
    
    await expect(queryInput).toHaveScreenshot('input-focus-state.png', {
      maxDiffPixels: 30,
    });
  });
});

test.describe('Loading States Visual Testing', () => {
  test('technique loading state snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Loading state test');
    await page.getByLabel(/hybrid search/i).check();
    
    // Click submit and immediately capture loading state
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Capture the loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loadingIndicator).toHaveScreenshot('loading-state.png', {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Error States Visual Testing', () => {
  test('validation error state snapshot', async ({ page }) => {
    await page.goto('/query-builder');
    
    // Trigger validation error
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Wait for error message
    await page.waitForSelector('text=/query.*cannot be empty/i', { timeout: 2000 });
    
    await expect(page).toHaveScreenshot('validation-error.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

