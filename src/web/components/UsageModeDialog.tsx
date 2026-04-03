import { Trans } from "@lingui/react";
import { CreditCardIcon, KeyIcon } from "lucide-react";
import type { FC } from "react";
import { useConfig } from "@/web/app/hooks/useConfig";
import { Button } from "@/web/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/web/components/ui/dialog";

export const UsageModeDialog: FC = () => {
  const { config, updateConfig } = useConfig();

  const isOpen = config.usageMode === undefined;

  const handleSelect = (mode: "subscription" | "api") => {
    updateConfig({ ...config, usageMode: mode });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-md sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>
            <Trans id="usage_mode.dialog.title" message="How do you use Claude Code?" />
          </DialogTitle>
          <DialogDescription>
            <Trans
              id="usage_mode.dialog.description"
              message="Please select your usage mode. You can change this later in settings."
            />
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          <Button
            variant="outline"
            className="flex h-auto flex-col items-start gap-2 p-4 text-left whitespace-normal"
            onClick={() => handleSelect("subscription")}
          >
            <div className="flex items-center gap-2 font-semibold">
              <CreditCardIcon className="size-5 shrink-0" />
              <span>
                <Trans id="usage_mode.subscription.label" message="Subscription" />
              </span>
            </div>
            <p className="text-muted-foreground text-xs font-normal leading-relaxed">
              <Trans
                id="usage_mode.subscription.description"
                message="You use Claude Code with a subscription plan (Max, Pro, etc.). Some features that require the Agent SDK will be restricted."
              />
            </p>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col items-start gap-2 p-4 text-left whitespace-normal"
            onClick={() => handleSelect("api")}
          >
            <div className="flex items-center gap-2 font-semibold">
              <KeyIcon className="size-5 shrink-0" />
              <span>
                <Trans id="usage_mode.api.label" message="API" />
              </span>
            </div>
            <p className="text-muted-foreground text-xs font-normal leading-relaxed">
              <Trans
                id="usage_mode.api.description"
                message="You use Claude Code with API keys. All features are available."
              />
            </p>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
