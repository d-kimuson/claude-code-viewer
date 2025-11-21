import { normalizePrompt } from "./normalizePrompt";

describe("normalizePrompt", () => {
  it("should trim leading and trailing whitespace", () => {
    expect(normalizePrompt("  hello world  ")).toBe("hello world");
    expect(normalizePrompt("\n\nhello world\n\n")).toBe("hello world");
    expect(normalizePrompt("\t\thello world\t\t")).toBe("hello world");
  });

  it("should collapse multiple spaces to a single space", () => {
    expect(normalizePrompt("hello    world")).toBe("hello world");
    expect(normalizePrompt("hello  there  world")).toBe("hello there world");
  });

  it("should collapse multiple newlines to a single space", () => {
    expect(normalizePrompt("hello\nworld")).toBe("hello world");
    expect(normalizePrompt("hello\n\nworld")).toBe("hello world");
    expect(normalizePrompt("hello\n\n\nworld")).toBe("hello world");
  });

  it("should collapse mixed whitespace (spaces, tabs, newlines) to a single space", () => {
    expect(normalizePrompt("hello \n\t world")).toBe("hello world");
    expect(normalizePrompt("hello  \n  \t  world")).toBe("hello world");
  });

  it("should convert to lowercase for case-insensitive matching", () => {
    expect(normalizePrompt("Hello World")).toBe("hello world");
    expect(normalizePrompt("HELLO WORLD")).toBe("hello world");
    expect(normalizePrompt("HeLLo WoRLd")).toBe("hello world");
  });

  it("should handle empty strings", () => {
    expect(normalizePrompt("")).toBe("");
    expect(normalizePrompt("   ")).toBe("");
    expect(normalizePrompt("\n\n")).toBe("");
  });

  it("should handle complex real-world prompts", () => {
    const prompt = `
      Run the test suite
      and generate a coverage report
    `;
    expect(normalizePrompt(prompt)).toBe(
      "run the test suite and generate a coverage report",
    );
  });

  it("should produce consistent output for similar prompts", () => {
    const prompt1 = "Run the test suite";
    const prompt2 = "run  the   test\nsuite";
    const prompt3 = "  RUN THE TEST SUITE  ";

    const normalized1 = normalizePrompt(prompt1);
    const normalized2 = normalizePrompt(prompt2);
    const normalized3 = normalizePrompt(prompt3);

    expect(normalized1).toBe(normalized2);
    expect(normalized2).toBe(normalized3);
  });
});
