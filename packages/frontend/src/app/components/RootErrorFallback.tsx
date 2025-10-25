import type { FC } from "react";
import type { FallbackProps } from "react-error-boundary";

export const RootErrorFallback: FC<FallbackProps> = ({ error }) => {
  return (
    <div>
      <h1>Error</h1>
      <p>Something went wrong</p>
      <p>{error.message}</p>
    </div>
  );
};
