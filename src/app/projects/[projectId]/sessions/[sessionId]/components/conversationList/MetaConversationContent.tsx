import { ChevronDown } from "lucide-react";
import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useConfig } from "../../../../../../hooks/useConfig";

export const MetaConversationContent: FC<PropsWithChildren> = ({
  children,
}) => {
  const { config } = useConfig();
  // Note: 既存のコードベースのパターンに合わせてuseState/useEffectを使用
  // 将来的にはCustom Hook化や外部状態管理での改善を推奨
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (config?.expandMetaInformation !== undefined) {
      setIsOpen(config.expandMetaInformation);
    }
  }, [config?.expandMetaInformation]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            Meta Information
          </h4>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-background rounded border p-3 mt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
