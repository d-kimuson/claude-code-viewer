import { resolve } from "node:path";
import { decodeSessionId, encodeSessionId } from "./id";

const sampleProjectId =
  "L3BhdGgvdG8vY2xhdWRlLWNvZGUtcHJvamVjdC1kaXIvcHJvamVjdHMvc2FtcGxlLXByb2plY3Q";
const sampleProjectPath =
  "/path/to/claude-code-project-dir/projects/sample-project";
const sampleSessionId = "1af7fc5e-8455-4414-9ccd-011d40f70b2a";
const sampleSessionFilePath = resolve(
  sampleProjectPath,
  `${sampleSessionId}.jsonl`,
);

describe("encodeSessionId", () => {
  it("should encode session id from jsonl file path", () => {
    expect(encodeSessionId(sampleSessionFilePath)).toBe(sampleSessionId);
  });
});

describe("decodeSessionId", () => {
  it("should decode session file absolute path from project id and session id", () => {
    expect(decodeSessionId(sampleProjectId, sampleSessionId)).toBe(
      sampleSessionFilePath,
    );
  });
});
