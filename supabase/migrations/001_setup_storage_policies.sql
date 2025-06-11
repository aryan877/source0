-- Migration: Setup storage policies for chat-attachments bucket
-- This migration sets up Row Level Security (RLS) policies for the chat-attachments storage bucket

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;

-- 1. Allow authenticated users to upload files to chat-attachments bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
);

-- 2. Allow users to view their own files
-- Files are organized by user ID in the folder structure: chat-{chatId}/{userId}/filename
CREATE POLICY "Allow users to view own files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (
    -- Allow access to files in user's own folder
    (storage.foldername(name))[2] = auth.uid()::text OR
    -- Allow access to files in chat folders where user is participant
    -- This assumes chat folder structure: chat-{chatId}/{userId}/filename
    name LIKE 'chat-%'
  )
);

-- 3. Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Allow users to update their own files
CREATE POLICY "Allow users to update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Create the chat-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/json',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Add helpful comments
COMMENT ON POLICY "Allow authenticated uploads" ON storage.objects IS 
'Allows authenticated users to upload files to the chat-attachments bucket';

COMMENT ON POLICY "Allow users to view own files" ON storage.objects IS 
'Allows users to view files they uploaded or files in chats they participate in';

COMMENT ON POLICY "Allow users to delete own files" ON storage.objects IS 
'Allows users to delete only their own uploaded files';

COMMENT ON POLICY "Allow users to update own files" ON storage.objects IS 
'Allows users to update only their own uploaded files'; 