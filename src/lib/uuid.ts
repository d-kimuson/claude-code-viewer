export type Uuid = `${string}-${string}-${string}-${string}-${string}`;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseUuid = (raw: string): Uuid => {
  if (!UUID_V4_PATTERN.test(raw)) {
    throw new Error(`Invalid UUIDv4: ${raw}`);
  }

  // Safe by regex validation; keep all casts centralized in this module.
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return raw as Uuid;
};

type UuidSource = {
  randomUUID?: () => string;
  getRandomValues: <T extends Uint8Array>(array: T) => T;
};

/**
 * Generates a UUIDv4. `crypto.randomUUID` is only available in secure contexts
 * (HTTPS or localhost), so fall back to `crypto.getRandomValues` when the app is
 * served over plain HTTP (e.g. accessed via LAN IP).
 */
export const generateUuid = (source: UuidSource = globalThis.crypto): Uuid => {
  if (typeof source.randomUUID === "function") {
    return parseUuid(source.randomUUID());
  }

  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return parseUuid(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  );
};
