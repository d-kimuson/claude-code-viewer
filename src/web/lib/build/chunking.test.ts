import { describe, expect, it } from "vitest";
import { getManualChunkName } from "./chunking";

describe("getManualChunkName", () => {
  it("returns syntax-highlighter chunk for react-syntax-highlighter modules", () => {
    const chunkName = getManualChunkName(
      "/repo/node_modules/react-syntax-highlighter/dist/esm/prism-light.js",
    );

    expect(chunkName).toBe("syntax-highlighter-vendor");
  });

  it("returns prismjs chunk for prismjs modules", () => {
    const chunkName = getManualChunkName("/repo/node_modules/prismjs/components/prism-json.js");

    expect(chunkName).toBe("prismjs-vendor");
  });

  it("returns refractor chunk for refractor modules", () => {
    const chunkName = getManualChunkName("/repo/node_modules/refractor/core.js");

    expect(chunkName).toBe("refractor-vendor");
  });

  it("returns markdown parser chunk for markdown parsing dependencies", () => {
    const chunkName = getManualChunkName("/repo/node_modules/remark-gfm/index.js");

    expect(chunkName).toBe("markdown-parser-vendor");
  });

  it("returns xterm chunk for xterm dependencies", () => {
    const chunkName = getManualChunkName("/repo/node_modules/@xterm/xterm/lib/xterm.js");

    expect(chunkName).toBe("xterm-vendor");
  });

  it("returns undefined for application source modules", () => {
    const chunkName = getManualChunkName("/repo/src/web/app/components/Example.tsx");

    expect(chunkName).toBeUndefined();
  });
});
