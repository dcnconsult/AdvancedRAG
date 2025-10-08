/**
 * @fileoverview End-to-End User Journey Tests
 * 
 * Tests the complete user flow from welcome screen through query execution
 * and results visualization.
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the welcome screen
    await page.goto('/');
  });

  test('should complete full comparison flow as anonymous user', async ({ page }) => {
    // Step 1: Welcome Screen
    await expect(page.locator('h2')).toContainText('Directly Compare Advanced RAG Paradigms');
    
    // Click "Start New Comparison" button
    const startButton = page.getByRole('button', { name: /start new comparison/i });
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    // Step 2: Query Builder
    await expect(page).toHaveURL(/.*query-builder/);
    
    // Enter query text
    const queryInput = page.getByPlaceholder(/enter your query/i);
    await expect(queryInput).toBeVisible();
    await queryInput.fill('What is artificial intelligence?');
    
    // Select RAG techniques
    const hybridSearchCheckbox = page.getByLabel(/hybrid search/i);
    await expect(hybridSearchCheckbox).toBeVisible();
    await hybridSearchCheckbox.check();
    
    const rerankingCheckbox = page.getByLabel(/reranking/i);
    await rerankingCheckbox.check();
    
    // Submit query
    const submitButton = page.getByRole('button', { name: /submit query/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Step 3: Results Comparison
    await expect(page).toHaveURL(/.*results/);
    
    // Wait for results to load (with timeout)
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    // Verify technique results are displayed
    const techniqueCards = page.locator('[data-testid="technique-card"]');
    await expect(techniqueCards).toHaveCount(2);
    
    // Verify results contain expected elements
    await expect(page.getByText(/hybrid search/i)).toBeVisible();
    await expect(page.getByText(/reranking/i)).toBeVisible();
    
    // Check for source chunks
    const sourceChunks = page.locator('[data-testid="source-chunk"]');
    await expect(sourceChunks.first()).toBeVisible();
  });

  test('should navigate to login from welcome screen', async ({ page }) => {
    // Click login link
    const loginLink = page.getByRole('link', { name: /login/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    
    // Verify navigation to login page
    await expect(page).toHaveURL(/.*login/);
    
    // Verify login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display feature previews on welcome screen', async ({ page }) => {
    // Verify feature cards are visible
    await expect(page.getByText(/side-by-side comparison/i)).toBeVisible();
    await expect(page.getByText(/advanced techniques/i)).toBeVisible();
    await expect(page.getByText(/real-time results/i)).toBeVisible();
  });

  test('should show validation errors for empty query', async ({ page }) => {
    // Navigate to query builder
    await page.goto('/query-builder');
    
    // Try to submit without entering query
    const submitButton = page.getByRole('button', { name: /submit query/i });
    await submitButton.click();
    
    // Verify error message
    await expect(page.getByText(/query.*cannot be empty/i)).toBeVisible();
  });

  test('should show validation errors for no techniques selected', async ({ page }) => {
    // Navigate to query builder
    await page.goto('/query-builder');
    
    // Enter query but don't select techniques
    await page.getByPlaceholder(/enter your query/i).fill('Test query');
    
    // Deselect all techniques if any are selected by default
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    
    // Try to submit
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Verify error message
    await expect(page.getByText(/select at least one technique/i)).toBeVisible();
  });
});

test.describe('Authenticated User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes test user credentials are set up
    await page.goto('/login');
  });

  test('should allow login and access to dashboard', async ({ page }) => {
    // Enter credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('test-password-123');
    
    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Verify successful login (redirected to dashboard or sessions)
    await expect(page).toHaveURL(/.*\/(sessions|dashboard|query-builder)/);
  });

  test('should show save session option for authenticated users', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('test-password-123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Navigate to query builder
    await page.goto('/query-builder');
    
    // Execute a query
    await page.getByPlaceholder(/enter your query/i).fill('Test query for saving');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Wait for results
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    // Verify save session button is available
    const saveButton = page.getByRole('button', { name: /save session/i });
    await expect(saveButton).toBeVisible();
  });
});

test.describe('Performance Benchmarks', () => {
  test('should load welcome page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // PRD requirement: ≤ 3s app launch
    expect(loadTime).toBeLessThan(3000);
  });

  test('should execute RAG query within 20 seconds', async ({ page }) => {
    // Navigate to query builder
    await page.goto('/query-builder');
    
    // Enter query and select technique
    await page.getByPlaceholder(/enter your query/i).fill('What is AI?');
    await page.getByLabel(/hybrid search/i).check();
    
    const startTime = Date.now();
    
    // Submit query
    await page.getByRole('button', { name: /submit query/i }).click();
    
    // Wait for results
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    const executionTime = Date.now() - startTime;
    
    // PRD requirement: ≤ 20s end-to-end query execution
    expect(executionTime).toBeLessThan(20000);
  });

  test('should complete first-time user comparison within 60 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    // Complete full flow
    await page.goto('/');
    await page.getByRole('button', { name: /start new comparison/i }).click();
    
    await page.getByPlaceholder(/enter your query/i).fill('Explain artificial intelligence');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    const totalTime = Date.now() - startTime;
    
    // PRD requirement: ≤ 60s for first-time user to complete comparison
    expect(totalTime).toBeLessThan(60000);
  });
});

