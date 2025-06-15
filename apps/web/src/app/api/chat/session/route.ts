import { createOrGetSession, getAuthenticatedUser } from "../utils/database";
import { createErrorResponse } from "../utils/errors";

export async function POST(req: Request): Promise<Response> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId } = await createOrGetSession(supabase, user.id, undefined);

    return Response.json({ sessionId });
  } catch (error) {
    console.error("Failed to create session:", error);
    return createErrorResponse("Failed to create session", 500, "INTERNAL_ERROR");
  }
}
