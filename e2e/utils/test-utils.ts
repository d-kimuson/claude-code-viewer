import { expect, type Page } from "@playwright/test";

/**
 * Utility functions for e2e tests
 */

/**
 * Wait for the application to fully load
 */
export async function waitForAppLoad(page: Page) {
  // Wait for React to hydrate and any initial data loading
  await page.waitForLoadState("networkidle");
  // Additional wait to ensure all components are rendered
  await page.waitForTimeout(1000);
}

/**
 * Take a full page screenshot for VRT
 */
export async function takeFullPageScreenshot(page: Page, name: string) {
  // Wait for animations to complete
  await page.waitForTimeout(300);

  // Hide elements that might cause flaky tests
  await page.addStyleTag({
    content: `
      /* Hide elements with potential timing issues */
      [data-testid="timestamp"],
      .timestamp,
      time {
        visibility: hidden !important;
      }
      
      /* Disable animations for consistent screenshots */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // Take full page screenshot
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: "disabled",
  });
}

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateAndWait(page: Page, path: string) {
  await page.goto(path);
  await waitForAppLoad(page);
}
