import { parseCommandXml } from "./parseCommandXml";

describe("parseCommandXml", () => {
  describe("command parsing", () => {
    it("parses command-name only", () => {
      const input = "<command-name>git status</command-name>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "git status",
        commandArgs: undefined,
        commandMessage: undefined,
      });
    });

    it("parses command-name with command-args", () => {
      const input =
        "<command-name>git commit</command-name><command-args>-m 'test'</command-args>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "git commit",
        commandArgs: "-m 'test'",
        commandMessage: undefined,
      });
    });

    it("parses command-name with command-message", () => {
      const input =
        "<command-name>ls</command-name><command-message>Listing files</command-message>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "ls",
        commandArgs: undefined,
        commandMessage: "Listing files",
      });
    });

    it("parses all command tags together", () => {
      const input =
        "<command-name>npm install</command-name><command-args>--save-dev vitest</command-args><command-message>Installing test dependencies</command-message>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "npm install",
        commandArgs: "--save-dev vitest",
        commandMessage: "Installing test dependencies",
      });
    });

    it("parses command tags with whitespace in content", () => {
      const input =
        "<command-name>\n  git status  \n</command-name><command-args>  --short  </command-args>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "\n  git status  \n",
        commandArgs: "  --short  ",
        commandMessage: undefined,
      });
    });

    it("parses command tags in different order", () => {
      const input =
        "<command-message>Test message</command-message><command-args>-v</command-args><command-name>test command</command-name>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "test command",
        commandArgs: "-v",
        commandMessage: "Test message",
      });
    });
  });

  describe("local-command parsing", () => {
    it("parses local-command-stdout", () => {
      const input = "<local-command-stdout>output text</local-command-stdout>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "local-command",
        stdout: "output text",
      });
    });

    it("parses local-command-stdout with multiline content", () => {
      const input =
        "<local-command-stdout>line1\nline2\nline3</local-command-stdout>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "local-command",
        stdout: "line1\nline2\nline3",
      });
    });

    it("parses local-command-stdout with whitespace", () => {
      const input =
        "<local-command-stdout>  \n  output with spaces  \n  </local-command-stdout>";
      const result = parseCommandXml(input);

      // The regex pattern preserves all whitespace in content
      expect(result).toEqual({
        kind: "local-command",
        stdout: "  \n  output with spaces  \n  ",
      });
    });
  });

  describe("priority: command over local-command", () => {
    it("returns command when both command and local-command tags exist", () => {
      const input =
        "<command-name>test</command-name><local-command-stdout>output</local-command-stdout>";
      const result = parseCommandXml(input);

      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.commandName).toBe("test");
      }
    });
  });

  describe("fallback to text", () => {
    it("returns text when no matching tags found", () => {
      const input = "just plain text";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "text",
        content: "just plain text",
      });
    });

    it("returns text when tags are not closed properly", () => {
      const input = "<command-name>incomplete";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "text",
        content: "<command-name>incomplete",
      });
    });

    it("returns text when tags are mismatched", () => {
      const input = "<command-name>test</different-tag>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "text",
        content: "<command-name>test</different-tag>",
      });
    });

    it("returns text with empty string", () => {
      const input = "";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "text",
        content: "",
      });
    });

    it("returns text with only unrecognized tags", () => {
      const input = "<unknown-tag>content</unknown-tag>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "text",
        content: "<unknown-tag>content</unknown-tag>",
      });
    });
  });

  describe("edge cases", () => {
    it("handles multiple same tags (uses first match)", () => {
      const input =
        "<command-name>first</command-name><command-name>second</command-name>";
      const result = parseCommandXml(input);

      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.commandName).toBe("first");
      }
    });

    it("handles empty tag content", () => {
      const input = "<command-name></command-name>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "",
        commandArgs: undefined,
        commandMessage: undefined,
      });
    });

    it("handles tags with special characters in content", () => {
      const input =
        "<command-name>git commit -m 'test &amp; demo'</command-name>";
      const result = parseCommandXml(input);

      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.commandName).toBe("git commit -m 'test &amp; demo'");
      }
    });

    it("does not match nested tags (regex limitation)", () => {
      const input = "<command-name><nested>inner</nested>outer</command-name>";
      const result = parseCommandXml(input);

      // The regex won't match properly nested tags due to [^<]* pattern
      expect(result.kind).toBe("text");
    });

    it("handles tags with surrounding text", () => {
      const input =
        "Some text before <command-name>test</command-name> and after";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "test",
        commandArgs: undefined,
        commandMessage: undefined,
      });
    });

    it("handles newlines between tags", () => {
      const input =
        "<command-name>test</command-name>\n\n<command-args>arg</command-args>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "test",
        commandArgs: "arg",
        commandMessage: undefined,
      });
    });

    it("handles very long content", () => {
      const longContent = "x".repeat(10000);
      const input = `<command-name>${longContent}</command-name>`;
      const result = parseCommandXml(input);

      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.commandName).toBe(longContent);
      }
    });

    it("handles tags with attributes (not matched)", () => {
      const input = '<command-name attr="value">test</command-name>';
      const result = parseCommandXml(input);

      // Tags with attributes won't match because regex expects <tag> not <tag attr="...">
      expect(result.kind).toBe("text");
    });

    it("handles self-closing tags (not matched)", () => {
      const input = "<command-name />";
      const result = parseCommandXml(input);

      expect(result.kind).toBe("text");
    });

    it("handles Unicode content", () => {
      const input = "<command-name>テスト コマンド 🚀</command-name>";
      const result = parseCommandXml(input);

      expect(result).toEqual({
        kind: "command",
        commandName: "テスト コマンド 🚀",
        commandArgs: undefined,
        commandMessage: undefined,
      });
    });

    it("handles mixed content with multiple tag types", () => {
      const input =
        "Some text <command-name>cmd</command-name> more text <unknown>tag</unknown>";
      const result = parseCommandXml(input);

      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.commandName).toBe("cmd");
      }
    });
  });
});
