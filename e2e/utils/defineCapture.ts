import { resolve } from "node:path";
import type { Page } from "playwright";
import { testDevices } from "../testDevices";
import { withPlaywright } from "../utils/withPlaywright";
import type { Task } from "./TaskExecutor";

type CaptureCase = {
  name: string;
  setup: (page: Page) => Promise<void>;
};

export const defineCapture = (options: {
  href: string;
  cases?: readonly CaptureCase[];
}) => {
  const { href, cases = [] } = options;

  const paths = href
    .split("/")
    .map((path) => path.trim())
    .filter((path) => path !== "")
    .map((path) => path.replace(/[?=&]/g, "_"));

  const colorSchemes = ["light", "dark"] as const;

  const captureWithCase = async (
    device: (typeof testDevices)[number],
    colorScheme: (typeof colorSchemes)[number],
    testCase?: CaptureCase,
  ) => {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        try {
          const page = await context.newPage();
          await page.goto(href);

          await page.waitForLoadState("domcontentloaded");
          const loadingIndicator = page.locator(
            '[data-testid="loading-indicator"]',
          );
          await loadingIndicator.waitFor({
            state: "hidden",
            timeout: 10000,
          });
          await page.waitForTimeout(3000);

          if (testCase) {
            await testCase.setup(page);
          }

          await loadingIndicator.waitFor({
            state: "hidden",
            timeout: 10000,
          });
          await page.waitForTimeout(3000);

          const picturePath = testCase
            ? resolve(
                "e2e",
                "snapshots",
                ...paths,
                testCase.name,
                `${device.name}-${colorScheme}.png`,
              )
            : resolve(
                "e2e",
                "snapshots",
                ...paths,
                `${device.name}-${colorScheme}.png`,
              );

          await page.screenshot({
            path: picturePath,
            fullPage: true,
          });

          console.log(`[captured] ${picturePath}`);
        } finally {
          await cleanUp();
        }
      },
      {
        contextOptions: {
          ...device.device,
          baseURL: "http://localhost:4000",
          colorScheme,
        },
      },
    );
  };

  const tasks = testDevices.flatMap((device): Task[] => {
    return colorSchemes.flatMap((colorScheme): Task[] => [
      {
        key: `${device.name}-${colorScheme}-default`,
        execute: () => captureWithCase(device, colorScheme),
      },
      ...cases.map((testCase) => ({
        key: `${device.name}-${colorScheme}-${testCase.name}`,
        execute: () => captureWithCase(device, colorScheme, testCase),
      })),
    ]);
  });

  return {
    tasks,
  } as const;
};
