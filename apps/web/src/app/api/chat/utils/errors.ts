interface ErrorResponse {
  error: string;
  code?: string;
}

export const createErrorResponse = (
  message: string,
  status: number = 500,
  code?: string
): Response => {
  return new Response(
    JSON.stringify({ error: message, ...(code && { code }) } satisfies ErrorResponse),
    { status, headers: { "Content-Type": "application/json" } }
  );
};

const logError = (context: string, error: Error, details: object = {}) => {
  console.error(`[${context}]`, {
    message: error.message,
    stack: error.stack,
    ...details,
  });
};

export const handleStreamError = (
  error: unknown,
  context: string,
  details: object = {}
): string => {
  const err = error instanceof Error ? error : new Error(String(error));
  logError(`StreamError: ${context}`, err, details);
  return `[${err.name}] ${err.message}`;
};

export const getErrorResponse = (error: Error, details: object = {}): Response => {
  const message = error.message;
  logError("APIError", error, details);

  // Context/Token limit errors
  if (
    message.includes("context") &&
    (message.includes("length") || message.includes("window") || message.includes("exceeded"))
  ) {
    return createErrorResponse(
      "The conversation has become too long. Please start a new chat or try summarizing your request.",
      413,
      "CONTEXT_LENGTH_EXCEEDED"
    );
  }

  if (
    message.includes("token") &&
    (message.includes("limit") || message.includes("exceeded") || message.includes("maximum"))
  ) {
    return createErrorResponse(
      "Your message or the conversation is too long. Please try shortening your message or start a new chat.",
      413,
      "TOKEN_LIMIT_EXCEEDED"
    );
  }

  // Check for HTTP 413 (Payload Too Large)
  if (
    message.includes("413") ||
    message.includes("payload too large") ||
    message.includes("request entity too large")
  ) {
    return createErrorResponse(
      "Your message is too long. Please try shortening it or breaking it into smaller parts.",
      413,
      "REQUEST_TOO_LARGE"
    );
  }

  if (message.includes("JSON"))
    return createErrorResponse("Invalid request format", 400, "INVALID_JSON");
  if (message.includes("401") || message.includes("unauthorized"))
    return createErrorResponse("Authentication error", 401, "AUTH_ERROR");
  if (message.includes("API key"))
    return createErrorResponse("API key configuration error", 401, "API_KEY_ERROR");
  if (message.includes("rate limit") || message.includes("quota"))
    return createErrorResponse("Rate limit exceeded", 429, "RATE_LIMIT_ERROR");

  return createErrorResponse(`Internal server error: ${error.message}`, 500, "INTERNAL_ERROR");
};
