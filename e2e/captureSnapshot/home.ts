import { resolve } from "node:path";
import { withPlaywright } from "../utils/withPlaywright";
import { testDevices } from "../testDevices";

for (const { device, name } of testDevices) {
  await withPlaywright(
    async ({ context, cleanUp }) => {
      const page = await context.newPage();
      await page.goto("http://localhost:3400/");
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: resolve("e2e", "snapshots", "root", `${name}.png`),
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