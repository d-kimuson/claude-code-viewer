export type FileDisplayType = "markdown" | "code" | "plain";

export interface FileTypeInfo {
  displayType: FileDisplayType;
  language?: string;
  label: string;
}

/**
 * Detect file type and language from media type
 * Returns information needed for rendering the content appropriately
 */
export function detectFileType(mediaType: string): FileTypeInfo {
  // Markdown files
  if (mediaType === "text/markdown" || mediaType === "text/x-markdown") {
    return {
      displayType: "markdown",
      label: "Markdown",
    };
  }

  // Source code files with syntax highlighting
  const codeTypeMap: Record<string, { language: string; label: string }> = {
    "application/javascript": { language: "javascript", label: "JavaScript" },
    "text/javascript": { language: "javascript", label: "JavaScript" },
    "application/typescript": { language: "typescript", label: "TypeScript" },
    "text/typescript": { language: "typescript", label: "TypeScript" },
    "application/json": { language: "json", label: "JSON" },
    "text/html": { language: "html", label: "HTML" },
    "text/css": { language: "css", label: "CSS" },
    "application/xml": { language: "xml", label: "XML" },
    "text/xml": { language: "xml", label: "XML" },
    "text/x-python": { language: "python", label: "Python" },
    "text/x-java": { language: "java", label: "Java" },
    "text/x-c": { language: "c", label: "C" },
    "text/x-c++": { language: "cpp", label: "C++" },
    "text/x-csharp": { language: "csharp", label: "C#" },
    "text/x-go": { language: "go", label: "Go" },
    "text/x-rust": { language: "rust", label: "Rust" },
    "text/x-ruby": { language: "ruby", label: "Ruby" },
    "text/x-php": { language: "php", label: "PHP" },
    "text/x-swift": { language: "swift", label: "Swift" },
    "text/x-kotlin": { language: "kotlin", label: "Kotlin" },
    "application/x-sh": { language: "bash", label: "Shell Script" },
    "text/x-shellscript": { language: "bash", label: "Shell Script" },
    "application/x-yaml": { language: "yaml", label: "YAML" },
    "text/yaml": { language: "yaml", label: "YAML" },
    "text/x-sql": { language: "sql", label: "SQL" },
  };

  const codeType = codeTypeMap[mediaType];
  if (codeType) {
    return {
      displayType: "code",
      language: codeType.language,
      label: codeType.label,
    };
  }

  // Plain text fallback
  return {
    displayType: "plain",
    label: "Text",
  };
}
