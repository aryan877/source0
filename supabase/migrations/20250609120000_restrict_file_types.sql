-- ================================================================================
-- Restrict Allowed File Types in Storage
-- ================================================================================
--
-- This migration updates the `allowed_mime_types` for the `chat-attachments`
-- storage bucket to align with the frontend application's supported file types.
--
-- This change removes support for video, audio, and certain document formats
-- that are not processable by the AI models.
--

UPDATE storage.buckets
SET
    allowed_mime_types = ARRAY[
        -- Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        -- Documents
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/html',
        'application/sql'
    ]
WHERE id = 'chat-attachments'; 