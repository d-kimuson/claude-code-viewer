import { ChevronDown } from "lucide-react";
import { type FC, useMemo } from "react";
import { z } from "zod";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ToolVisualizerProps } from "./types";

const optionSchema = z.object({
  label: z.string(),
  description: z.string(),
  preview: z.string().optional(),
});

const questionSchema = z.object({
  question: z.string(),
  header: z.string(),
  options: z.array(optionSchema),
  multiSelect: z.boolean().optional(),
});

const inputSchema = z.object({
  questions: z.array(questionSchema),
});

const toolResultContentSchema = z.object({
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
    ),
  ]),
});

const answersRecordSchema = z.record(z.string(), z.string());

const parseAnswers = (output: unknown): Record<string, string> => {
  if (output === undefined || output === null) return {};

  if (typeof output === "string") {
    try {
      const parsed: unknown = JSON.parse(output);
      const entries = answersRecordSchema.safeParse(parsed);
      if (entries.success) return entries.data;
    } catch {
      /* ignore parse errors */
    }
    return {};
  }

  const parsed = toolResultContentSchema.safeParse(output);
  if (!parsed.success) return {};

  const { content } = parsed.data;
  if (typeof content === "string") {
    return parseAnswers(content);
  }

  for (const item of content) {
    const result = parseAnswers(item.text);
    if (Object.keys(result).length > 0) return result;
  }

  return {};
};

export const CCVAskUserQuestionVisualizer: FC<ToolVisualizerProps> = ({
  input,
  output,
}) => {
  const answers = useMemo(() => parseAnswers(output), [output]);
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  return (
    <div className="space-y-3">
      {parsedInput.data.questions.map((question) => {
        const answer = answers[question.question];

        return (
          <div
            key={question.question}
            className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Question header */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  {question.header}
                </span>
                {question.multiSelect && (
                  <span className="text-xs text-muted-foreground">
                    (multiple)
                  </span>
                )}
              </div>
              <p className="text-sm mt-1">{question.question}</p>
            </div>

            {/* Options */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {question.options.map((option) => {
                const isSelected = answer === option.label;

                return (
                  <div
                    key={option.label}
                    className={`px-3 py-2 ${
                      isSelected
                        ? "bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${isSelected ? "text-green-700 dark:text-green-300" : ""}`}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                    {option.preview && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline group">
                          Preview
                          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                            {option.preview}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Waiting for answer indicator */}
            {!answer && output === undefined && (
              <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse border-t border-gray-200 dark:border-gray-700">
                Waiting for answer...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
