import { createClient } from "@/utils/supabase/client";

// API Keys functions - using API endpoints for security (encryption handled server-side)
export async function getUserApiKeys() {
  const response = await fetch("/api/user-api-keys");
  if (!response.ok) throw new Error("Failed to fetch API keys");
  const result = await response.json();
  return result.data || [];
}

export async function setUserApiKey(provider: string, apiKey: string) {
  const response = await fetch("/api/user-api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save API key");
  }

  return response.json();
}

export async function removeUserApiKey(provider: string) {
  const supabase = createClient();
  const { error } = await supabase.from("user_api_keys").delete().eq("provider", provider);

  if (error) throw error;
}

export async function toggleProviderEnabled(provider: string, enabled: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_api_keys")
    .update({ is_enabled: enabled })
    .eq("provider", provider);

  if (error) throw error;
}

export async function clearAllUserApiKeys() {
  const response = await fetch("/api/user-api-keys", { method: "DELETE" });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to clear all API keys");
  }
}

// BYOK Settings functions (GLOBAL BYOK + MODEL-LEVEL OVERRIDES)
// Direct DB access - these are simple settings operations
export async function getUserByokSettings() {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_byok_settings").select("*").single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// globalByokEnabled = master BYOK switch (provider-level only)
export async function setUserByokSettings(globalByokEnabled: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("user_byok_settings")
    .upsert({ user_id: user.id, global_byok_enabled: globalByokEnabled })
    .select()
    .single();
  if (error) throw error;
  return data;
}
