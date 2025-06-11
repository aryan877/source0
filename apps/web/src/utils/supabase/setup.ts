import { initializeStorage } from "./storage";

/**
 * Initialize Supabase storage for the application
 * This should be called when the app starts
 */
export async function setupSupabaseStorage() {
  try {
    console.log("Initializing Supabase storage...");
    const success = await initializeStorage();

    if (success) {
      console.log("✅ Supabase storage initialized successfully");
    } else {
      console.warn("⚠️ Failed to initialize Supabase storage");
    }

    return success;
  } catch (error) {
    console.error("❌ Error setting up Supabase storage:", error);
    return false;
  }
}

/**
 * Check if storage is properly configured
 */
export async function checkStorageConfiguration() {
  try {
    const success = await initializeStorage();
    return {
      configured: success,
      message: success ? "Storage is properly configured" : "Storage configuration failed",
    };
  } catch (error) {
    return {
      configured: false,
      message: `Storage check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
