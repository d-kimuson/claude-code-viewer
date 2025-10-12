import { projectIds } from "../config";
import { defineCapture } from "../utils/defineCapture";

export const sessionDetailCapture = defineCapture({
  href: `projects/${projectIds.sampleProject}/sessions/fe5e1c67-53e7-4862-81ae-d0e013e3270b`,
  cases: [
    {
      name: "sidebar-closed",
      setup: async (page) => {
        const menuButton = page.locator(
          '[data-testid="mobile-sidebar-toggle-button"]',
        );
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(300);

          const sessionsTabButton = page.locator(
            '[data-testid="sessions-tab-button-mobile"]',
          );
          if (await sessionsTabButton.isVisible()) {
            await sessionsTabButton.click();
            await page.waitForTimeout(300);
          }
        } else {
          const sessionsTabButton = page.locator(
            '[data-testid="sessions-tab-button"]',
          );
          if (await sessionsTabButton.isVisible()) {
            await sessionsTabButton.click();
            await page.waitForTimeout(300);
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
          await page.waitForTimeout(300);

          const settingsTabButton = page.locator(
            '[data-testid="settings-tab-button-mobile"]',
          );
          if (await settingsTabButton.isVisible()) {
            await settingsTabButton.click();
            await page.waitForTimeout(300);
          }
        } else {
          const settingsTabButton = page.locator(
            '[data-testid="settings-tab-button"]',
          );
          if (await settingsTabButton.isVisible()) {
            await settingsTabButton.click();
            await page.waitForTimeout(300);
          }
        }
      },
    },
  ],
});
