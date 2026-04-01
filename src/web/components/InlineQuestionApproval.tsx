import { AlertCircle, ChevronLeft, ChevronRight, MessageSquareText, Send } from "lucide-react";
import { type FC, useRef, useState } from "react";
import type { Question, QuestionRequest, QuestionResponse } from "@/types/question";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { Checkbox } from "@/web/components/ui/checkbox";
import { Label } from "@/web/components/ui/label";
import { Textarea } from "@/web/components/ui/textarea";
import { cn } from "@/web/utils";

type InlineQuestionApprovalProps = {
  questionRequest: QuestionRequest | null;
  onResponse: (response: QuestionResponse) => Promise<void>;
};

const CUSTOM_ANSWER_KEY = "__other__";

/** Dot-style step indicator for multi-question flows */
const StepIndicator: FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <button
        key={`step-${String(i)}`}
        type="button"
        tabIndex={-1}
        aria-label={`Step ${String(i + 1)}`}
        className={cn(
          "size-2 rounded-full transition-all duration-300",
          i === current
            ? "bg-primary scale-125"
            : i < current
              ? "bg-primary/40"
              : "bg-muted-foreground/25",
        )}
      />
    ))}
  </div>
);

export const InlineQuestionApproval: FC<InlineQuestionApprovalProps> = ({
  questionRequest,
  onResponse,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [annotations, setAnnotations] = useState<
    Record<string, { notes?: string; preview?: string }>
  >({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!questionRequest) return null;

  const questions = questionRequest.questions;
  const totalSteps = questions.length;
  const currentQuestion = questions[currentStep];

  if (!currentQuestion) return null;

  const questionKey = currentQuestion.question;
  const currentSelected = selectedOptions[questionKey] ?? new Set<string>();
  const currentCustomText = customTexts[questionKey] ?? "";

  const handleSingleSelect = (question: Question, optionLabel: string) => {
    const key = question.question;
    const newSelected = new Set<string>();

    if (optionLabel === CUSTOM_ANSWER_KEY) {
      newSelected.add(CUSTOM_ANSWER_KEY);
      // Focus the textarea on next render
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      newSelected.add(optionLabel);
    }

    setSelectedOptions((prev) => ({ ...prev, [key]: newSelected }));

    // Find preview for selected option
    const selectedOption = question.options.find((o) => o.label === optionLabel);
    if (selectedOption?.preview !== undefined && selectedOption.preview !== "") {
      setAnnotations((prev) => ({
        ...prev,
        [key]: { ...prev[key], preview: selectedOption.preview },
      }));
    } else {
      setAnnotations((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        const { preview: _, ...rest } = existing;
        return { ...prev, [key]: rest };
      });
    }
  };

  const handleMultiSelect = (question: Question, optionLabel: string) => {
    const key = question.question;
    const current = new Set(selectedOptions[key] ?? new Set<string>());

    if (optionLabel === CUSTOM_ANSWER_KEY) {
      if (current.has(CUSTOM_ANSWER_KEY)) {
        current.delete(CUSTOM_ANSWER_KEY);
      } else {
        current.add(CUSTOM_ANSWER_KEY);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    } else {
      if (current.has(optionLabel)) {
        current.delete(optionLabel);
      } else {
        current.add(optionLabel);
      }
    }

    setSelectedOptions((prev) => ({ ...prev, [key]: current }));
  };

  const handleCustomTextChange = (question: Question, text: string) => {
    const key = question.question;
    setCustomTexts((prev) => ({ ...prev, [key]: text }));
  };

  const buildAnswerForQuestion = (question: Question): string => {
    const key = question.question;
    const selected = selectedOptions[key] ?? new Set<string>();
    const custom = customTexts[key] ?? "";

    const parts: string[] = [];
    for (const label of selected) {
      if (label === CUSTOM_ANSWER_KEY) {
        if (custom.trim()) {
          parts.push(custom.trim());
        }
      } else {
        parts.push(label);
      }
    }

    return parts.join(", ");
  };

  const isCurrentStepValid = (): boolean => {
    const selected = selectedOptions[questionKey] ?? new Set<string>();
    if (selected.size === 0) return false;

    // If "Other" is selected, custom text must not be empty
    if (selected.has(CUSTOM_ANSWER_KEY)) {
      const custom = customTexts[questionKey] ?? "";
      if (!custom.trim()) return false;
    }

    return true;
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // Save current answer before navigating back
      const answer = buildAnswerForQuestion(currentQuestion);
      setAnswers((prev) => ({ ...prev, [questionKey]: answer }));
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    const answer = buildAnswerForQuestion(currentQuestion);
    setAnswers((prev) => ({ ...prev, [questionKey]: answer }));

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Build final answers including the current step
    const finalAnswers = { ...answers };
    finalAnswers[questionKey] = buildAnswerForQuestion(currentQuestion);

    const response: QuestionResponse = {
      questionRequestId: questionRequest.id,
      answers: finalAnswers,
      annotations,
    };

    try {
      await onResponse(response);
    } finally {
      setIsSubmitting(false);
      // Reset state
      setCurrentStep(0);
      setAnswers({});
      setAnnotations({});
      setSelectedOptions({});
      setCustomTexts({});
    }
  };

  const isLastStep = currentStep === totalSteps - 1;
  const canProceed = isCurrentStepValid();
  const isFirstStep = currentStep === 0;

  const isOptionSelected = (optionLabel: string): boolean => currentSelected.has(optionLabel);

  // Find the currently focused/selected option's preview
  const selectedPreview = currentQuestion.options.find(
    (o) => currentSelected.has(o.label) && o.preview !== undefined && o.preview !== "",
  )?.preview;

  const otherSelected = isOptionSelected(CUSTOM_ANSWER_KEY);

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 lg:mx-12 xl:mx-16 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-6 rounded-md bg-primary/10 text-primary">
                <MessageSquareText className="size-3.5" />
              </div>
              <Badge variant="outline" className="text-[11px] font-medium tracking-wide uppercase">
                {currentQuestion.header}
              </Badge>
            </div>
            {totalSteps > 1 && <StepIndicator current={currentStep} total={totalSteps} />}
          </div>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Question text */}
          <p className="text-sm font-medium leading-relaxed">{currentQuestion.question}</p>

          {/* Options list */}
          <div className="space-y-1.5">
            {currentQuestion.options.map((option) => {
              const selected = isOptionSelected(option.label);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    currentQuestion.multiSelect
                      ? handleMultiSelect(currentQuestion, option.label)
                      : handleSingleSelect(currentQuestion, option.label)
                  }
                  className={cn(
                    "w-full text-left rounded-lg border px-3.5 py-2.5 transition-all duration-200",
                    "hover:shadow-sm",
                    selected
                      ? "border-primary/60 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                      : "border-border/60 hover:border-border hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {currentQuestion.multiSelect ? (
                      <Checkbox checked={selected} className="mt-0.5" tabIndex={-1} />
                    ) : (
                      <div
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
                        )}
                      >
                        {selected && (
                          <div className="size-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium cursor-pointer leading-tight">
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* "Other" option with integrated textarea */}
            <div
              className={cn(
                "rounded-lg border transition-all duration-200",
                otherSelected
                  ? "border-primary/60 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                  : "border-border/60 hover:border-border hover:bg-muted/40",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  currentQuestion.multiSelect
                    ? handleMultiSelect(currentQuestion, CUSTOM_ANSWER_KEY)
                    : handleSingleSelect(currentQuestion, CUSTOM_ANSWER_KEY)
                }
                className="w-full text-left px-3.5 py-2.5"
              >
                <div className="flex items-start gap-3">
                  {currentQuestion.multiSelect ? (
                    <Checkbox checked={otherSelected} className="mt-0.5" tabIndex={-1} />
                  ) : (
                    <div
                      className={cn(
                        "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                        otherSelected ? "border-primary bg-primary" : "border-muted-foreground/30",
                      )}
                    >
                      {otherSelected && (
                        <div className="size-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  )}
                  <Label className="text-sm font-medium cursor-pointer leading-tight">Other</Label>
                </div>
              </button>

              {/* Animated textarea container */}
              <div
                className={cn(
                  "grid transition-all duration-250 ease-out",
                  otherSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-3.5 pb-3 pt-1">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Type your response here..."
                      value={currentCustomText}
                      onChange={(e) => handleCustomTextChange(currentQuestion, e.target.value)}
                      className="min-h-[68px] text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview area */}
          {selectedPreview !== undefined && selectedPreview !== "" && (
            <div className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden animate-in fade-in duration-200">
              <div className="px-3 py-1.5 border-b border-border/40 bg-muted/40">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Preview
                </span>
              </div>
              <div className="p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed text-foreground/80">
                  {selectedPreview}
                </pre>
              </div>
            </div>
          )}

          {/* Navigation footer */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {totalSteps > 1 && !isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!canProceed && otherSelected && !currentCustomText.trim() && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Enter a response
                </span>
              )}
              {isLastStep ? (
                <Button
                  size="sm"
                  onClick={() => void handleSubmit()}
                  disabled={!canProceed || isSubmitting}
                  className="gap-1.5 min-w-[5.5rem]"
                >
                  <Send className="size-3.5" />
                  Submit
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="gap-1 min-w-[5rem]"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
