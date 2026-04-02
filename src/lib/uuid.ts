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
