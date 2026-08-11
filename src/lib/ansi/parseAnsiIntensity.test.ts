import { describe, expect, test } from "vitest";
import { parseAnsiIntensity, stripAnsiSgr } from "./parseAnsiIntensity";

describe("parseAnsiIntensity", () => {
  test("renders bold and dim ranges from ANSI SGR sequences", () => {
    expect(
      parseAnsiIntensity(
        "Added \u001b[1m/tmp/demo\u001b[22m as a directory \u001b[2m· /permissions\u001b[22m",
      ),
    ).toEqual([
      { text: "Added ", bold: false, dim: false },
      { text: "/tmp/demo", bold: true, dim: false },
      { text: " as a directory ", bold: false, dim: false },
      { text: "· /permissions", bold: false, dim: true },
    ]);
  });

  test("supports combined codes and resets all intensity with SGR zero", () => {
    expect(parseAnsiIntensity("normal\u001b[1;2;31mstrong dim\u001b[0mnormal")).toEqual([
      { text: "normal", bold: false, dim: false },
      { text: "strong dim", bold: true, dim: true },
      { text: "normal", bold: false, dim: false },
    ]);
  });

  test("supports literal unicode escape and caret escape notation from logs", () => {
    expect(parseAnsiIntensity("\\u001b[1mbold\\u001b[22m \\^[[2mdim\\^[[22m")).toEqual([
      { text: "bold", bold: true, dim: false },
      { text: " ", bold: false, dim: false },
      { text: "dim", bold: false, dim: true },
    ]);
  });

  test("removes unsupported SGR styling without applying unsafe presentation", () => {
    expect(parseAnsiIntensity("before\u001b[31mred\u001b[39mafter")).toEqual([
      { text: "beforeredafter", bold: false, dim: false },
    ]);
  });

  test("preserves malformed and non-SGR escape text", () => {
    expect(parseAnsiIntensity("before\u001b[1xbad after")).toEqual([
      { text: "before\u001b[1xbad after", bold: false, dim: false },
    ]);
  });
});

describe("stripAnsiSgr", () => {
  test("returns copyable plain text without control sequences", () => {
    expect(stripAnsiSgr("\u001b[1m<script>alert(1)</script>\u001b[0m")).toBe(
      "<script>alert(1)</script>",
    );
  });
});
