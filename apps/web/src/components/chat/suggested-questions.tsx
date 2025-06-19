"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { Button, Spinner } from "@heroui/react";
import { memo } from "react";

interface SuggestedQuestionsProps {
  questions: string[];
  isLoading: boolean;
  error: string | null;
  onQuestionSelect: (question: string) => void;
}

export const SuggestedQuestions = memo(
  ({ questions, isLoading, error, onQuestionSelect }: SuggestedQuestionsProps) => {
    if (error) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="flex w-full items-center justify-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-sm text-default-600">Generating suggestions...</span>
        </div>
      );
    }

    if (!questions.length) {
      return null;
    }

    return (
      <div className="flex w-full flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-2 self-start">
          <SparklesIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Continue the conversation</span>
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="flat"
              color="default"
              className="h-auto min-h-[2.5rem] w-full justify-start whitespace-normal rounded-xl p-3 text-left text-sm font-normal"
              onPress={() => onQuestionSelect(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>
    );
  }
);

SuggestedQuestions.displayName = "SuggestedQuestions";
