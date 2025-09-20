import { takeScreenshots } from "../utils/snapshot-utils.js";

const BASE_URL = "http://localhost:3400";
const projectId = "sample-project";

async function main() {
  // Project detail page screenshots
  await takeScreenshots(`${BASE_URL}/projects/${projectId}`, "project-detail-page");
  console.log("✅ Project detail page screenshots completed");
}

main().catch(console.error);