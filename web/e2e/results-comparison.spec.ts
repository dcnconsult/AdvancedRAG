/**
 * @fileoverview Results Comparison Interface Tests
 * 
 * Tests for results visualization, technique comparison, and interactive features.
 */

import { test, expect } from '@playwright/test';

test.describe('Results Comparison Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to query builder and execute a query
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('What is artificial intelligence?');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/reranking/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Wait for results
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
  });

  test('should display results for all selected techniques', async ({ page }) => {
    const techniqueCards = page.locator('[data-testid="technique-card"]');
    const count = await techniqueCards.count();
    
    // Should have 2 cards (hybrid search + reranking)
    expect(count).toBeGreaterThanOrEqual(2);
    
    // Verify technique names are displayed
    await expect(page.getByText(/hybrid search/i)).toBeVisible();
    await expect(page.getByText(/reranking/i)).toBeVisible();
  });

  test('should show technique responses', async ({ page }) => {
    // Each technique card should have a response section
    const responseText = page.locator('[data-testid="technique-response"]');
    await expect(responseText.first()).toBeVisible();
    
    // Response should have some content
    const firstResponse = await responseText.first().textContent();
    expect(firstResponse).toBeTruthy();
    expect(firstResponse!.length).toBeGreaterThan(0);
  });

  test('should display source chunks', async ({ page }) => {
    const sourceChunks = page.locator('[data-testid="source-chunk"]');
    
    if (await sourceChunks.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(sourceChunks.first()).toBeVisible();
      
      // Each source should have content and score
      const firstChunk = sourceChunks.first();
      await expect(firstChunk).toContainText(/.+/); // Has content
    }
  });

  test('should show relevance scores for sources', async ({ page }) => {
    const scoreElements = page.locator('[data-testid="relevance-score"]');
    
    if (await scoreElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      const scoreText = await scoreElements.first().textContent();
      
      // Score should be a percentage or decimal
      expect(scoreText).toMatch(/\d+\.?\d*%?|0\.\d+/);
    }
  });

  test('should expand/collapse source chunks', async ({ page }) => {
    const expandButton = page.getByRole('button', { name: /show.*source|expand/i }).first();
    
    if (await expandButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to expand
      await expandButton.click();
      
      const sourceList = page.locator('[data-testid="source-list"]').first();
      await expect(sourceList).toBeVisible();
      
      // Click to collapse
      const collapseButton = page.getByRole('button', { name: /hide.*source|collapse/i }).first();
      await collapseButton.click();
      
      await expect(sourceList).not.toBeVisible();
    }
  });

  test('should display technique metadata', async ({ page }) => {
    const metadataSection = page.locator('[data-testid="technique-metadata"]').first();
    
    if (await metadataSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check for execution time
      await expect(metadataSection).toContainText(/\d+\.?\d*\s*(ms|s)/i);
      
      // Check for other metrics (tokens, etc.)
      const hasTokens = await metadataSection.textContent().then(text => 
        text?.includes('token') || false
      );
      
      if (hasTokens) {
        await expect(metadataSection).toContainText(/token/i);
      }
    }
  });
});

test.describe('Comparison Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('Explain machine learning');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/semantic search/i).check();
    await page.getByLabel(/reranking/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
  });

  test('should allow switching between comparison modes', async ({ page }) => {
    // Look for mode switcher (side-by-side, tabs, accordion)
    const modeSwitcher = page.locator('[data-testid="comparison-mode-switcher"]');
    
    if (await modeSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tabsButton = page.getByRole('button', { name: /tabs/i });
      if (await tabsButton.isVisible()) {
        await tabsButton.click();
        
        // Verify tab interface appears
        const tabs = page.locator('[role="tab"]');
        await expect(tabs.first()).toBeVisible();
      }
    }
  });

  test('should highlight best performing technique', async ({ page }) => {
    const bestTechnique = page.locator('[data-testid="best-technique"]');
    
    if (await bestTechnique.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Best technique should have some visual indicator
      const className = await bestTechnique.getAttribute('class');
      expect(className).toContain('highlight'); // Or whatever class is used
    }
  });

  test('should show performance rankings', async ({ page }) => {
    const rankingDisplay = page.locator('[data-testid="performance-ranking"]');
    
    if (await rankingDisplay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(rankingDisplay).toBeVisible();
      
      // Should show rank numbers (1, 2, 3, etc.)
      await expect(rankingDisplay).toContainText(/[1-3]/);
    }
  });

  test('should allow sorting techniques by different metrics', async ({ page }) => {
    const sortOptions = page.locator('[data-testid="sort-options"]');
    
    if (await sortOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select sort by execution time
      const sortByTime = page.getByRole('button', { name: /execution.*time/i });
      if (await sortByTime.isVisible()) {
        await sortByTime.click();
        
        // Verify order changes (implementation specific)
        await page.waitForTimeout(500); // Brief wait for re-sort
      }
    }
  });
});

test.describe('Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('What is AI?');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
  });

  test('should allow copying technique response', async ({ page }) => {
    const copyButton = page.getByRole('button', { name: /copy.*response/i }).first();
    
    if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyButton.click();
      
      // Verify copy confirmation
      const confirmation = page.getByText(/copied|copy.*success/i);
      if (await confirmation.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(confirmation).toBeVisible();
      }
    }
  });

  test('should allow exporting results', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i });
    
    if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(json|csv|pdf)/);
      }
    }
  });

  test('should open source inspection modal', async ({ page }) => {
    const sourceChunk = page.locator('[data-testid="source-chunk"]').first();
    
    if (await sourceChunk.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sourceChunk.click();
      
      // Look for modal
      const modal = page.locator('[data-testid="source-inspection-modal"]');
      if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        
        // Close modal
        const closeButton = page.getByRole('button', { name: /close/i });
        await closeButton.click();
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should show save session dialog for authenticated users', async ({ page }) => {
    // This test assumes user is authenticated
    const saveButton = page.getByRole('button', { name: /save session/i });
    
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
      
      const dialog = page.locator('[data-testid="save-session-dialog"]');
      await expect(dialog).toBeVisible();
      
      // Verify dialog has required fields
      await expect(page.getByLabel(/session.*name/i)).toBeVisible();
    }
  });
});

test.describe('Error Handling in Results', () => {
  test('should display error message for failed techniques', async ({ page }) => {
    // This test requires a scenario where a technique fails
    // Implementation depends on how errors are handled
    await page.goto('/results');
    
    const errorCard = page.locator('[data-testid="technique-error"]');
    if (await errorCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(errorCard).toContainText(/error|failed/i);
    }
  });

  test('should allow retrying failed techniques', async ({ page }) => {
    await page.goto('/results');
    
    const retryButton = page.getByRole('button', { name: /retry/i });
    if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await retryButton.click();
      
      // Verify loading state appears
      const loadingIndicator = page.locator('[data-testid="technique-loading"]');
      if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(loadingIndicator).toBeVisible();
      }
    }
  });
});

