// Query keys for React Query
export const chatMessagesKeys = {
  all: ["chat-messages"] as const,
  bySession: (sessionId: string) => [...chatMessagesKeys.all, "session", sessionId] as const,
};

export const chatSessionsKeys = {
  all: ["chat-sessions"] as const,
  byUser: (userId: string) => [...chatSessionsKeys.all, "user", userId] as const,
};
