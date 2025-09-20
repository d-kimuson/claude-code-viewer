import { takeScreenshots } from "../utils/snapshot-utils.js";

const BASE_URL = "http://localhost:3400";

async function main() {
  // Error state screenshots
  await takeScreenshots(`${BASE_URL}/non-existent-page`, "error-404-page");
  await takeScreenshots(`${BASE_URL}/projects/non-existent-project`, "error-invalid-project");
  await takeScreenshots(`${BASE_URL}/projects/sample-project/sessions/non-existent-session`, "error-invalid-session");
  
  console.log("✅ Error states screenshots completed");
}

main().catch(console.error);