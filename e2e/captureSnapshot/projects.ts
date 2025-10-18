import { defineCapture } from "../utils/defineCapture";

export const projectsCapture = defineCapture({
  href: "/projects",
  cases: [
    {
      name: "new-project-modal",
      setup: async (page) => {
        const newProjectButton = page.locator(
          '[data-testid="new-project-button"]',
        );
        await newProjectButton.click();
        await page.waitForTimeout(1000);
      },
    },
  ],
});
