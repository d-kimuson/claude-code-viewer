import { ChevronDown, Lightbulb, Settings } from "lucide-react";
import Image from "next/image";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { AssistantMessageContent } from "@/lib/conversation-schema/message/AssistantMessageSchema";
import { MarkdownContent } from "../../../../../../components/MarkdownContent";
import { useConfig } from "../../../../../../hooks/useConfig";

export const AssistantConversationContent: FC<{
  content: AssistantMessageContent;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
}> = ({ content, getToolResult }) => {
  const { config } = useConfig();

  // Hydration対応: 初期状態を統一し、設定は後から適用
  // TODO: 将来的にはCustom Hook化やServer Components移行を検討
  // - useCollapsibleState(configKey) のような再利用可能なフック
  // - Server ComponentsでSSR時に設定を解決
  // - 外部状態管理ライブラリ(Zustand/Jotai)での設定管理
  // 現在は既存コードベースのパターンに合わせてuseState/useEffectを使用
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isToolUseOpen, setIsToolUseOpen] = useState(false);
  const [isToolResultOpen, setIsToolResultOpen] = useState(false);

  // Hydration完了後に設定を適用
  useEffect(() => {
    if (config?.expandThinking !== undefined) {
      setIsThinkingOpen(config.expandThinking);
    }
    if (config?.expandToolUse !== undefined) {
      setIsToolUseOpen(config.expandToolUse);
    }
    if (config?.expandToolResult !== undefined) {
      setIsToolResultOpen(config.expandToolResult);
    }
  }, [config?.expandThinking, config?.expandToolUse, config?.expandToolResult]);

  if (content.type === "text") {
    return (
      <div className="w-full mx-1 sm:mx-2 my-4 sm:my-6">
        <MarkdownContent content={content.text} />
      </div>
    );
  }

  if (content.type === "thinking") {
    return (
      <Card className="bg-muted/50 border-dashed gap-2 py-3 mb-2">
        <Collapsible open={isThinkingOpen} onOpenChange={setIsThinkingOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/80 rounded-t-lg transition-colors py-0 px-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Thinking</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="py-0 px-4">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                {content.thinking}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  if (content.type === "tool_use") {
    const toolResult = getToolResult(content.id);

    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 gap-2 py-3 mb-2">
        <CardHeader className="py-0 px-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium">Tool Use</CardTitle>
            <Badge
              variant="outline"
              className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
            >
              {content.name}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Tool execution with ID: {content.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 py-0 px-4">
          <Collapsible open={isToolUseOpen} onOpenChange={setIsToolUseOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Input Parameters
                </h4>
                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SyntaxHighlighter
                style={oneLight}
                language="json"
                PreTag="div"
                className="text-xs"
              >
                {JSON.stringify(content.input, null, 2)}
              </SyntaxHighlighter>
            </CollapsibleContent>
          </Collapsible>
          {toolResult && (
            <Collapsible
              open={isToolResultOpen}
              onOpenChange={setIsToolResultOpen}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Tool Result
                  </h4>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-background rounded border p-2 mt-1">
                  {typeof toolResult.content === "string" ? (
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {toolResult.content}
                    </pre>
                  ) : (
                    toolResult.content.map((item) => {
                      if (item.type === "image") {
                        return (
                          <Image
                            key={item.source.data}
                            src={`data:${item.source.media_type};base64,${item.source.data}`}
                            alt="Tool Result"
                          />
                        );
                      }
                      if (item.type === "text") {
                        return (
                          <pre
                            key={item.text}
                            className="text-xs overflow-x-auto whitespace-pre-wrap break-words"
                          >
                            {item.text}
                          </pre>
                        );
                      }
                      item satisfies never;
                      throw new Error("Unexpected tool result content type");
                    })
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    );
  }

  if (content.type === "tool_result") {
    return null;
  }

  return null;
};
