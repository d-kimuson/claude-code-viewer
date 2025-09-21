import { resolve } from "node:path";
import { withPlaywright } from "../utils/withPlaywright";
import { testDevices } from "../testDevices";

// Test different states on projects page
const testStates = [
  { name: 'default', action: null },
  { name: 'empty', action: async (page) => {
    // Check for empty state (this will capture whatever state exists)
    await page.waitForTimeout(500);
  }}
];

for (const state of testStates) {
  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();
        await page.goto("http://localhost:3400/projects");
        await page.waitForLoadState('networkidle');
        
        if (state.action) {
          await state.action(page);
        }
        
        await page.screenshot({
          path: resolve("e2e", "snapshots", "projects", state.name, `${name}.png`),
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