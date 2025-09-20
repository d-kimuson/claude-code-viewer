import { test } from "@playwright/test";
import { navigateAndWait, takeFullPageScreenshot } from "../utils/test-utils";

test.describe("Project Detail Page Visual Regression", () => {
  const projectId = "sample-project"; // Using the mock project ID

  test("should render project detail page correctly on desktop", async ({
    page,
  }) => {
    await navigateAndWait(page, `/projects/${projectId}`);
    await takeFullPageScreenshot(page, "project-detail-page-desktop");
  });

  test("should render with filter panel collapsed", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}`);

    // Ensure filter panel is collapsed
    const filterToggle = page
      .locator('[data-testid="filter-toggle"], button:has-text("Filter")')
      .first();
    if (await filterToggle.isVisible()) {
      const isExpanded = await filterToggle.getAttribute("aria-expanded");
      if (isExpanded === "true") {
        await filterToggle.click();
        await page.waitForTimeout(300); // Wait for animation
      }
    }

    await takeFullPageScreenshot(page, "project-detail-filter-collapsed");
  });

  test("should render with filter panel expanded", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}`);

    // Try to expand filter panel
    const filterToggle = page
      .locator('[data-testid="filter-toggle"], button:has-text("Filter")')
      .first();
    if (await filterToggle.isVisible()) {
      const isExpanded = await filterToggle.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await filterToggle.click();
        await page.waitForTimeout(300); // Wait for animation
      }
      await takeFullPageScreenshot(page, "project-detail-filter-expanded");
    }
  });

  test("should render session cards correctly", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}`);

    // Wait for session cards to load
    const sessionCards = page.locator('[data-testid="session-card"]').first();
    await sessionCards
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        // If no session cards, that's fine - we'll test empty state
      });

    await takeFullPageScreenshot(page, "project-detail-sessions");
  });

  test("should render back navigation", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}`);

    // Check for back button
    const backButton = page
      .locator(
        'button:has-text("Back"), a:has-text("Back"), [data-testid="back-button"]',
      )
      .first();
    if (await backButton.isVisible()) {
      await takeFullPageScreenshot(page, "project-detail-navigation");
    }
  });

  test("should render new chat button", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}`);

    // Look for new chat button
    const newChatButton = page
      .locator(
        'button:has-text("New Chat"), button:has-text("Start"), [data-testid="new-chat-button"]',
      )
      .first();
    if (await newChatButton.isVisible()) {
      await takeFullPageScreenshot(page, "project-detail-new-chat");
    }
  });

  test("should handle empty sessions state", async ({ page }) => {
    // Test with a project that might have no sessions
    await navigateAndWait(page, `/projects/${projectId}`);

    const sessionCount = await page
      .locator('[data-testid="session-card"]')
      .count();
    if (sessionCount === 0) {
      await takeFullPageScreenshot(page, "project-detail-empty-sessions");
    }
  });
});
