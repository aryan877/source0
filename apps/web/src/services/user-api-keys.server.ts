import { type Database } from "@/types/supabase-types";
import { safeDecrypt, safeEncrypt } from "@/utils/encryption";
import { type SupabaseClient } from "@supabase/supabase-js";

export type UserApiKey = Database["public"]["Tables"]["user_api_keys"]["Row"];
export type UserApiKeyInsert = Database["public"]["Tables"]["user_api_keys"]["Insert"];
export type UserApiKeyUpdate = Database["public"]["Tables"]["user_api_keys"]["Update"];

export type UserByokSettings = Database["public"]["Tables"]["user_byok_settings"]["Row"];
export type UserByokSettingsInsert = Database["public"]["Tables"]["user_byok_settings"]["Insert"];
export type UserByokSettingsUpdate = Database["public"]["Tables"]["user_byok_settings"]["Update"];

// API Keys functions
export async function getUserApiKeys(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserApiKey[]> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to get user API keys", { error: error.message });
    throw new Error(`Failed to get user API keys: ${error.message}`);
  }

  // Decrypt all API keys before returning
  if (data) {
    for (const apiKey of data) {
      if (apiKey.api_key_encrypted) {
        apiKey.api_key_encrypted = await safeDecrypt(apiKey.api_key_encrypted);
      }
    }
  }

  return data || [];
}

export async function getUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string
): Promise<UserApiKey | null> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_enabled", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Failed to get user API key", { error: error.message });
    throw new Error(`Failed to get user API key: ${error.message}`);
  }

  // Decrypt the API key before returning
  if (data?.api_key_encrypted) {
    data.api_key_encrypted = await safeDecrypt(data.api_key_encrypted);
  }

  return data;
}

export async function setUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string,
  apiKey: string
): Promise<UserApiKey> {
  // Encrypt the API key before storing
  const encryptedApiKey = await safeEncrypt(apiKey);
  
  const { data, error } = await supabase
    .from("user_api_keys")
    .upsert({
      user_id: userId,
      provider,
      api_key_encrypted: encryptedApiKey,
      is_enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to set user API key", { error: error.message });
    throw new Error(`Failed to set user API key: ${error.message}`);
  }

  // Return with decrypted key for consistency
  if (data?.api_key_encrypted) {
    data.api_key_encrypted = apiKey; // Return the original unencrypted key
  }

  return data;
}

export async function removeUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    console.error("Failed to remove user API key", { error: error.message });
    throw new Error(`Failed to remove user API key: ${error.message}`);
  }
}




export async function clearAllUserApiKeys(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to clear all user API keys", { error: error.message });
    throw new Error(`Failed to clear all user API keys: ${error.message}`);
  }
}

// BYOK Settings functions (GLOBAL BYOK + MODEL-LEVEL OVERRIDES)
export async function getUserByokSettings(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserByokSettings | null> {
  const { data, error } = await supabase
    .from("user_byok_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Failed to get user BYOK settings", { error: error.message });
    throw new Error(`Failed to get user BYOK settings: ${error.message}`);
  }

  return data;
}

// globalByokEnabled = master BYOK switch (provider-level only)
export async function setUserByokSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
  globalByokEnabled: boolean
): Promise<UserByokSettings> {
  const { data, error } = await supabase
    .from("user_byok_settings")
    .upsert({
      user_id: userId,
      global_byok_enabled: globalByokEnabled,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to set user BYOK settings", { error: error.message });
    throw new Error(`Failed to set user BYOK settings: ${error.message}`);
  }

  return data;
}


// Utility functions
// Check if a specific model should use user's API key (PROVIDER-LEVEL BYOK)
// Priority: Global BYOK -> Provider enabled -> All models enabled by default
export async function isModelEnabledForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  modelId: string,
  provider: string
): Promise<boolean> {
  const byokSettings = await getUserByokSettings(supabase, userId);
  if (!byokSettings?.global_byok_enabled) return false;

  const apiKey = await getUserApiKey(supabase, userId, provider);
  if (!apiKey) return false;

  // All models enabled by default if provider is enabled
  return true;
}

// Check if a provider should use user's API key (PROVIDER-LEVEL BYOK)
export async function shouldUseUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string
): Promise<boolean> {
  const byokSettings = await getUserByokSettings(supabase, userId);
  if (!byokSettings?.global_byok_enabled) return false;

  const apiKey = await getUserApiKey(supabase, userId, provider);
  return !!apiKey?.api_key_encrypted?.trim();
}