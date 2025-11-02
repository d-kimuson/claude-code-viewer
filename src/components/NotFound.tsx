import { Trans } from "@lingui/react";
import { FileQuestion, Home } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NotFoundProps {
  message?: ReactNode;
  description?: ReactNode;
}

export const NotFound: FC<NotFoundProps> = ({
  message = <Trans id="notfound.default.title" />,
  description = <Trans id="notfound.default.description" />,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileQuestion className="size-6 text-muted-foreground" />
            <div>
              <CardTitle>{message}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                window.location.href = "/";
              }}
              variant="default"
            >
              <Home />
              <Trans id="notfound.button.go_home" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
