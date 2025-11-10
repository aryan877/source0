import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get session by share slug (server-side version)
 */
export async function getSessionByShareSlug(shareSlug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("share_slug", shareSlug)
    .eq("is_public", true)
    .single();

  if (error) {
    console.error(`Error fetching session by share slug ${shareSlug}:`, error);
    return null;
  }
  return data;
}

/**
 * Create a new chat session (server-side)
 */
export async function createSession(
  userId: string,
  title: string,
  systemPrompt?: string,
  sessionId?: string
) {
  const supabase = await createClient();
  const newSessionId = sessionId || uuidv4();

  // DEBUG: Log the ID being used
  console.log("🔍 [SESSION] createSession called with:", { userId, title, sessionId });
  console.log("🔍 [SESSION] Will use newSessionId:", newSessionId);
  console.log("🔍 [SESSION] newSessionId length:", newSessionId.length);
  console.log("🔍 [SESSION] newSessionId type:", typeof newSessionId);

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      id: newSessionId,
      user_id: userId,
      title,
      system_prompt: systemPrompt || null,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ [SESSION] Error creating chat session:", error);
    console.error("❌ [SESSION] Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    console.error("❌ [SESSION] Failed ID was:", newSessionId);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
  return data;
}

/**
 * Create or get session ID (server-side)
 */
export async function createOrGetSession(
  userId: string,
  sessionId?: string
) {
  const supabase = await createClient();

  // DEBUG: Log what we received
  console.log("🔍 [SESSION] createOrGetSession called with:", { userId, sessionId });
  console.log("🔍 [SESSION] sessionId type:", typeof sessionId);
  console.log("🔍 [SESSION] sessionId length:", sessionId ? sessionId.length : "N/A");
  console.log("🔍 [SESSION] sessionId is valid UUID:", sessionId ? isValidUUID(sessionId) : "N/A");

  if (!sessionId || sessionId === "new") {
    // Note: This createSession is now the server-side one in this file.
    console.log("🔍 [SESSION] Creating new session (no ID or 'new' ID)");
    const newSession = await createSession(userId, "New Chat");
    console.log("🔍 [SESSION] New session created with ID:", newSession.id);
    return { sessionId: newSession.id, isNewSession: true };
  }

  // If sessionId is provided but is not a valid UUID, throw an error
  if (!isValidUUID(sessionId)) {
    console.error("❌ [SESSION] Invalid sessionId format:", sessionId);
    console.error("❌ [SESSION] Expected a valid UUID (36 chars with hyphens)");
    console.error("❌ [SESSION] Got:", sessionId, "Length:", sessionId.length);
    throw new Error(`Invalid session ID format. Expected UUID, got: ${sessionId} (length: ${sessionId.length})`);
  }

  // Verify the session exists before returning it
  const { data: existingSession, error } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId) // Ensure the session belongs to the user
    .single();

  if (existingSession && !error) {
    // Session exists and belongs to user
    return { sessionId, isNewSession: false };
  }

  // Session doesn't exist or doesn't belong to user, create it
  console.log(
    `🔧 [SESSION] Session ${sessionId} not found or invalid, creating new session`
  );
  const newSession = await createSession(userId, "New Chat", undefined, sessionId);
  return { sessionId: newSession.id, isNewSession: true };
}
