import { createBrowserClient } from "@supabase/ssr";
import { type Database } from "@/types/supabase-types";

/**
 * Create a Supabase client for browser/client-side use
 * This client is used in Client Components
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
