import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { useCallback, useState } from "react";

interface SuggestedQuestionsResponse {
  questions: string[];
}

export function useSuggestedQuestions() {
  const { suggestQuestions } = useUserPreferencesStore();
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(
    async (userMessage: string, assistantMessage: string) => {
      if (!suggestQuestions || !userMessage || !assistantMessage) {
        setQuestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      setQuestions([]);

      try {
        const response = await fetch("/api/chat/suggest-questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userMessage: userMessage,
            assistantMessage: assistantMessage,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data: SuggestedQuestionsResponse = await response.json();
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch suggestions");
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [suggestQuestions]
  );

  const clearSuggestions = useCallback(() => {
    setQuestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    questions: suggestQuestions ? questions : [],
    isLoading: suggestQuestions ? isLoading : false,
    error: suggestQuestions ? error : null,
    fetchSuggestions,
    clearSuggestions,
  };
}
