import { resolve } from "node:path";
import { withPlaywright } from "../utils/withPlaywright";
import { testDevices } from "../testDevices";

// Multiple session IDs to capture different session detail pages  
const sessionIds = [
  "1af7fc5e-8455-4414-9ccd-011d40f70b2a",
  "5c0375b4-57a5-4f26-b12d-d022ee4e51b7", 
  "fe5e1c67-53e7-4862-81ae-d0e013e3270b"
];

// Test different sidebar states 
const testStates = [
  { name: 'default', action: null },
  { name: 'sidebar-open', action: async (page) => {
    const menuButton = page.locator('[data-testid="menu-button"], button:has-text("Menu"), .menu-toggle, .hamburger');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }
  }}
];

for (const sessionId of sessionIds) {
  for (const state of testStates) {
    for (const { device, name } of testDevices) {
      await withPlaywright(
        async ({ context, cleanUp }) => {
          const page = await context.newPage();
          await page.goto(`http://localhost:3400/projects/sample-project/sessions/${sessionId}`);
          await page.waitForLoadState('networkidle');
          
          if (state.action) {
            await state.action(page);
          }
          
          // Create separate directories for each session
          await page.screenshot({
            path: resolve("e2e", "snapshots", "session-detail", state.name, `${sessionId}_${name}.png`),
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
}