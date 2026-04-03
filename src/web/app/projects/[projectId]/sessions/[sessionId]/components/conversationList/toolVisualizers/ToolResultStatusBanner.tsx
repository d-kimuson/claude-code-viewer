import { AlertCircleIcon, CheckCircle2Icon, ChevronDownIcon } from "lucide-react";
import { type FC, useState } from "react";
import { z } from "zod";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/web/components/ui/collapsible";
import { cn } from "@/web/utils";

const outputStringSchema = z.object({
  content: z.string(),
  is_error: z.boolean().optional(),
});

const outputContentItemSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.string() }),
]);

const outputArraySchema = z.object({
  content: z.array(outputContentItemSchema),
  is_error: z.boolean().optional(),
});

const textContentSchema = z.object({ type: z.literal("text"), text: z.string() });

const isErrorSchema = z.object({
  is_error: z.literal(true),
});

export const extractOutputInfo = (output: unknown): { text: string | null; isError: boolean } => {
  if (output === undefined || output === null) return { text: null, isError: false };

  const isError = isErrorSchema.safeParse(output).success;

  const stringResult = outputStringSchema.safeParse(output);
  if (stringResult.success) {
    return { text: stringResult.data.content, isError };
  }

  const arrayResult = outputArraySchema.safeParse(output);
  if (arrayResult.success) {
    const texts: string[] = [];
    for (const item of arrayResult.data.content) {
      const textItem = textContentSchema.safeParse(item);
      if (textItem.success) {
        texts.push(textItem.data.text);
      }
    }
    if (texts.length > 0) return { text: texts.join("\n"), isError };
  }

  return { text: null, isError };
};

const ERROR_COLLAPSE_THRESHOLD = 200;

type ToolResultStatusBannerProps = {
  output: unknown;
  showSuccess?: boolean;
};

export const ToolResultStatusBanner: FC<ToolResultStatusBannerProps> = ({
  output,
  showSuccess = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (output === undefined || output === null) return null;

  const { text, isError } = extractOutputInfo(output);

  if (!isError && !showSuccess) return null;

  if (isError && text !== null) {
    const isLong = text.length > ERROR_COLLAPSE_THRESHOLD;

    if (isLong) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="px-3 py-1.5 border-t border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30">
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">Error</span>
              <ChevronDownIcon
                className={cn(
                  "w-3 h-3 text-red-500 ml-auto transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1.5 text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {text}
              </pre>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <div className="px-3 py-1.5 border-t border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 flex items-start gap-1.5">
        <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap break-words">
          {text}
        </pre>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 py-1.5 border-t border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 flex items-center gap-1.5">
        <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <span className="text-xs text-red-700 dark:text-red-400">Error</span>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="px-3 py-1 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
        <CheckCircle2Icon className="w-3 h-3 flex-shrink-0 text-green-600 dark:text-green-500" />
        <span className="text-[11px] text-muted-foreground">Success</span>
      </div>
    );
  }

  return null;
};
