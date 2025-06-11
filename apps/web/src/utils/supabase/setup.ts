import { initializeStorage, setupStoragePolicies } from "./storage";

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

      // Show RLS policy setup instructions
      console.log("Setting up storage policies...");
      await setupStoragePolicies();
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

/**
 * Complete setup guide for Supabase storage
 */
export function displayStorageSetupGuide() {
  console.log(`
🚀 Supabase Storage Setup Guide
===============================

1. BUCKET CONFIGURATION:
   - Bucket name: chat-attachments
   - Access: Private (for security)
   - File size limit: 10MB
   - Allowed types: Images, text files, PDF, JSON, CSV

2. REQUIRED RLS POLICIES:
   Run these SQL commands in your Supabase SQL editor:

   -- Enable RLS on storage.objects table
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

   -- Allow authenticated users to upload files
   CREATE POLICY "Allow authenticated uploads" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'chat-attachments');

   -- Allow users to view their own files
   CREATE POLICY "Allow users to view own files" ON storage.objects
   FOR SELECT TO authenticated
   USING (auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow users to delete their own files
   CREATE POLICY "Allow users to delete own files" ON storage.objects
   FOR DELETE TO authenticated
   USING (auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow users to update their own files
   CREATE POLICY "Allow users to update own files" ON storage.objects
   FOR UPDATE TO authenticated
   USING (auth.uid()::text = (storage.foldername(name))[1]);

3. ENVIRONMENT VARIABLES:
   Make sure these are set in your .env.local:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY

4. SECURITY CONSIDERATIONS:
   - Files are organized by user ID for access control
   - Signed URLs are used for temporary access
   - File type and size validation on upload
   - Private bucket prevents unauthorized access

5. USAGE:
   - Call setupSupabaseStorage() on app initialization
   - Use uploadFile() for single file uploads
   - Use uploadFiles() for multiple file uploads
   - Use createSignedUrl() for secure file access

For more information, visit: https://supabase.com/docs/guides/storage
  `);
}
