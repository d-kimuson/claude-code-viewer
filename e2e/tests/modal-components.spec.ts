import { resolve } from "node:path";
import { withPlaywright } from "../utils/withPlaywright.js";
import { testDevices } from "../testDevices.js";

const BASE_URL = "http://localhost:3400";
const projectId = "sample-project";
const sessionId = "1af7fc5e-8455-4414-9ccd-011d40f70b2a";

async function main() {
  // Modal components screenshots - requires interaction
  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();
        
        try {
          // Test new chat modal
          await page.goto(`${BASE_URL}/projects/${projectId}`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          
          // Try to click new chat button
          const newChatButton = page.locator('button:has-text("New Chat"), button:has-text("Start"), [data-testid="new-chat-button"]').first();
          if (await newChatButton.isVisible()) {
            await newChatButton.click();
            await page.waitForTimeout(500);
            
            await page.screenshot({
              path: resolve("e2e", "snapshots", "new-chat-modal", `${name}.png`),
              fullPage: true,
            });
          }
          
        } finally {
          await cleanUp();
        }
      },
      {
        contextOptions: {
          ...device,
        },
      }
    );
  }

  console.log("✅ Modal components screenshots completed");
}

main().catch(console.error);