# End-to-End Testing Suite

Comprehensive E2E testing suite using Playwright for the RAG Technique Showcase application.

## Overview

This E2E testing suite provides complete coverage of:
- User journeys and workflows
- Cross-browser compatibility
- Responsive design
- Visual regression testing
- Performance benchmarking

## Test Structure

### Test Files

1. **`user-journey.spec.ts`**
   - Complete user flows (welcome → query → results)
   - Anonymous and authenticated user journeys
   - Performance benchmarks for user flows
   - PRD requirement validation

2. **`domain-technique-selection.spec.ts`**
   - Domain selection workflows
   - RAG technique configuration
   - Query input validation
   - Combined selection scenarios

3. **`results-comparison.spec.ts`**
   - Results visualization
   - Technique comparison features
   - Interactive UI elements
   - Error handling in results

4. **`responsive-design.spec.ts`**
   - Mobile responsiveness (iPhone, Android)
   - Tablet layout (iPad)
   - Desktop optimization
   - Viewport transitions
   - Orientation changes

5. **`visual-regression.spec.ts`**
   - UI consistency snapshots
   - Component visual testing
   - Dark mode verification
   - Accessibility visual checks
   - Loading/error state snapshots

6. **`performance.spec.ts`**
   - PRD performance requirements
   - Core Web Vitals (LCP, FID, CLS)
   - Resource loading metrics
   - API response times
   - Memory leak detection
   - Concurrent user simulation

## Running Tests

### Install Dependencies
```bash
cd web
npm install
```

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test e2e/user-journey.spec.ts
```

### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Generate Test Report
```bash
npx playwright show-report
```

## Browser Configuration

Tests run across multiple browsers and devices:

### Desktop Browsers
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

### Mobile Devices
- iPhone 12
- Pixel 5
- iPad Pro

## Visual Regression Testing

Visual regression tests create screenshots and compare them to baselines:

### Update Baseline Screenshots
```bash
npx playwright test --update-snapshots
```

### Run Only Visual Tests
```bash
npx playwright test e2e/visual-regression.spec.ts
```

## Performance Testing

Performance tests validate PRD requirements:

### PRD Performance Targets
- ≤3s app launch time
- ≤20s end-to-end query execution
- ≤60s first-time user completion
- ≤300ms screen transitions

### Run Performance Tests
```bash
npx playwright test e2e/performance.spec.ts
```

### View Performance Metrics
Performance metrics are logged to console during test execution.

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: web/playwright-report/
```

## Test Data

### Test Users
Test scenarios use predefined test users:
- Email: `test@example.com`
- Password: `test-password-123`

### Test Domains
Tests interact with preloaded test domains and can upload test documents.

## Debugging

### Common Issues

**1. Tests failing due to timing**
```bash
# Increase timeout
npx playwright test --timeout=60000
```

**2. Visual regression failures**
```bash
# Update snapshots after intentional UI changes
npx playwright test --update-snapshots
```

**3. Flaky tests**
```bash
# Run tests with retries
npx playwright test --retries=3
```

### Debug Tools

**Playwright Inspector**
```bash
npx playwright test --debug
```

**Trace Viewer**
```bash
npx playwright show-trace trace.zip
```

**Video Recording**
Videos are automatically recorded on failure and saved to `test-results/`

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on others
2. **Data Cleanup**: Tests clean up their own data in `afterEach` hooks
3. **Timeouts**: Use appropriate timeouts for async operations (30s for RAG queries)
4. **Selectors**: Prefer `data-testid` attributes for stable selectors
5. **Assertions**: Use Playwright's built-in assertions with auto-retry
6. **Screenshots**: Take screenshots on failure for debugging

## Coverage

### User Flows
- ✅ Anonymous user journey
- ✅ Authenticated user journey
- ✅ Query configuration and execution
- ✅ Results visualization and comparison
- ✅ Session management

### Technical Coverage
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Visual regression detection
- ✅ Performance benchmarking
- ✅ Error handling
- ✅ Loading states
- ✅ Accessibility features

## Contributing

### Adding New Tests

1. Create new spec file in `e2e/` directory
2. Follow existing test structure and naming conventions
3. Add appropriate `data-testid` attributes to components
4. Include both positive and negative test cases
5. Update this README with new test coverage

### Test Naming Conventions
- Use descriptive test names: `should [expected behavior]`
- Group related tests in `describe` blocks
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test Best Practices](https://playwright.dev/docs/best-practices)
- [Visual Regression Testing Guide](https://playwright.dev/docs/test-snapshots)
- [PRD Document](../RagShowcasePRD.md)

