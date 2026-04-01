import type { FC } from "react";
import type { FallbackProps } from "react-error-boundary";

const errorToString = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const RootErrorFallback: FC<FallbackProps> = ({ error }) => {
  return (
    <div>
      <h1>Error</h1>
      <p>Something went wrong</p>
      <p>{errorToString(error)}</p>
    </div>
  );
};
