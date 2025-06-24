// Query keys for React Query
export const chatMessagesKeys = {
  all: ["chat-messages"] as const,
  byId: (sessionId: string) => [...chatMessagesKeys.all, "session", sessionId] as const,
};

export const chatSessionsKeys = {
  all: ["chat-sessions"] as const,
  byUser: (userId: string) => [...chatSessionsKeys.all, "user", userId] as const,
  search: (userId: string, searchTerm: string) =>
    [...chatSessionsKeys.byUser(userId), "search", searchTerm] as const,
  byId: (sessionId: string) => [...chatSessionsKeys.all, "session", sessionId] as const,
};

export const mcpServersKeys = {
  all: ["mcp-servers"] as const,
};

export const messageSummariesKeys = {
  all: ["message-summaries"] as const,
  bySessionId: (sessionId: string) => [...messageSummariesKeys.all, "session", sessionId] as const,
};

export const userFilesKeys = {
  all: ["user-files"] as const,
  byUser: (userId: string) => [...userFilesKeys.all, "user", userId] as const,
};

export const usageLogsKeys = {
  all: ["usageLogs"] as const,
  lists: () => [...usageLogsKeys.all, "list"] as const,
  list: (filters: object) => [...usageLogsKeys.lists(), filters] as const,
  stats: (filters: object) => [...usageLogsKeys.all, "stats", filters] as const,
};
