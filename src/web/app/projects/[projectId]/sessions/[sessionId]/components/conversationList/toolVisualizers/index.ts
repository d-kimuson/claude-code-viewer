import { BashVisualizer } from "./BashVisualizer";
import { CCVAskUserQuestionVisualizer } from "./CCVAskUserQuestionVisualizer";
import { EditVisualizer } from "./EditVisualizer";
import { ReadVisualizer } from "./ReadVisualizer";
import { TaskVisualizer } from "./TaskVisualizer";
import { TodoWriteVisualizer } from "./TodoWriteVisualizer";
import type { ToolVisualizerComponent } from "./types";
import { WriteVisualizer } from "./WriteVisualizer";

const TOOL_VISUALIZERS: Record<string, ToolVisualizerComponent> = {
  Bash: BashVisualizer,
  Edit: EditVisualizer,
  Read: ReadVisualizer,
  Write: WriteVisualizer,
  Task: TaskVisualizer,
  Agent: TaskVisualizer,
  TodoWrite: TodoWriteVisualizer,
  CCVAskUserQuestion: CCVAskUserQuestionVisualizer,
};

export const getToolVisualizer = (toolName: string): ToolVisualizerComponent | undefined => {
  return TOOL_VISUALIZERS[toolName];
};
