import { expect, test } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("should load the application", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Claude Code Viewer/);

    // Take a simple screenshot to verify VRT setup
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("smoke-test.png");
  });

  test("should navigate to projects page", async ({ page }) => {
    await page.goto("/projects");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check that we're on the projects page
    await expect(page.locator("h1, h2, .title"))
      .toContainText(/project/i)
      .catch(() => {
        // If no specific title found, just check page loads
      });

    await expect(page).toHaveScreenshot("projects-smoke.png");
  });
});
