import { resolve } from "node:path";
import { testDevices } from "../testDevices";
import { withPlaywright } from "./withPlaywright";

/**
 * Take screenshots for a given URL across all test devices
 */
export async function takeScreenshots(
  url: string,
  snapshotName: string,
  options?: {
    waitForSelector?: string;
    timeout?: number;
  },
) {
  const { waitForSelector, timeout = 5000 } = options || {};

  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();

        try {
          await page.goto(url);

          // Wait for the page to load
          await page.waitForLoadState("networkidle");

          // Wait for specific selector if provided
          if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout });
          }

          // Additional wait for content to stabilize
          await page.waitForTimeout(1000);

          // Hide dynamic content that might cause flaky screenshots
          await page.addStyleTag({
            content: `
              /* Hide elements with potential timing issues */
              [data-testid="timestamp"],
              .timestamp,
              time {
                opacity: 0 !important;
              }
              
              /* Disable animations for consistent screenshots */
              *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
              }
            `,
          });

          await page.screenshot({
            path: resolve("e2e", "snapshots", snapshotName, `${name}.png`),
            fullPage: true,
          });
        } finally {
          await cleanUp();
        }
      },
      {
        contextOptions: {
          ...device,
        },
      },
    );
  }
}

/**
 * Take screenshots of a specific element across all test devices
 */
export async function takeElementScreenshots(
  url: string,
  selector: string,
  snapshotName: string,
  options?: {
    timeout?: number;
  },
) {
  const { timeout = 5000 } = options || {};

  for (const { device, name } of testDevices) {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();

        try {
          await page.goto(url);
          await page.waitForLoadState("networkidle");

          const element = page.locator(selector);
          await element.waitFor({ state: "visible", timeout });

          await page.addStyleTag({
            content: `
              *, *::before, *::after {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
              }
            `,
          });

          await element.screenshot({
            path: resolve(
              "e2e",
              "snapshots",
              snapshotName,
              `${name}-element.png`,
            ),
          });
        } finally {
          await cleanUp();
        }
      },
      {
        contextOptions: {
          ...device,
        },
      },
    );
  }
}
