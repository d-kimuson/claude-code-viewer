import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

describe("ClaudeCodeVersion.fromCLIString", () => {
  describe("with valid version string", () => {
    it("should correctly parse CLI output format: 'x.x.x (Claude Code)'", () => {
      const version = ClaudeCodeVersion.fromCLIString("1.0.53 (Claude Code)\n");
      expect(version).toStrictEqual({
        major: 1,
        minor: 0,
        patch: 53,
      });
    });
  });

  describe("with invalid version string", () => {
    it("should return null for non-version format strings", () => {
      const version = ClaudeCodeVersion.fromCLIString("invalid version");
      expect(version).toBeNull();
    });
  });
});

describe("ClaudeCodeVersion.versionText", () => {
  it("should convert version object to 'major.minor.patch' format string", () => {
    const text = ClaudeCodeVersion.versionText({
      major: 1,
      minor: 0,
      patch: 53,
    });
    expect(text).toBe("1.0.53");
  });
});

describe("ClaudeCodeVersion.equals", () => {
  describe("with same version", () => {
    it("should return true", () => {
      const a = { major: 1, minor: 0, patch: 53 };
      const b = { major: 1, minor: 0, patch: 53 };
      expect(ClaudeCodeVersion.equals(a, b)).toBe(true);
    });
  });
});

describe("ClaudeCodeVersion.greaterThan", () => {
  describe("when a is greater than b", () => {
    it("should return true when major is greater", () => {
      const a = { major: 2, minor: 0, patch: 0 };
      const b = { major: 1, minor: 9, patch: 99 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(true);
    });

    it("should return true when major is same and minor is greater", () => {
      const a = { major: 1, minor: 1, patch: 0 };
      const b = { major: 1, minor: 0, patch: 99 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(true);
    });

    it("should return true when major and minor are same and patch is greater", () => {
      const a = { major: 1, minor: 0, patch: 86 };
      const b = { major: 1, minor: 0, patch: 85 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(true);
    });
  });

  describe("when a is less than or equal to b", () => {
    it("should return false for same version", () => {
      const a = { major: 1, minor: 0, patch: 53 };
      const b = { major: 1, minor: 0, patch: 53 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(false);
    });

    it("should return false when a is less than b", () => {
      const a = { major: 1, minor: 0, patch: 81 };
      const b = { major: 1, minor: 0, patch: 82 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(false);
    });

    it("should return false when major is less", () => {
      const a = { major: 1, minor: 9, patch: 99 };
      const b = { major: 2, minor: 0, patch: 0 };
      expect(ClaudeCodeVersion.greaterThan(a, b)).toBe(false);
    });
  });
});
