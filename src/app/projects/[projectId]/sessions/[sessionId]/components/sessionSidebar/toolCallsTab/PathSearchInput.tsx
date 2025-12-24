import { SearchIcon } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type PathSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
};

export const PathSearchInput: FC<PathSearchInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Filter by path or command..."
        className="pl-9"
        aria-label="Filter by path or command"
      />
    </div>
  );
};
