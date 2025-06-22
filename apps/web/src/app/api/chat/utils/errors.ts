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

  // Passthrough error from AI service, per user request to simplify.
  return createErrorResponse(message, 500, "INTERNAL_ERROR");
};
