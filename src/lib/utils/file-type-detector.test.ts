import { describe, expect, test } from "vitest";
import { detectFileType } from "./file-type-detector";

describe("detectFileType", () => {
  test("detects markdown files", () => {
    expect(detectFileType("text/markdown")).toEqual({
      displayType: "markdown",
      label: "Markdown",
    });

    expect(detectFileType("text/x-markdown")).toEqual({
      displayType: "markdown",
      label: "Markdown",
    });
  });

  test("detects JavaScript files", () => {
    expect(detectFileType("application/javascript")).toEqual({
      displayType: "code",
      language: "javascript",
      label: "JavaScript",
    });

    expect(detectFileType("text/javascript")).toEqual({
      displayType: "code",
      language: "javascript",
      label: "JavaScript",
    });
  });

  test("detects TypeScript files", () => {
    expect(detectFileType("application/typescript")).toEqual({
      displayType: "code",
      language: "typescript",
      label: "TypeScript",
    });

    expect(detectFileType("text/typescript")).toEqual({
      displayType: "code",
      language: "typescript",
      label: "TypeScript",
    });
  });

  test("detects Python files", () => {
    expect(detectFileType("text/x-python")).toEqual({
      displayType: "code",
      language: "python",
      label: "Python",
    });
  });

  test("detects JSON files", () => {
    expect(detectFileType("application/json")).toEqual({
      displayType: "code",
      language: "json",
      label: "JSON",
    });
  });

  test("detects HTML files", () => {
    expect(detectFileType("text/html")).toEqual({
      displayType: "code",
      language: "html",
      label: "HTML",
    });
  });

  test("detects CSS files", () => {
    expect(detectFileType("text/css")).toEqual({
      displayType: "code",
      language: "css",
      label: "CSS",
    });
  });

  test("detects YAML files", () => {
    expect(detectFileType("application/x-yaml")).toEqual({
      displayType: "code",
      language: "yaml",
      label: "YAML",
    });

    expect(detectFileType("text/yaml")).toEqual({
      displayType: "code",
      language: "yaml",
      label: "YAML",
    });
  });

  test("detects shell script files", () => {
    expect(detectFileType("application/x-sh")).toEqual({
      displayType: "code",
      language: "bash",
      label: "Shell Script",
    });

    expect(detectFileType("text/x-shellscript")).toEqual({
      displayType: "code",
      language: "bash",
      label: "Shell Script",
    });
  });

  test("detects Go files", () => {
    expect(detectFileType("text/x-go")).toEqual({
      displayType: "code",
      language: "go",
      label: "Go",
    });
  });

  test("detects Rust files", () => {
    expect(detectFileType("text/x-rust")).toEqual({
      displayType: "code",
      language: "rust",
      label: "Rust",
    });
  });

  test("falls back to plain text for unknown types", () => {
    expect(detectFileType("text/plain")).toEqual({
      displayType: "plain",
      label: "Text",
    });

    expect(detectFileType("application/unknown")).toEqual({
      displayType: "plain",
      label: "Text",
    });
  });
});
