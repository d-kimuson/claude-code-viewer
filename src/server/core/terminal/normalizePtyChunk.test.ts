import { describe, expect, it } from "vitest";
import { normalizePtyChunk } from "./normalizePtyChunk";

describe("normalizePtyChunk", () => {
  it("returns string as-is", () => {
    expect(normalizePtyChunk("hello")).toBe("hello");
  });

  it("converts Buffer to string", () => {
    const buffer = Buffer.from("buffered");
    expect(normalizePtyChunk(buffer)).toBe("buffered");
  });

  it("converts Uint8Array to string", () => {
    const bytes = new Uint8Array([104, 105]);
    expect(normalizePtyChunk(bytes)).toBe("hi");
  });

  it("converts ArrayBuffer to string", () => {
    const bytes = new Uint8Array([111, 107]);
    expect(normalizePtyChunk(bytes.buffer)).toBe("ok");
  });

  it("returns null for unsupported types", () => {
    expect(normalizePtyChunk(123)).toBeNull();
    expect(normalizePtyChunk({})).toBeNull();
  });
});
