import { z } from "zod";

const versionRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
const versionSchema = z
  .object({
    major: z.string().transform((value) => Number.parseInt(value, 10)),
    minor: z.string().transform((value) => Number.parseInt(value, 10)),
    patch: z.string().transform((value) => Number.parseInt(value, 10)),
  })
  .refine((data) =>
    [data.major, data.minor, data.patch].every((value) => !Number.isNaN(value)),
  );

type ParsedVersion = z.infer<typeof versionSchema>;

export class ClaudeCodeVersion {
  public constructor(public readonly version: ParsedVersion) {}

  public static fromCLIString(version: string) {
    const groups = version.trim().match(versionRegex)?.groups;

    if (groups === undefined) {
      return null;
    }

    const parsed = versionSchema.safeParse(groups);
    if (!parsed.success) {
      return null;
    }

    return new ClaudeCodeVersion(parsed.data);
  }

  public get major() {
    return this.version.major;
  }

  public get minor() {
    return this.version.minor;
  }

  public get patch() {
    return this.version.patch;
  }

  public equals(other: ClaudeCodeVersion) {
    return (
      this.version.major === other.version.major &&
      this.version.minor === other.version.minor &&
      this.version.patch === other.version.patch
    );
  }

  public greaterThan(other: ClaudeCodeVersion) {
    return (
      this.version.major > other.version.major ||
      (this.version.major === other.version.major &&
        (this.version.minor > other.version.minor ||
          (this.version.minor === other.version.minor &&
            this.version.patch > other.version.patch)))
    );
  }

  public greaterThanOrEqual(other: ClaudeCodeVersion) {
    return this.equals(other) || this.greaterThan(other);
  }
}
