# End-to-End Visual Regression Testing

This directory contains Playwright-based visual regression tests for the Claude Code Viewer application.

## Overview

The VRT setup uses Playwright to capture screenshots of key pages and components, comparing them against baseline images to detect visual regressions. Tests run against mock data to ensure consistent results.

## Test Structure

### Test Files

- `projects-page.spec.ts` - Tests the main projects listing page
- `project-detail-page.spec.ts` - Tests individual project pages with session lists
- `session-detail-page.spec.ts` - Tests conversation view pages
- `modal-components.spec.ts` - Tests modal dialogs and overlays
- `error-states.spec.ts` - Tests error pages and loading states

### Mock Data

Tests use the `mock-global-claude-dir` directory which contains sample projects and conversation data. This ensures consistent test results by avoiding dependency on real user data.

## Running Tests

### Prerequisites

```bash
# Install dependencies including Playwright
pnpm install

# Install Playwright browsers (first time only)
npx playwright install

# Start the development server on localhost:4000
pnpm dev
```

### Test Commands

```bash
# Run all VRT tests (requires server running on localhost:4000)
pnpm test:e2e

# Run only the main working tests on Chrome
pnpm test:e2e:new

# Run tests with UI (interactive mode)
npx playwright test --ui

# Run tests with browser visible (headed mode)
npx playwright test --headed

# Update screenshot baselines
npx playwright test --update-snapshots

# Run only on Chrome (fastest for development)
pnpm test:e2e:chrome
```

### Environment Variables

Tests run against a server on `localhost:4000`. The server should be configured to use mock data from `mock-global-claude-dir` for consistent test results.

## Test Coverage

### Pages Tested

1. **Projects Page** (`/projects`)
   - Empty state
   - Projects list with data
   - Responsive layouts (mobile, tablet, desktop)

2. **Project Detail Page** (`/projects/:projectId`)
   - Session cards display
   - Filter panel (collapsed/expanded)
   - Navigation elements
   - Empty sessions state

3. **Session Detail Page** (`/projects/:projectId/sessions/:sessionId`)
   - Conversation messages
   - Sidebar (desktop) and mobile menu
   - Task states (running, paused)
   - Resume chat interface

4. **Modal Components**
   - New chat modal
   - Diff comparison modal
   - Sidechain conversation modal
   - Mobile responsiveness

5. **Error States**
   - 404 pages
   - Invalid project/session IDs
   - Network error handling
   - Loading states

### Responsive Testing

Tests include coverage for:
- Mobile (375x667) - iPhone SE
- Tablet (768x1024) - iPad
- Desktop (1920x1080) - Standard desktop

## Configuration

### Playwright Config

The `playwright.config.ts` file includes:
- Multi-browser testing (Chrome, Firefox, Safari, Mobile)
- Local dev server startup with mock data
- Screenshot comparison settings
- Retry and parallel execution settings

### Test Utilities

The `utils/test-utils.ts` file provides:
- `waitForAppLoad()` - Ensures full app hydration
- `takeFullPageScreenshot()` - Captures consistent full-page images
- `testViewport()` - Tests responsive layouts
- Animation disabling for consistent screenshots

## Screenshot Baseline Management

### Initial Setup

When running tests for the first time:

```bash
# Generate initial baselines
pnpm test:e2e:update
```

### Updating Baselines

After intentional UI changes:

```bash
# Update all screenshots
pnpm test:e2e:update

# Update specific test screenshots
npx playwright test projects-page.spec.ts --update-snapshots
```

### Reviewing Changes

Use Playwright's test results viewer:

```bash
# Open test results with visual diffs
npx playwright show-report
```


## CI/CD Integration

The tests are configured for CI environments:
- Retry failed tests up to 2 times
- Use single worker in CI for consistency
- Generate HTML reports for failure analysis
- Screenshots are automatically uploaded as artifacts

## Troubleshooting

### Common Issues

1. **Flaky screenshots due to animations**
   - Tests disable animations via CSS injection
   - Use `waitForTimeout()` for custom timing

2. **Inconsistent timestamps**
   - Timestamps are hidden via CSS in test utilities
   - Use `data-testid` attributes for reliable element selection

3. **Mock data changes**
   - Tests use fixed mock data in `mock-global-claude-dir`
   - Ensure mock data remains stable between test runs

4. **Browser differences**
   - Tests run on multiple browsers
   - Use Playwright's built-in element waiting
   - Avoid browser-specific CSS or JavaScript

### Debug Mode

For troubleshooting test failures:

```bash
# Run with browser visible and debug mode
npx playwright test --debug

# Run specific test in headed mode
npx playwright test projects-page.spec.ts --headed
```

## Best Practices

1. **Stable Selectors**: Use `data-testid` attributes for reliable element selection
2. **Wait Strategies**: Always wait for content to load before screenshots
3. **Animation Handling**: Disable animations for consistent visual comparisons
4. **Viewport Testing**: Test all responsive breakpoints
5. **Error Coverage**: Include error states and edge cases
6. **Mock Data**: Use consistent, fixed data for reproducible results

## Future Enhancements

- Add performance testing metrics
- Include accessibility testing
- Add cross-platform testing (Windows, Linux)
- Integrate with visual testing services
- Add automated baseline updates on approved changes