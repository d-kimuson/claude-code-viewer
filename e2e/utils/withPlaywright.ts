import { existsSync } from "node:fs";
import path from "node:path";
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type BrowserType,
  chromium,
  type LaunchOptions,
} from "playwright";
import prexit from "prexit";

const STORAGE_PATH = path.join(process.cwd(), ".user-data", "session.json");

type PlaywrightContext = {
  context: BrowserContext;
  cleanUp: () => Promise<void>;
};

type BrowserOptions = {
  browserType: BrowserType;
  contextOptions: BrowserContextOptions;
  launchOptions: LaunchOptions;
};

const useBrowser = (options: BrowserOptions) => {
  const { contextOptions, launchOptions, browserType } = options ?? {};

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  return async () => {
    browser ??= await browserType.launch({
      headless: true,
      ...launchOptions,
    });
    context ??= await browser.newContext({
      storageState: existsSync(STORAGE_PATH) ? STORAGE_PATH : undefined,
      ...contextOptions,
    });

    return {
      browser,
      context,
    };
  };
};

export const withPlaywright = async <T>(
  cb: (ctx: PlaywrightContext) => Promise<T>,
  options?: Partial<BrowserOptions>,
) => {
  const {
    browserType = chromium,
    contextOptions = {},
    launchOptions = {},
  } = options ?? {};

  const { browser, context } = await useBrowser({
    browserType,
    contextOptions,
    launchOptions,
  })();
  let isClosed = false;
  const cleanUp = async () => {
    await context.storageState({
      path: STORAGE_PATH,
    });
    await Promise.all(context.pages().map((page) => page.close()));
    await context.close();
    await browser.close();
    isClosed = true;
  };

  prexit(async () => {
    if (isClosed) return;
    await cleanUp();
  });

  return cb({ context, cleanUp });
};
