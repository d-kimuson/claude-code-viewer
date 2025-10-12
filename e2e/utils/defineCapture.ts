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
    .filter((path) => path !== "");

  const captureWithCase = async (
    device: (typeof testDevices)[number],
    testCase?: CaptureCase,
  ) => {
    await withPlaywright(
      async ({ context, cleanUp }) => {
        const page = await context.newPage();
        await page.goto(href);

        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1000);

        if (testCase) {
          await testCase.setup(page);
        }

        const picturePath = testCase
          ? resolve(
              "e2e",
              "snapshots",
              ...paths,
              testCase.name,
              `${device.name}.png`,
            )
          : resolve("e2e", "snapshots", ...paths, `${device.name}.png`);

        await page.screenshot({
          path: picturePath,
          fullPage: true,
        });

        console.log(`[captured] ${picturePath}`);

        await cleanUp();
      },
      {
        contextOptions: {
          ...device.device,
          baseURL: "http://localhost:4000",
        },
      },
    );
  };

  const tasks = testDevices.flatMap((device): Task[] => {
    return [
      {
        key: `${device.name}-default`,
        execute: () => captureWithCase(device),
      },
      ...cases.map((testCase) => ({
        key: `${device.name}-${testCase.name}`,
        execute: () => captureWithCase(device, testCase),
      })),
    ];
  });

  return {
    tasks,
  } as const;
};
