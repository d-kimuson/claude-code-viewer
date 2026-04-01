import type { FC } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { z } from "zod";
import { detectLanguage } from "@/lib/file-viewer/detectLanguage";
import { useTheme } from "../../../../../../../../hooks/useTheme";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  file_path: z.string(),
});

const parseCatNOutput = (
  raw: string,
): { startLine: number; code: string } | null => {
  const lines = raw.split("\n");
  const parsed: { lineNumber: number; content: string }[] = [];

  for (const line of lines) {
    // cat -n format: spaces + line number + tab + content
    const match = /^\s*(\d+)\t(.*)$/.exec(line);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      parsed.push({
        lineNumber: Number.parseInt(match[1], 10),
        content: match[2],
      });
    }
  }

  const first = parsed[0];
  if (!first) return null;

  const startLine = first.lineNumber;
  const code = parsed.map((p) => p.content).join("\n");
  return { startLine, code };
};

const toolResultStringSchema = z.object({
  content: z.string(),
});

const toolResultArraySchema = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
});

const extractResultText = (output: unknown): string | null => {
  if (output === undefined || output === null) return null;

  const stringResult = toolResultStringSchema.safeParse(output);
  if (stringResult.success) return stringResult.data.content;

  const arrayResult = toolResultArraySchema.safeParse(output);
  if (arrayResult.success) {
    const firstItem = arrayResult.data.content[0];
    if (firstItem) return firstItem.text;
  }

  return null;
};

export const ReadVisualizer: FC<ToolVisualizerProps> = ({ input, output }) => {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;

  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const resultText = extractResultText(output);
  if (resultText === null) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 font-mono text-xs font-medium">
          {parsedInput.data.file_path}
        </div>
        {output === undefined && (
          <div className="px-3 py-4 text-xs text-muted-foreground animate-pulse text-center">
            Reading file...
          </div>
        )}
      </div>
    );
  }

  const parsed = parseCatNOutput(resultText);
  if (!parsed) return null;

  const language = detectLanguage(parsedInput.data.file_path);

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-mono text-xs font-medium">
        {parsedInput.data.file_path}
      </div>
      <SyntaxHighlighter
        style={syntaxTheme}
        language={language}
        showLineNumbers
        startingLineNumber={parsed.startLine}
        wrapLines
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.75rem" }}
      >
        {parsed.code}
      </SyntaxHighlighter>
    </div>
  );
};
