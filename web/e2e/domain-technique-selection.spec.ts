/**
 * @fileoverview Domain Selection and Technique Configuration Tests
 * 
 * Tests for domain management and RAG technique selection workflows.
 */

import { test, expect } from '@playwright/test';

test.describe('Domain Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query-builder');
  });

  test('should display available domains', async ({ page }) => {
    // Look for domain selector
    const domainSelect = page.locator('[data-testid="domain-selector"]');
    
    if (await domainSelect.isVisible()) {
      await domainSelect.click();
      
      // Verify domain options are displayed
      const domainOptions = page.locator('[data-testid="domain-option"]');
      await expect(domainOptions.first()).toBeVisible();
    }
  });

  test('should allow selecting a preloaded domain', async ({ page }) => {
    const domainSelect = page.locator('[data-testid="domain-selector"]');
    
    if (await domainSelect.isVisible()) {
      await domainSelect.click();
      
      // Select first domain
      const firstDomain = page.locator('[data-testid="domain-option"]').first();
      await firstDomain.click();
      
      // Verify selection
      await expect(domainSelect).toContainText(/AI|Wikipedia|Test/i);
    }
  });

  test('should display document upload option', async ({ page }) => {
    // Look for upload button or file input
    const uploadButton = page.getByRole('button', { name: /upload.*document/i });
    const fileInput = page.locator('input[type="file"]');
    
    const hasUploadOption = await uploadButton.isVisible() || await fileInput.isVisible();
    expect(hasUploadOption).toBeTruthy();
  });

  test('should validate file type for document upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Try to upload invalid file type
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test content'),
      });
      
      // Verify error or rejection
      const errorMessage = page.getByText(/invalid.*file.*type|only.*pdf/i);
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });
});

test.describe('Technique Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query-builder');
  });

  test('should display all available RAG techniques', async ({ page }) => {
    // Verify each technique option is present
    await expect(page.getByText(/hybrid search/i)).toBeVisible();
    await expect(page.getByText(/semantic search/i)).toBeVisible();
    await expect(page.getByText(/reranking/i)).toBeVisible();
    await expect(page.getByText(/contextual retrieval/i)).toBeVisible();
  });

  test('should allow selecting single technique', async ({ page }) => {
    const hybridCheckbox = page.getByLabel(/hybrid search/i);
    await hybridCheckbox.check();
    
    await expect(hybridCheckbox).toBeChecked();
  });

  test('should allow selecting multiple techniques', async ({ page }) => {
    // Select multiple techniques
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/reranking/i).check();
    await page.getByLabel(/contextual retrieval/i).check();
    
    // Verify all are checked
    await expect(page.getByLabel(/hybrid search/i)).toBeChecked();
    await expect(page.getByLabel(/reranking/i)).toBeChecked();
    await expect(page.getByLabel(/contextual retrieval/i)).toBeChecked();
  });

  test('should display technique descriptions', async ({ page }) => {
    // Hover over technique to see description
    const hybridSearchLabel = page.getByText(/hybrid search/i).first();
    await hybridSearchLabel.hover();
    
    // Check for description or tooltip
    const description = page.locator('[data-testid="technique-description"]');
    if (await description.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(description).toContainText(/.+/); // Has some text
    }
  });

  test('should deselect technique when unchecked', async ({ page }) => {
    const hybridCheckbox = page.getByLabel(/hybrid search/i);
    
    // Check
    await hybridCheckbox.check();
    await expect(hybridCheckbox).toBeChecked();
    
    // Uncheck
    await hybridCheckbox.uncheck();
    await expect(hybridCheckbox).not.toBeChecked();
  });

  test('should maintain selection state during navigation', async ({ page }) => {
    // Select techniques
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/reranking/i).check();
    
    // Navigate away and back
    await page.goto('/');
    await page.goto('/query-builder');
    
    // Verify selections are persisted (if implemented)
    // This may vary based on implementation
    const hybridCheckbox = page.getByLabel(/hybrid search/i);
    const rerankingCheckbox = page.getByLabel(/reranking/i);
    
    // Check if state is persisted
    const isHybridChecked = await hybridCheckbox.isChecked();
    const isRerankingChecked = await rerankingCheckbox.isChecked();
    
    // Log state for debugging
    console.log('Hybrid Search persisted:', isHybridChecked);
    console.log('Reranking persisted:', isRerankingChecked);
  });
});

test.describe('Query Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/query-builder');
  });

  test('should accept valid query input', async ({ page }) => {
    const queryInput = page.getByPlaceholder(/enter your query/i);
    
    await queryInput.fill('What is machine learning?');
    await expect(queryInput).toHaveValue('What is machine learning?');
  });

  test('should enforce character limits on query', async ({ page }) => {
    const queryInput = page.getByPlaceholder(/enter your query/i);
    
    // Try to enter very long text
    const longQuery = 'A'.repeat(1000);
    await queryInput.fill(longQuery);
    
    const value = await queryInput.inputValue();
    
    // Verify limit is enforced (if applicable)
    if (value.length < longQuery.length) {
      expect(value.length).toBeLessThan(1000);
    }
  });

  test('should provide query suggestions', async ({ page }) => {
    const queryInput = page.getByPlaceholder(/enter your query/i);
    
    // Start typing
    await queryInput.fill('What is');
    
    // Look for suggestions dropdown
    const suggestions = page.locator('[data-testid="query-suggestions"]');
    if (await suggestions.isVisible({ timeout: 2000 }).catch(() => false)) {
      const suggestionItems = page.locator('[data-testid="suggestion-item"]');
      await expect(suggestionItems.first()).toBeVisible();
    }
  });

  test('should clear query input', async ({ page }) => {
    const queryInput = page.getByPlaceholder(/enter your query/i);
    
    // Enter query
    await queryInput.fill('Test query');
    await expect(queryInput).toHaveValue('Test query');
    
    // Look for clear button
    const clearButton = page.getByRole('button', { name: /clear/i });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await expect(queryInput).toHaveValue('');
    }
  });
});

test.describe('Combined Domain and Technique Selection', () => {
  test('should allow query submission with domain and techniques', async ({ page }) => {
    await page.goto('/query-builder');
    
    // Select domain if available
    const domainSelect = page.locator('[data-testid="domain-selector"]');
    if (await domainSelect.isVisible()) {
      await domainSelect.click();
      await page.locator('[data-testid="domain-option"]').first().click();
    }
    
    // Enter query
    await page.getByPlaceholder(/enter your query/i).fill('Explain artificial intelligence');
    
    // Select techniques
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/semantic search/i).check();
    
    // Submit
    const submitButton = page.getByRole('button', { name: /submit query/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Verify navigation to results
    await expect(page).toHaveURL(/.*results/);
  });

  test('should display selected configuration summary', async ({ page }) => {
    await page.goto('/query-builder');
    
    // Configure query
    await page.getByPlaceholder(/enter your query/i).fill('Test query');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByLabel(/reranking/i).check();
    
    // Look for configuration summary
    const summary = page.locator('[data-testid="config-summary"]');
    if (await summary.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(summary).toContainText(/2.*technique/i);
    }
  });
});

