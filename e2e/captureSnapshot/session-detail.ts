import { defineCapture } from "../utils/defineCapture";

export const sessionDetailCapture = defineCapture({
  href: "projects/L2hvbWUva2FpdG8vcmVwb3MvY2xhdWRlLWNvZGUtdmlld2VyL2Rpc3Qvc3RhbmRhbG9uZS9tb2NrLWdsb2JhbC1jbGF1ZGUtZGlyL3Byb2plY3RzL3NhbXBsZS1wcm9qZWN0/sessions/fe5e1c67-53e7-4862-81ae-d0e013e3270b",
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
      name: "mcp-servers-tab",
      setup: async (page) => {
        const menuButton = page.locator(
          '[data-testid="mobile-sidebar-toggle-button"]',
        );
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(300);

          const mcpTabButton = page.locator(
            '[data-testid="mcp-tab-button-mobile"]',
          );
          if (await mcpTabButton.isVisible()) {
            await mcpTabButton.click();
            await page.waitForTimeout(300);
          }
        } else {
          const mcpTabButton = page.locator('[data-testid="mcp-tab-button"]');
          if (await mcpTabButton.isVisible()) {
            await mcpTabButton.click();
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
