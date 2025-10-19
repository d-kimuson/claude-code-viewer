"use client";

import { Trans } from "@lingui/react";
import { ChevronDown, Lightbulb, Wrench } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import type { FC } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import z from "zod";
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
import { Button } from "../../../../../../../components/ui/button";
import type { SidechainConversation } from "../../../../../../../lib/conversation-schema";
import { MarkdownContent } from "../../../../../../components/MarkdownContent";
import { SidechainConversationModal } from "../conversationModal/SidechainConversationModal";

const taskToolInputSchema = z.object({
  prompt: z.string(),
});

export const AssistantConversationContent: FC<{
  content: AssistantMessageContent;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  getSidechainConversationByPrompt: (
    prompt: string,
  ) => SidechainConversation | undefined;
  getSidechainConversations: (rootUuid: string) => SidechainConversation[];
}> = ({
  content,
  getToolResult,
  getSidechainConversationByPrompt,
  getSidechainConversations,
}) => {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;
  if (content.type === "text") {
    return (
      <div className="w-full mx-1 sm:mx-2 my-4 sm:my-6">
        <MarkdownContent content={content.text} />
      </div>
    );
  }

  if (content.type === "thinking") {
    return (
      <Card className="bg-muted/50 border-dashed gap-2 py-3 mb-2 hover:shadow-sm transition-all duration-200">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/80 rounded-t-lg transition-all duration-200 py-0 px-4 group">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-muted-foreground group-hover:text-yellow-600 transition-colors" />
                <CardTitle className="text-sm font-medium group-hover:text-foreground transition-colors">
                  <Trans id="assistant.thinking" message="Thinking" />
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
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

    const taskModal = (() => {
      const taskInput =
        content.name === "Task"
          ? taskToolInputSchema.safeParse(content.input)
          : undefined;

      if (taskInput === undefined || taskInput.success === false) {
        return undefined;
      }

      const conversation = getSidechainConversationByPrompt(
        taskInput.data.prompt,
      );

      if (conversation === undefined) {
        return undefined;
      }

      return (
        <SidechainConversationModal
          conversation={conversation}
          sidechainConversations={getSidechainConversations(
            conversation.uuid,
          ).map((original) => ({
            ...original,
            isSidechain: false,
          }))}
          getToolResult={getToolResult}
          trigger={
            <Button variant="outline" size="sm">
              View Log
            </Button>
          }
        />
      );
    })();

    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 gap-2 py-3 mb-2">
        <CardHeader className="py-0 px-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium">
              <Trans id="assistant.tool_use" message="Tool Use" />
            </CardTitle>
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
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 transition-all duration-200 group">
                <h4 className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <Trans
                    id="assistant.tool.input_parameters"
                    message="Input Parameters"
                  />
                </h4>
                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SyntaxHighlighter
                style={syntaxTheme}
                language="json"
                PreTag="div"
                className="text-xs"
              >
                {JSON.stringify(content.input, null, 2)}
              </SyntaxHighlighter>
            </CollapsibleContent>
          </Collapsible>
          {toolResult && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 transition-all duration-200 group">
                  <h4 className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    <Trans id="assistant.tool.result" message="Tool Result" />
                  </h4>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
          {taskModal}
        </CardContent>
      </Card>
    );
  }

  if (content.type === "tool_result") {
    return null;
  }

  return null;
};
