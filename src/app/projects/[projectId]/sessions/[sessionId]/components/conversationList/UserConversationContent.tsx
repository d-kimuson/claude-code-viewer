import { Trans } from "@lingui/react";
import { AlertCircle, ChevronDown, Image as ImageIcon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { UserMessageContent } from "@/lib/conversation-schema/message/UserMessageSchema";
import { UserTextContent } from "./UserTextContent";

export const UserConversationContent: FC<{
  content: UserMessageContent;
  id?: string;
}> = ({ content, id }) => {
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
          className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 mb-2 p-0 overflow-hidden"
          id={id}
        >
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors px-3 py-1.5 group">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium">
                    <Trans id="user.content.image" message="Image" />
                  </span>
                  <Badge
                    variant="outline"
                    className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
                  >
                    {content.source.media_type}
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 ml-auto" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="py-3 px-4 border-t border-purple-200 dark:border-purple-800">
                <div className="rounded-lg border overflow-hidden bg-background">
                  <img
                    src={`data:${content.source.media_type};base64,${content.source.data}`}
                    alt="User uploaded content"
                    className="max-w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
    // ツール結果は Assistant の呼び出し側に添えるので
    return null;
  }

  return null;
};
