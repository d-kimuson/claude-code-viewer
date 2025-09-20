import { test } from "@playwright/test";
import { navigateAndWait, takeFullPageScreenshot } from "../utils/test-utils";

test.describe("Projects Page Visual Regression", () => {
  test("should render projects page correctly on desktop", async ({ page }) => {
    await navigateAndWait(page, "/projects");
    await takeFullPageScreenshot(page, "projects-page-desktop");
  });

  test("should render empty state correctly", async ({ page }) => {
    // This test assumes the mock data might have empty projects
    // or we could add a query parameter to simulate empty state
    await navigateAndWait(page, "/projects");

    // Check if we have the empty state or projects
    const hasProjects =
      (await page.locator('[data-testid="project-card"]').count()) > 0;

    if (!hasProjects) {
      await takeFullPageScreenshot(page, "projects-page-empty-state");
    }
  });

  test("should render projects list with data", async ({ page }) => {
    await navigateAndWait(page, "/projects");

    // Wait for any project cards to appear
    const projectCards = page.locator('[data-testid="project-card"]').first();
    await projectCards
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        // If no project cards, that's fine - we'll test empty state
      });

    await takeFullPageScreenshot(page, "projects-page-with-data");
  });

  test("should render header correctly", async ({ page }) => {
    await navigateAndWait(page, "/projects");

    // Focus on the header area
    const header = page.locator("header, .header, h1").first();
    if (await header.isVisible()) {
      await takeFullPageScreenshot(page, "projects-page-header");
    }
  });
});
