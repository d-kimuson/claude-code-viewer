import { InlinePermissionApproval } from "@/components/InlinePermissionApproval";
import { InlineQuestionApproval } from "@/components/InlineQuestionApproval";
import type {
  PermissionRequest,
  PermissionResponse,
} from "@/types/permissions";
import type { QuestionRequest, QuestionResponse } from "@/types/question";

interface InlineApprovalPanelProps {
  permissionRequest: PermissionRequest | null;
  questionRequest: QuestionRequest | null;
  onPermissionResponse: (response: PermissionResponse) => Promise<void>;
  onQuestionResponse: (response: QuestionResponse) => Promise<void>;
}

export const InlineApprovalPanel = ({
  permissionRequest,
  questionRequest,
  onPermissionResponse,
  onQuestionResponse,
}: InlineApprovalPanelProps) => {
  // Question takes priority (both shouldn't happen simultaneously, but just in case)
  if (questionRequest) {
    return (
      <InlineQuestionApproval
        questionRequest={questionRequest}
        onResponse={onQuestionResponse}
      />
    );
  }

  if (permissionRequest) {
    return (
      <InlinePermissionApproval
        permissionRequest={permissionRequest}
        onResponse={onPermissionResponse}
      />
    );
  }

  return null;
};
