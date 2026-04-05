import { useLingui } from "@lingui/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { type CSSProperties, type FC, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import { toast } from "sonner";
import { Button } from "@/web/components/ui/button";

type CodeBlockProps = {
  language: string;
  code: string;
  syntaxTheme: Record<string, CSSProperties>;
};

export const CodeBlock: FC<CodeBlockProps> = ({ language, code, syntaxTheme }) => {
  const [copied, setCopied] = useState(false);
  const { i18n } = useLingui();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(
        i18n._({
          id: "codeBlock.copy.success",
          message: "Code copied",
        }),
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        i18n._({
          id: "codeBlock.copy.failed",
          message: "Failed to copy code",
        }),
      );
    }
  };

  return (
    <div className="relative my-6">
      <div className="group flex items-center justify-between bg-muted/30 px-4 py-2 border-b border-border rounded-t-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={() => {
            void handleCopy();
          }}
          aria-label={i18n._({ id: "codeBlock.copy", message: "Copy code" })}
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <SyntaxHighlighter
        style={syntaxTheme}
        language={language}
        PreTag="div"
        className="!mt-0 !rounded-t-none !rounded-b-lg !border-t-0 !border !border-border"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        {code.replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
};
