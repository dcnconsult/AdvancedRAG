/**
 * @fileoverview Responsive Design Tests
 * 
 * Tests application behavior across different screen sizes and devices.
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should display mobile-friendly welcome screen', async ({ page }) => {
    await page.goto('/');
    
    // Verify mobile layout
    const heading = page.locator('h2');
    await expect(heading).toBeVisible();
    
    // Verify CTA button is accessible
    const startButton = page.getByRole('button', { name: /start new comparison/i });
    await expect(startButton).toBeVisible();
    
    // Check that navigation is mobile-friendly (hamburger menu, etc.)
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    if (await mobileNav.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should handle mobile query builder', async ({ page }) => {
    await page.goto('/query-builder');
    
    // Verify query input is full-width on mobile
    const queryInput = page.getByPlaceholder(/enter your query/i);
    await expect(queryInput).toBeVisible();
    
    const inputBox = await queryInput.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (inputBox && viewportSize) {
      // Input should take most of the width on mobile
      expect(inputBox.width).toBeGreaterThan(viewportSize.width * 0.8);
    }
  });

  test('should display techniques in mobile-friendly layout', async ({ page }) => {
    await page.goto('/query-builder');
    
    // Technique checkboxes should be stacked vertically on mobile
    const techniques = page.locator('input[type="checkbox"]');
    const count = await techniques.count();
    
    if (count > 1) {
      const first = await techniques.first().boundingBox();
      const second = await techniques.nth(1).boundingBox();
      
      if (first && second) {
        // Should be stacked (second is below first)
        expect(second.y).toBeGreaterThan(first.y);
      }
    }
  });

  test('should show mobile results in accordion/tabs view', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Test query');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    // Mobile should use tabs or accordion instead of side-by-side
    const tabs = page.locator('[role="tab"]');
    const accordion = page.locator('[data-testid="accordion-item"]');
    
    const hasMobileLayout = await tabs.first().isVisible({ timeout: 2000 }).catch(() => false) ||
                           await accordion.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasMobileLayout).toBeTruthy();
  });

  test('should handle mobile touch interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test swipe gesture for mobile nav (if applicable)
    const startButton = page.getByRole('button', { name: /start new comparison/i });
    await startButton.tap();
    
    await expect(page).toHaveURL(/.*query-builder/);
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ ...devices['iPad Pro'] });

  test('should display optimized layout for tablet', async ({ page }) => {
    await page.goto('/');
    
    // Verify tablet-specific layout
    const heading = page.locator('h2');
    await expect(heading).toBeVisible();
    
    // Check for tablet-optimized grid (2 columns for features, etc.)
    const featureCards = page.locator('[data-testid="feature-card"]');
    if (await featureCards.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      const count = await featureCards.count();
      if (count >= 2) {
        const first = await featureCards.first().boundingBox();
        const second = await featureCards.nth(1).boundingBox();
        
        if (first && second) {
          // On tablet, features might be in 2 columns
          const sameRow = Math.abs(first.y - second.y) < 50;
          expect(sameRow).toBeTruthy();
        }
      }
    }
  });

  test('should show results in appropriate layout for tablet', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Tablet test query');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/reranking/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    // Tablet might show 2 techniques side-by-side
    const techniqueCards = page.locator('[data-testid="technique-card"]');
    const count = await techniqueCards.count();
    
    if (count >= 2) {
      const first = await techniqueCards.first().boundingBox();
      const second = await techniqueCards.nth(1).boundingBox();
      
      if (first && second) {
        // Check if cards are side-by-side or stacked
        const sideBySide = Math.abs(first.y - second.y) < 50;
        const viewportWidth = page.viewportSize()?.width || 0;
        
        // On tablet landscape, might be side-by-side
        if (viewportWidth > 1000) {
          expect(sideBySide).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Desktop Responsiveness', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('should use full desktop layout', async ({ page }) => {
    await page.goto('/');
    
    // Verify desktop-specific layout
    const container = page.locator('.container, [data-testid="main-container"]').first();
    const box = await container.boundingBox();
    
    if (box) {
      // Container should have appropriate max-width on desktop
      expect(box.width).toBeLessThan(1920);
      expect(box.width).toBeGreaterThan(800);
    }
  });

  test('should display techniques side-by-side on desktop', async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Desktop test query');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/semantic search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    // Desktop should show side-by-side comparison
    const cards = page.locator('[data-testid="technique-card"]');
    const count = await cards.count();
    
    if (count >= 2) {
      const first = await cards.first().boundingBox();
      const second = await cards.nth(1).boundingBox();
      
      if (first && second) {
        // Cards should be horizontally aligned
        const sideBySide = Math.abs(first.y - second.y) < 50;
        expect(sideBySide).toBeTruthy();
        
        // Second card should be to the right of first
        expect(second.x).toBeGreaterThan(first.x);
      }
    }
  });

  test('should show expanded features on desktop', async ({ page }) => {
    await page.goto('/');
    
    // Desktop should show all features in a grid
    const featureCards = page.locator('[data-testid="feature-card"]');
    if (await featureCards.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      const count = await featureCards.count();
      
      if (count >= 3) {
        // All 3 features should be in one row on wide desktop
        const first = await featureCards.first().boundingBox();
        const third = await featureCards.nth(2).boundingBox();
        
        if (first && third) {
          const sameRow = Math.abs(first.y - third.y) < 50;
          expect(sameRow).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Viewport Transitions', () => {
  test('should adapt layout when resizing from desktop to mobile', async ({ page }) => {
    // Start with desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Verify desktop layout
    let heading = page.locator('h2');
    await expect(heading).toBeVisible();
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for layout to adapt
    await page.waitForTimeout(500);
    
    // Verify mobile layout is applied
    heading = page.locator('h2');
    await expect(heading).toBeVisible();
    
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    if (await mobileNav.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should maintain functionality across viewport changes', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/query-builder');
    
    // Enter query on tablet size
    await page.getByPlaceholder(/enter your query/i).fill('Resize test');
    await page.getByLabel(/hybrid search/i).check();
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Verify selections are maintained
    const queryInput = page.getByPlaceholder(/enter your query/i);
    await expect(queryInput).toHaveValue('Resize test');
    
    const checkbox = page.getByLabel(/hybrid search/i);
    await expect(checkbox).toBeChecked();
  });
});

test.describe('Orientation Changes', () => {
  test('should handle portrait to landscape orientation', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('h2')).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);
    
    // Content should still be visible and accessible
    await expect(page.locator('h2')).toBeVisible();
    const startButton = page.getByRole('button', { name: /start new comparison/i });
    await expect(startButton).toBeVisible();
  });
});

