import { takeScreenshots } from "../utils/snapshot-utils.js";

const BASE_URL = "http://localhost:3400";
const projectId = "sample-project";

async function main() {
  const sessionId = "1af7fc5e-8455-4414-9ccd-011d40f70b2a";

  // Session detail page screenshots
  await takeScreenshots(`${BASE_URL}/projects/${projectId}/sessions/${sessionId}`, "session-detail-full");

  // Test other session IDs as well
  const sessionIds = [
    "5c0375b4-57a5-4f26-b12d-d022ee4e51b7",
    "fe5e1c67-53e7-4862-81ae-d0e013e3270b"
  ];

  for (const sessionId of sessionIds) {
    await takeScreenshots(
      `${BASE_URL}/projects/${projectId}/sessions/${sessionId}`, 
      `session-detail-${sessionId.substring(0, 8)}`
    );
  }

  console.log("✅ Session detail page screenshots completed");
}

main().catch(console.error);