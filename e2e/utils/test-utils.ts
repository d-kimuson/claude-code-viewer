import { expect, type Page } from "@playwright/test";

/**
 * Take a full page screenshot for VRT
 */
export const takeFullPageScreenshot = async (page: Page, name: string) => {
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
};
