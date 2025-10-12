import { defineCapture } from "../utils/defineCapture";

export const projectDetailCapture = defineCapture({
  href: "projects/L2hvbWUva2FpdG8vcmVwb3MvY2xhdWRlLWNvZGUtdmlld2VyL2Rpc3Qvc3RhbmRhbG9uZS9tb2NrLWdsb2JhbC1jbGF1ZGUtZGlyL3Byb2plY3RzL3NhbXBsZS1wcm9qZWN0",
  cases: [
    {
      name: "filters-expanded",
      setup: async (page) => {
        const filterToggle = page.locator(
          '[data-testid="expand-filter-settings-button"]',
        );
        if (await filterToggle.isVisible()) {
          await filterToggle.click();
          await page.waitForTimeout(300);
        } else {
          throw new Error("Filter settings button not found");
        }
      },
    },
    {
      name: "new-chat-modal",
      setup: async (page) => {
        const newChatButton = page.locator('[data-testid="new-chat"]');
        if (await newChatButton.isVisible()) {
          await newChatButton.click();
          await page.waitForTimeout(300);
        }
      },
    },
  ],
});
