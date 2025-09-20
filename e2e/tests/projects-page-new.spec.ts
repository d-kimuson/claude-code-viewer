import { takeScreenshots } from "../utils/snapshot-utils.js";

const BASE_URL = "http://localhost:3400";

async function main() {
  // Projects page screenshots
  await takeScreenshots(`${BASE_URL}/projects`, "projects-page");
  console.log("✅ Projects page screenshots completed");
}

main().catch(console.error);