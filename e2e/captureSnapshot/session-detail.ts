import type { Page } from "playwright";
import { projectIds } from "../config";
import { defineCapture } from "../utils/defineCapture";

const ensureLeftPanelOpen = async (page: Page) => {
  const sessionsHeading = page.getByRole("heading", {
    name: /Sessions|sessions|セッション/,
  });
  if (await sessionsHeading.isVisible()) {
    return;
  }

  const toggleLeftPanelButton = page.getByRole("button", {
    name: "Toggle left panel",
  });
  if (await toggleLeftPanelButton.isVisible()) {
    await toggleLeftPanelButton.click();
    await page.waitForTimeout(1000);
  }
};

const ensureRightPanelOpen = async (page: Page) => {
  const rightPanelTab = page.locator('[data-testid="right-panel-tab-git"]');
  if (await rightPanelTab.isVisible()) {
    return;
  }

  const toggleRightPanelButton = page.getByRole("button", {
    name: "Toggle right panel",
  });
  await toggleRightPanelButton.click();
  await page.waitForSelector('[data-testid="right-panel-tab-git"]', {
    state: "visible",
    timeout: 2000,
  });
};

export const sessionDetailCapture = defineCapture({
  href: `projects/${projectIds.sampleProject}/session?sessionId=fe5e1c67-53e7-4862-81ae-d0e013e3270b`,
  cases: [
    {
      name: "sidebar-closed",
      setup: async () => {
        // Default layout is closed; no action required.
      },
    },

    {
      name: "session-tab-opened",
      setup: async (page) => {
        await ensureLeftPanelOpen(page);
        const sessionsTabButtonMobile = page.locator(
          '[data-testid="sessions-tab-button-mobile"]',
        );
        if (await sessionsTabButtonMobile.isVisible()) {
          await sessionsTabButtonMobile.click();
          await page.waitForTimeout(1000);
        }
      },
    },

    {
      name: "settings-tab",
      setup: async (page) => {
        const settingsHeading = page.getByRole("heading", {
          name: /Settings|設定/,
        });
        if (await settingsHeading.isVisible()) {
          return;
        }

        await ensureLeftPanelOpen(page);
        const settingsTabButtonMobile = page.locator(
          '[data-testid="settings-tab-button-mobile"]',
        );
        if (await settingsTabButtonMobile.isVisible()) {
          await settingsTabButtonMobile.click();
          await page.waitForTimeout(2000);
          return;
        }

        const settingsTabButton = page.locator(
          '[data-testid="settings-tab-button"]',
        );
        if (await settingsTabButton.isVisible()) {
          await settingsTabButton.click();
          await page.waitForTimeout(2000);
        }
      },
    },

    {
      name: "start-new-chat",
      setup: async (page) => {
        const startNewChatButton = page.locator(
          '[data-testid="start-new-chat-button"]',
        );
        if (await startNewChatButton.isVisible()) {
          await startNewChatButton.click();
          await page.waitForTimeout(2000);
          return;
        }

        await ensureLeftPanelOpen(page);

        const startNewChatLink = page.getByRole("link", {
          name: /Start New Chat|新しいチャット/,
        });
        if (await startNewChatLink.isVisible()) {
          await startNewChatLink.click();
          await page.waitForTimeout(2000);
        }
      },
    },

    {
      name: "sidechain-task-modal",
      setup: async (page) => {
        const sidechainTaskButton = page
          .locator('[data-testid="task-modal-button"]')
          .first();
        if (await sidechainTaskButton.isVisible()) {
          await sidechainTaskButton.click();
          await page.waitForSelector('[data-testid="task-modal"]');

          // モーダルが開いたことを確認
          const modal = page.locator('[data-testid="task-modal"]');
          await modal.waitFor({ state: "visible", timeout: 3000 });
        }
      },
    },

    {
      name: "right-panel-git-tab-opened",
      setup: async (page) => {
        await ensureRightPanelOpen(page);
        const gitTabButton = page.locator(
          '[data-testid="right-panel-tab-git"]',
        );
        if (await gitTabButton.isVisible()) {
          await gitTabButton.click();
          await page.waitForTimeout(1000);
        }
      },
    },

    {
      name: "right-panel-file-diffs-opened",
      setup: async (page) => {
        await ensureRightPanelOpen(page);
        const gitTabButton = page.locator(
          '[data-testid="right-panel-tab-git"]',
        );
        if (await gitTabButton.isVisible()) {
          await gitTabButton.click();
          await page.waitForTimeout(1000);
        }

        const gitFileButton = page
          .locator('[data-testid="git-file-button"]')
          .first();
        if (await gitFileButton.isVisible()) {
          await gitFileButton.click();
          await page.waitForSelector('[data-testid="git-file-dialog"]', {
            state: "visible",
            timeout: 3000,
          });
        }
      },
    },

    {
      name: "right-panel-review-opened",
      setup: async (page) => {
        await ensureRightPanelOpen(page);
        const reviewTabButton = page.locator(
          '[data-testid="right-panel-tab-review"]',
        );
        if (await reviewTabButton.isVisible()) {
          await reviewTabButton.click();
          await page.waitForTimeout(1000);
        }
      },
    },

    {
      name: "right-panel-browser-opened",
      setup: async (page) => {
        await ensureRightPanelOpen(page);
        const browserTabButton = page.locator(
          '[data-testid="right-panel-tab-browser"]',
        );
        if (await browserTabButton.isVisible()) {
          await browserTabButton.click();
          await page.waitForTimeout(1000);
        }
      },
    },
  ],
});
