import { BashVisualizer } from "./BashVisualizer";
import { CCVAskUserQuestionVisualizer } from "./CCVAskUserQuestionVisualizer";
import { EditVisualizer } from "./EditVisualizer";
import { ReadVisualizer } from "./ReadVisualizer";
import { TaskVisualizer } from "./TaskVisualizer";
import type { ToolVisualizerComponent } from "./types";

const TOOL_VISUALIZERS: Record<string, ToolVisualizerComponent> = {
  Bash: BashVisualizer,
  Edit: EditVisualizer,
  Read: ReadVisualizer,
  Task: TaskVisualizer,
  Agent: TaskVisualizer,
  CCVAskUserQuestion: CCVAskUserQuestionVisualizer,
};

export const getToolVisualizer = (toolName: string): ToolVisualizerComponent | undefined => {
  return TOOL_VISUALIZERS[toolName];
};
