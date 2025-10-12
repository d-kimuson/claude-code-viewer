import { resolve } from "node:path";
import { testDevices } from "../testDevices";
import { withPlaywright } from "../utils/withPlaywright";

// Test different UI states on project detail page
const testStates = [
  { name: "default", action: null },
  {
    name: "filters-expanded",
    action: async (page) => {
      const filterToggle = page.locator(
        '[data-testid="filter-toggle"], button:has-text("Filters"), .filter-toggle',
      );
      if (await filterToggle.isVisible()) {
        await filterToggle.click();
        await page.waitForTimeout(300);
      }
    },
  },
  {
    name: "new-chat-modal",
    action: async (page) => {
      const newChatButton = page.locator(
        'button:has-text("New Chat"), [data-testid="new-chat"], .new-chat-button',
      );
      if (await newChatButton.isVisible()) {
        await newChatButton.click();
        await page.waitForTimeout(300);
      }
    },
  },
];

for (const state of testStates) {
  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();
        await page.goto("http://localhost:4000/projects/sample-project");
        await page.waitForLoadState("networkidle");

        if (state.action) {
          await state.action(page);
        }

        await page.screenshot({
          path: resolve(
            "e2e",
            "snapshots",
            "project-detail",
            state.name,
            `${name}.png`,
          ),
          fullPage: true,
        });
        await cleanUp();
      },
      {
        contextOptions: {
          ...device,
        },
      },
    );
  }
}
