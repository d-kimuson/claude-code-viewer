import { projectIds } from "../config";
import { defineCapture } from "../utils/defineCapture";

export const sessionDetailCapture = defineCapture({
  href: `projects/${projectIds.sampleProject}/session?sessionId=fe5e1c67-53e7-4862-81ae-d0e013e3270b`,
  cases: [
    {
      name: "sidebar-closed",
      setup: async (page) => {
        const menuButton = page.locator(
          '[data-testid="mobile-sidebar-toggle-button"]',
        );
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForSelector(
            '[data-testid="sessions-tab-button-mobile"]',
            { state: "visible", timeout: 1000 },
          );

          const sessionsTabButton = page.locator(
            '[data-testid="sessions-tab-button-mobile"]',
          );
          if (await sessionsTabButton.isVisible()) {
            await sessionsTabButton.click();
            await page.waitForTimeout(1000);
          }
        } else {
          const sessionsTabButton = page.locator(
            '[data-testid="sessions-tab-button"]',
          );
          if (await sessionsTabButton.isVisible()) {
            await sessionsTabButton.click();
            await page.waitForTimeout(1000);
          }
        }
      },
    },

    {
      name: "settings-tab",
      setup: async (page) => {
        const menuButton = page.locator(
          '[data-testid="mobile-sidebar-toggle-button"]',
        );
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForSelector(
            '[data-testid="settings-tab-button-mobile"]',
          );

          const settingsTabButton = page.locator(
            '[data-testid="settings-tab-button-mobile"]',
          );
          if (await settingsTabButton.isVisible()) {
            await settingsTabButton.click();
            await page.waitForTimeout(2000);
          }
        } else {
          const settingsTabButton = page.locator(
            '[data-testid="settings-tab-button"]',
          );
          if (await settingsTabButton.isVisible()) {
            await settingsTabButton.click();
            await page.waitForTimeout(2000);
          }
        }
      },
    },

    {
      name: "start-new-chat",
      setup: async (page) => {
        const menuButton = page.locator(
          '[data-testid="mobile-sidebar-toggle-button"]',
        );
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForSelector(
            '[data-testid="start-new-chat-button-mobile"]',
          );

          const startNewChatButton = page.locator(
            '[data-testid="start-new-chat-button-mobile"]',
          );
          await startNewChatButton.click();
          await page.waitForTimeout(2000);
        } else {
          const startNewChatButton = page.locator(
            '[data-testid="start-new-chat-button"]',
          );
          await startNewChatButton.click();
          await page.waitForTimeout(2000);
        }
      },
    },

    {
      name: "sidechain-task-modal",
      setup: async (page) => {
        const sidechainTaskButton = page
          .locator('[data-testid="sidechain-task-button"]')
          .first();
        if (await sidechainTaskButton.isVisible()) {
          await sidechainTaskButton.click();
          await page.waitForSelector('[data-testid="sidechain-task-modal"]');

          // モーダルが開いたことを確認
          const modal = page.locator('[data-testid="sidechain-task-modal"]');
          await modal.waitFor({ state: "visible", timeout: 3000 });
        }
      },
    },
  ],
});
