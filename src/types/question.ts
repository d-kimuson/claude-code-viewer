// Matches the AskUserQuestion schema from Claude Code
export type QuestionOption = {
  label: string;
  description: string;
  preview?: string;
};

export type Question = {
  question: string;
  header: string; // max 12 chars
  options: QuestionOption[]; // 2-4 items
  multiSelect: boolean;
};

export type QuestionRequest = {
  id: string;
  turnId: string;
  projectId: string;
  sessionId: string;
  questions: Question[]; // 1-4 items
  timestamp: number;
};

export type QuestionResponse = {
  questionRequestId: string;
  answers: Record<string, string>; // question text -> answer
  annotations: Record<string, { notes?: string; preview?: string }>;
};
