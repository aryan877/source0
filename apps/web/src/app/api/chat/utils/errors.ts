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

export const handleStreamError = (error: unknown, context: string): string => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Stream error [${context}]:`, err.message);
  return `[${err.name}] ${err.message}`;
};

export const getErrorResponse = (error: Error): Response => {
  const message = error.message;

  if (message.includes("JSON"))
    return createErrorResponse("Invalid request format", 400, "INVALID_JSON");
  if (message.includes("401") || message.includes("unauthorized"))
    return createErrorResponse("Authentication error", 401, "AUTH_ERROR");
  if (message.includes("API key"))
    return createErrorResponse("API key configuration error", 401, "API_KEY_ERROR");
  if (message.includes("rate limit") || message.includes("quota"))
    return createErrorResponse("Rate limit exceeded", 429, "RATE_LIMIT_ERROR");

  console.error("API Error:", { message: error.message, stack: error.stack });
  return createErrorResponse(`Internal server error: ${error.message}`, 500, "INTERNAL_ERROR");
};
