export const normalizePtyChunk = (chunk: unknown): string | null => {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk).toString("utf8");
  }

  if (chunk instanceof ArrayBuffer) {
    return Buffer.from(chunk).toString("utf8");
  }

  return null;
};
