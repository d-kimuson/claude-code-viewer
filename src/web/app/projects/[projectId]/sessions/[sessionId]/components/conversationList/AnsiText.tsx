import type { FC } from "react";
import { parseAnsiIntensity } from "@/lib/ansi/parseAnsiIntensity";
import { cn } from "@/web/utils";

export const AnsiText: FC<{ text: string }> = ({ text }) => (
  <>
    {parseAnsiIntensity(text).map((segment, index) => (
      <span
        key={`${index}:${segment.text}`}
        className={cn({
          "font-bold": segment.bold,
          "opacity-60": segment.dim,
        })}
      >
        {segment.text}
      </span>
    ))}
  </>
);
