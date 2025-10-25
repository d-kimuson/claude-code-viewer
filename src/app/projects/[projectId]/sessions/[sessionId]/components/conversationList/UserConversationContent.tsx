import { Trans } from "@lingui/react";
import { AlertCircle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserEntry } from "@/lib/conversation-schema";
import type { UserMessageContent } from "@/lib/conversation-schema/message/UserMessageSchema";
import { TodoWriteResult } from "./TodoWriteResult";
import { UserTextContent } from "./UserTextContent";

export const UserConversationContent: FC<{
  content: UserMessageContent;
  conversation: UserEntry;
  id?: string;
}> = ({ content, conversation, id }) => {
  if (typeof content === "string") {
    return <UserTextContent text={content} id={id} />;
  }

  if (content.type === "text") {
    return <UserTextContent text={content.text} id={id} />;
  }

  if (content.type === "image") {
    if (content.source.type === "base64") {
      return (
        <Card
          className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20"
          id={id}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-medium">
                <Trans id="user.content.image" message="Image" />
              </CardTitle>
              <Badge
                variant="outline"
                className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
              >
                {content.source.media_type}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              <Trans
                id="user.content.image.description"
                message="User uploaded image content"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden bg-background">
              <Image
                src={`data:${content.source.media_type};base64,${content.source.data}`}
                alt="User uploaded content"
                className="max-w-full h-auto max-h-96 object-contain"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
        id={id}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <CardTitle className="text-sm font-medium">
              <Trans
                id="user.content.unsupported_media"
                message="Unsupported Media"
              />
            </CardTitle>
            <Badge variant="destructive">
              <Trans id="common.error" message="Error" />
            </Badge>
          </div>
          <CardDescription className="text-xs">
            <Trans
              id="user.content.unsupported_media.description"
              message="Media type not supported for display"
            />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (content.type === "tool_result") {
    // TodoWrite の結果は特別にチェックボックスとして表示
    if (conversation.toolUseResult !== undefined) {
      return <TodoWriteResult toolResult={conversation.toolUseResult} />;
    }
    // その他のツール結果は Assistant の呼び出し側に添えるので
    return null;
  }

  return null;
};
