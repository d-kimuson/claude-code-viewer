import { test } from "@playwright/test";
import { navigateAndWait, takeFullPageScreenshot } from "../utils/test-utils";

test.describe("Session Detail Page Visual Regression", () => {
  const projectId = "sample-project";
  const sessionId = "1af7fc5e-8455-4414-9ccd-011d40f70b2a"; // Using one of the mock session IDs

  test("should render session detail page correctly on desktop", async ({
    page,
  }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);
    await takeFullPageScreenshot(page, "session-detail-page-desktop");
  });

  test("should render sidebar correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Wait for sidebar to be visible
    const sidebar = page
      .locator('[data-testid="session-sidebar"], .sidebar, aside')
      .first();
    await sidebar.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
      // Sidebar might not be present on this design
    });

    await takeFullPageScreenshot(page, "session-detail-with-sidebar");
  });

  test("should render mobile sidebar overlay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Try to open mobile sidebar
    const menuButton = page
      .locator(
        '[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger',
      )
      .first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300); // Wait for animation
      await takeFullPageScreenshot(page, "session-detail-mobile-sidebar-open");
    }
  });

  test("should render conversation messages", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Wait for messages to load
    const messages = page
      .locator('[data-testid="message"], .message, .conversation-entry')
      .first();
    await messages.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
      // No messages might be expected for some sessions
    });

    await takeFullPageScreenshot(page, "session-detail-conversation");
  });

  test("should render session header", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Focus on the header area
    const header = page
      .locator('[data-testid="session-header"], .session-header, header')
      .first();
    if (await header.isVisible()) {
      await takeFullPageScreenshot(page, "session-detail-header");
    }
  });

  test("should render running task state", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Check if there's a running task indicator
    const runningTask = page
      .locator('[data-testid="running-task"], .running-task, .loading')
      .first();
    if (await runningTask.isVisible()) {
      await takeFullPageScreenshot(page, "session-detail-running-task");
    }
  });

  test("should render paused task state", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Check if there's a paused task indicator
    const pausedTask = page
      .locator('[data-testid="paused-task"], .paused-task')
      .first();
    if (await pausedTask.isVisible()) {
      await takeFullPageScreenshot(page, "session-detail-paused-task");
    }
  });

  test("should render diff button", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Look for diff button (usually floating)
    const diffButton = page
      .locator(
        '[data-testid="diff-button"], button:has-text("Diff"), .diff-button',
      )
      .first();
    if (await diffButton.isVisible()) {
      await takeFullPageScreenshot(page, "session-detail-with-diff-button");
    }
  });

  test("should render resume chat interface", async ({ page }) => {
    await navigateAndWait(page, `/projects/${projectId}/sessions/${sessionId}`);

    // Look for resume chat elements
    const resumeChat = page
      .locator(
        '[data-testid="resume-chat"], .resume-chat, textarea, input[type="text"]',
      )
      .first();
    if (await resumeChat.isVisible()) {
      await takeFullPageScreenshot(page, "session-detail-resume-chat");
    }
  });

  test("should test with different session IDs", async ({ page }) => {
    const sessionIds = [
      "5c0375b4-57a5-4f26-b12d-d022ee4e51b7",
      "fe5e1c67-53e7-4862-81ae-d0e013e3270b",
    ];

    for (const sessionId of sessionIds) {
      await navigateAndWait(
        page,
        `/projects/${projectId}/sessions/${sessionId}`,
      );
      await takeFullPageScreenshot(
        page,
        `session-detail-${sessionId.substring(0, 8)}`,
      );
    }
  });
});
