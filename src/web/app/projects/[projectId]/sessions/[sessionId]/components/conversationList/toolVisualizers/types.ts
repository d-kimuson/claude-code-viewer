import type { FC } from "react";

export type ToolVisualizerProps = {
  toolUseId: string;
  input: unknown;
  output: unknown;
  toolUseResult: unknown;
};

export type ToolVisualizerComponent = FC<ToolVisualizerProps>;
