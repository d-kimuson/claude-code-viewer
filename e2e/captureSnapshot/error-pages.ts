import { resolve } from "node:path";
import { withPlaywright } from "../utils/withPlaywright";
import { testDevices } from "../testDevices";

// Different error scenarios to capture
const errorScenarios = [
  {
    name: "404",
    url: "http://localhost:3400/non-existent-page"
  },
  {
    name: "invalid-project",
    url: "http://localhost:3400/projects/non-existent-project"
  },
  {
    name: "invalid-session",
    url: "http://localhost:3400/projects/sample-project/sessions/non-existent-session"
  }
];

for (const scenario of errorScenarios) {
  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();
        await page.goto(scenario.url);
        await page.screenshot({
          path: resolve("e2e", "snapshots", "errors", `${scenario.name}_${name}.png`),
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