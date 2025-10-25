import type { FC } from "react";

export const ToolInputOneLine: FC<{
  input: Record<string, unknown>;
}> = ({ input }) => {
  const entries = Object.entries(input);
  if (entries.length === 0) return null;

  return (
    <span>
      {entries.map(([key, value], index) => {
        const valueStr =
          typeof value === "string"
            ? value
            : JSON.stringify(value).replace(/^"|"$/g, "");

        return (
          <span key={key}>
            {index > 0 && <span className="text-muted-foreground">, </span>}
            <span className="text-muted-foreground">{key}=</span>
            <span>{valueStr}</span>
          </span>
        );
      })}
    </span>
  );
};
