import { Link as LinkIcon, Loader2 } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UrlInputFormProps = {
  onSubmit: (url: string) => void;
  isLoading: boolean;
};

export const UrlInputForm: FC<UrlInputFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      new URL(url);
      onSubmit(url);
    } catch {
      setError("Please enter a valid URL");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url" className="text-sm font-medium">
          Session JSON URL
        </Label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-supabase-url.supabase.co/storage/v1/object/public/..."
            className="pl-10 h-11 text-base"
            autoFocus
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-base font-medium"
        disabled={!url || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading session...
          </>
        ) : (
          "Load Session"
        )}
      </Button>
    </form>
  );
};
