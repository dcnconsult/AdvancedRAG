/**
 * @fileoverview Performance Benchmarking Tests
 * 
 * Comprehensive performance testing against PRD requirements.
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks - PRD Requirements', () => {
  test('should meet app launch performance target (≤3s)', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        timeToInteractive: perfData.domInteractive - perfData.fetchStart,
      };
    });

    // PRD requirement: ≤3s app launch
    console.log('App Launch Metrics:', metrics);
    expect(metrics.loadComplete).toBeLessThan(3000);
  });

  test('should meet query execution performance target (≤20s)', async ({ page }) => {
    await page.goto('/query-builder');
    
    await page.getByPlaceholder(/enter your query/i).fill('Performance test query');
    await page.getByLabel(/hybrid search/i).check();
    
    const startTime = Date.now();
    
    await page.getByRole('button', { name: /submit query/i }).click();
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 25000 });
    
    const executionTime = Date.now() - startTime;
    
    // PRD requirement: ≤20s end-to-end query execution
    console.log('Query Execution Time:', executionTime, 'ms');
    expect(executionTime).toBeLessThan(20000);
  });

  test('should meet first-time user completion target (≤60s)', async ({ page }) => {
    const startTime = Date.now();
    
    // Complete full user journey
    await page.goto('/');
    await page.getByRole('button', { name: /start new comparison/i }).click();
    
    await page.getByPlaceholder(/enter your query/i).fill('What is artificial intelligence?');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    
    const totalTime = Date.now() - startTime;
    
    // PRD requirement: ≤60s for first-time user to complete comparison
    console.log('First-Time User Completion:', totalTime, 'ms');
    expect(totalTime).toBeLessThan(60000);
  });

  test('should meet screen transition performance (≤300ms)', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await page.getByRole('button', { name: /start new comparison/i }).click();
    await page.waitForURL(/.*query-builder/);
    const transitionTime = Date.now() - startTime;
    
    // Good UX practice: screen transitions should be under 300ms
    console.log('Screen Transition Time:', transitionTime, 'ms');
    expect(transitionTime).toBeLessThan(300);
  });
});

test.describe('Resource Loading Performance', () => {
  test('should load page with minimal resource size', async ({ page }) => {
    await page.goto('/');
    
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const totalSize = resources.reduce((sum, resource) => {
        return sum + (resource.transferSize || 0);
      }, 0);
      
      return {
        totalResources: resources.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      };
    });
    
    console.log('Resource Loading Metrics:', metrics);
    
    // Total page size should be reasonable (< 5MB)
    expect(metrics.totalSize).toBeLessThan(5 * 1024 * 1024);
  });

  test('should load critical resources quickly', async ({ page }) => {
    await page.goto('/');
    
    const criticalResourceTiming = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const criticalResources = resources.filter(r => 
        r.name.includes('.js') || r.name.includes('.css')
      );
      
      return criticalResources.map(r => ({
        name: r.name.split('/').pop(),
        duration: r.duration,
        size: r.transferSize,
      }));
    });
    
    console.log('Critical Resource Timing:', criticalResourceTiming);
    
    // Each critical resource should load in under 1 second
    criticalResourceTiming.forEach(resource => {
      expect(resource.duration).toBeLessThan(1000);
    });
  });
});

test.describe('Core Web Vitals', () => {
  test('should meet Largest Contentful Paint (LCP) target', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    console.log('Largest Contentful Paint (LCP):', lcp, 'ms');
    
    // Good LCP is under 2.5 seconds
    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('should meet First Input Delay (FID) target', async ({ page }) => {
    await page.goto('/');
    
    // Simulate user interaction
    const startTime = Date.now();
    await page.getByRole('button', { name: /start new comparison/i }).click();
    const inputDelay = Date.now() - startTime;
    
    console.log('First Input Delay (FID):', inputDelay, 'ms');
    
    // Good FID is under 100ms
    expect(inputDelay).toBeLessThan(100);
  });

  test('should meet Cumulative Layout Shift (CLS) target', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    console.log('Cumulative Layout Shift (CLS):', cls);
    
    // Good CLS is under 0.1
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('API Performance', () => {
  test('should measure RAG query API response time', async ({ page }) => {
    let apiResponseTime = 0;
    
    // Listen for API requests
    page.on('response', async (response) => {
      if (response.url().includes('rag-orchestrator')) {
        const timing = response.timing();
        apiResponseTime = timing.responseEnd;
        console.log('RAG API Response Time:', apiResponseTime, 'ms');
      }
    });
    
    await page.goto('/query-builder');
    await page.getByPlaceholder(/enter your query/i).fill('API performance test');
    await page.getByLabel(/hybrid search/i).check();
    await page.getByRole('button', { name: /submit query/i }).click();
    
    await page.waitForSelector('[data-testid="technique-card"]', { timeout: 25000 });
    
    // API should respond within the 20s PRD requirement
    if (apiResponseTime > 0) {
      expect(apiResponseTime).toBeLessThan(20000);
    }
  });
});

test.describe('Memory and CPU Usage', () => {
  test('should not cause memory leaks during navigation', async ({ page }) => {
    await page.goto('/');
    
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    // Navigate through the app multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/query-builder');
      await page.goto('/');
    }
    
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (initialMetrics && finalMetrics) {
      console.log('Initial Memory:', initialMetrics);
      console.log('Final Memory:', finalMetrics);
      
      // Memory shouldn't grow more than 2x
      const memoryGrowth = finalMetrics.usedJSHeapSize / initialMetrics.usedJSHeapSize;
      expect(memoryGrowth).toBeLessThan(2);
    }
  });
});

test.describe('Concurrent User Simulation', () => {
  test('should handle multiple simultaneous queries', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    const startTime = Date.now();
    
    // Execute queries simultaneously
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('/query-builder');
      await page.getByPlaceholder(/enter your query/i).fill(`Concurrent query ${index + 1}`);
      await page.getByLabel(/hybrid search/i).check();
      await page.getByRole('button', { name: /submit query/i }).click();
      await page.waitForSelector('[data-testid="technique-card"]', { timeout: 30000 });
    }));
    
    const totalTime = Date.now() - startTime;
    
    console.log('Concurrent Query Execution Time:', totalTime, 'ms');
    
    // Should complete all queries within reasonable time
    expect(totalTime).toBeLessThan(30000);
    
    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

