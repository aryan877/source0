-- ================================================================================
-- Extensions
-- ================================================================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================================
-- Chat Application Schema
-- Version 1.0
-- ================================================================================
--
-- This schema provides a foundation for building AI-powered chat applications.
-- It is designed to be flexible and model-agnostic, supporting features like
-- multi-provider AI models, file attachments, and conversation branching.
--
-- Key Features:
-- - Multi-provider Support: Accommodates various AI models (e.g., OpenAI, Anthropic).
-- - Flexible Content: Message structure supports complex content like reasoning or sources.
-- - File Attachments: Integrates with Supabase Storage for file handling.
-- - Session Branching: Allows creating new conversation forks from AI responses.
-- - Message Retry: Supports retrying messages by deleting subsequent history.
-- - Public Sharing: Enables sharing sessions via unique, generated slugs.
-- - Streaming Support: Built for real-time streaming with the Vercel AI SDK.
-- - Security: Includes comprehensive Row-Level Security (RLS) policies.
-- - Per-Message Model Tracking: Logs the AI model used for each message.
--

-- ================================================================================
-- Core Tables
-- ================================================================================

--
-- Table: chat_sessions
-- Description: Stores conversation sessions, which act as containers for messages.
-- Supports conversation branching and public sharing.
--
CREATE TABLE IF NOT EXISTS chat_sessions (
    -- Primary Key
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Association
    user_id                 uuid            NOT NULL 
                                           REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    title                   text            NOT NULL,
    system_prompt           text,
    
    -- Session Branching Support
    branched_from_session_id uuid           REFERENCES chat_sessions(id) ON DELETE SET NULL,
    branched_from_message_id text,          -- FK constraint added below
    
    -- Public Sharing
    is_public               boolean         DEFAULT false,
    share_slug              text            UNIQUE,
    
    -- Timestamps
    created_at              timestamptz     DEFAULT now(),
    updated_at              timestamptz     DEFAULT now(),
    
    -- Extensibility
    metadata                jsonb           DEFAULT '{}'::jsonb
);

--
-- Table: chat_messages
-- Description: Stores individual messages within a chat session. Follows a flexible
-- content structure and tracks the AI model used for each assistant message.
--
CREATE TABLE IF NOT EXISTS chat_messages (
    -- Primary Key
    id                  text            PRIMARY KEY,
    
    -- Associations
    session_id          uuid            NOT NULL 
                                       REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id             uuid            NOT NULL 
                                       REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message Content
    role                text            NOT NULL 
                                       CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    
    -- AI SDK v5+ Content Structure
    parts               jsonb           NOT NULL DEFAULT '[]'::jsonb, -- All content lives here
    
    -- Model Tracking (Per Message, Not Per Session)
    model_used          text,           -- e.g., "gpt-4o", "claude-3-5-sonnet-20241022"
    model_provider      text,           -- e.g., "openai", "anthropic"
    model_config        jsonb,          -- Additional model settings used for this message
    
    -- Timestamps
    created_at          timestamptz     DEFAULT now(),
    
    -- Extensibility
    metadata            jsonb           DEFAULT '{}'::jsonb
);

--
-- Manually add the foreign key constraint to break the circular dependency
--
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS fk_branched_from_message;

ALTER TABLE chat_sessions
ADD CONSTRAINT fk_branched_from_message
FOREIGN KEY (branched_from_message_id)
REFERENCES chat_messages(id)
ON DELETE SET NULL;

--
-- Table: chat_stream_ids
-- Description: Supports resumable streaming (e.g., with Vercel AI SDK) by storing
-- a mapping between chat sessions and stream identifiers. The stream state itself
-- is managed externally (e.g., in Redis).
--
CREATE TABLE IF NOT EXISTS chat_stream_ids (
    -- Primary Key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Association
    chat_id uuid NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    -- Stream data
    stream_id text NOT NULL UNIQUE,
    -- Stream state
    cancelled boolean DEFAULT false,
    complete boolean DEFAULT false,
    -- Timestamp
    created_at timestamptz DEFAULT now()
);

-- ================================================================================
-- Performance Indexes
-- ================================================================================

-- Indexes for `chat_sessions`
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id 
    ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_public_recent 
    ON chat_sessions(is_public, created_at DESC) 
    WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_share_slug 
    ON chat_sessions(share_slug) 
    WHERE share_slug IS NOT NULL;

-- Indexes for session branching
CREATE INDEX IF NOT EXISTS idx_chat_sessions_branched_from 
    ON chat_sessions(branched_from_session_id) 
    WHERE branched_from_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_branch_source 
    ON chat_sessions(branched_from_message_id) 
    WHERE branched_from_message_id IS NOT NULL;

-- Indexes for `chat_messages`
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timeline 
    ON chat_messages(session_id, created_at);

-- Indexes for model tracking
CREATE INDEX IF NOT EXISTS idx_chat_messages_model_provider 
    ON chat_messages(model_provider) 
    WHERE model_provider IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_model_used 
    ON chat_messages(model_used) 
    WHERE model_used IS NOT NULL;

-- JSONB indexes for message content and model configuration
CREATE INDEX IF NOT EXISTS idx_chat_messages_parts_gin 
    ON chat_messages USING gin(parts);

CREATE INDEX IF NOT EXISTS idx_chat_messages_model_config_gin 
    ON chat_messages USING gin(model_config);

-- Indexes for `chat_stream_ids`
CREATE INDEX IF NOT EXISTS idx_chat_stream_ids_chat 
    ON chat_stream_ids(chat_id);

-- Index for text search on titles
CREATE INDEX IF NOT EXISTS idx_chat_sessions_title_trgm ON chat_sessions USING gin (title gin_trgm_ops);

-- ================================================================================
-- Supabase Storage Configuration
-- ================================================================================

-- Create the bucket for chat attachments
INSERT INTO storage.buckets (
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types
) VALUES (
    'chat-attachments',
    'chat-attachments',
    true, -- Files are public by default
    52428800, -- 50MB limit
    ARRAY[
        -- Images (AI model supported formats only)
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        -- Videos
        'video/mp4', 'video/webm', 'video/quicktime',
        -- Audio
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm',
        -- Documents
        'text/plain', 'text/markdown', 'text/csv', 'text/html',
        'application/pdf', 'application/json', 'application/xml',
        -- SQL Files
        'application/sql', 'text/sql', 'application/x-sql',
        -- Office Documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ================================================================================
-- Storage RLS Security Policies
-- ================================================================================

-- Policy: Allow authenticated users to upload files to the chat bucket.
DROP POLICY IF EXISTS "authenticated_users_can_upload" ON storage.objects;
CREATE POLICY "authenticated_users_can_upload" 
    ON storage.objects FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

-- Policy: Allow public read access for all files in the bucket.
-- With a public bucket, files are accessible via their URL, but this policy
-- allows using the API to list and download files as well.
DROP POLICY IF EXISTS "public_read_access" ON storage.objects;
CREATE POLICY "public_read_access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'chat-attachments');

-- Policy: Allow users to update their own files.
DROP POLICY IF EXISTS "users_can_update_own_files" ON storage.objects;
CREATE POLICY "users_can_update_own_files" 
    ON storage.objects FOR UPDATE 
    TO authenticated
    USING (
        bucket_id = 'chat-attachments' AND 
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Allow users to delete their own files.
DROP POLICY IF EXISTS "users_can_delete_own_files" ON storage.objects;
CREATE POLICY "users_can_delete_own_files" 
    ON storage.objects FOR DELETE 
    TO authenticated
    USING (
        bucket_id = 'chat-attachments' AND 
        (storage.foldername(name))[2] = auth.uid()::text
    );
    
-- Drop legacy policies that are no longer needed
DROP POLICY IF EXISTS "authenticated_file_access" ON storage.objects;
DROP POLICY IF EXISTS "public_chat_file_access" ON storage.objects;

-- Enable RLS on all chat-related tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_stream_ids ENABLE ROW LEVEL SECURITY;

--
-- RLS Policies for `chat_sessions`
--
-- Policy: Authenticated users can access their own sessions and any public sessions.
DROP POLICY IF EXISTS "authenticated_session_access" ON chat_sessions;
CREATE POLICY "authenticated_session_access" 
    ON chat_sessions FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id OR is_public = true);

-- Policy: Anonymous users can only view public sessions.
DROP POLICY IF EXISTS "anonymous_public_session_view" ON chat_sessions;
CREATE POLICY "anonymous_public_session_view" 
    ON chat_sessions FOR SELECT 
    TO anon
    USING (is_public = true);

--
-- RLS Policies for `chat_messages`
--
-- Policy: Authenticated users can access messages in sessions they have access to.
DROP POLICY IF EXISTS "authenticated_message_access" ON chat_messages;
CREATE POLICY "authenticated_message_access" 
    ON chat_messages FOR ALL 
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = session_id 
            AND (user_id = auth.uid() OR is_public = true)
        )
    );

-- Policy: Anonymous users can view messages in public sessions.
DROP POLICY IF EXISTS "anonymous_public_message_view" ON chat_messages;
CREATE POLICY "anonymous_public_message_view" 
    ON chat_messages FOR SELECT 
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = session_id 
            AND is_public = true
        )
    );

--
-- RLS Policies for `chat_stream_ids`
--
-- Policy: Stream information is only accessible to the session owner.
DROP POLICY IF EXISTS "owner_stream_access" ON chat_stream_ids;
CREATE POLICY "owner_stream_access" 
    ON chat_stream_ids FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_id 
            AND user_id = auth.uid()
        )
    );

-- ================================================================================
-- Utility Functions
-- ================================================================================

--
-- Function: update_updated_at_column()
-- Description: A trigger function to automatically update the `updated_at`
-- timestamp on row updates.
--
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply trigger to `chat_sessions` to track updates.
DROP TRIGGER IF EXISTS trigger_update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trigger_update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

--
-- Function: branch_chat_session(p_original_session_id, p_branch_from_message_id, p_new_title)
-- Description: Creates a new chat session by branching from an existing one at a
-- specific AI-generated message. It copies the conversation history up to the
-- branch point into the new session.
--
CREATE OR REPLACE FUNCTION branch_chat_session(
    p_original_session_id uuid,
    p_branch_from_message_id text,
    p_new_title text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_session_id uuid;
    v_user_id uuid;
    v_branch_message_role text;
    v_branch_message_time timestamptz;
BEGIN
    -- Security check: Ensure the caller is the owner of the original session.
    SELECT user_id INTO v_user_id
    FROM chat_sessions
    WHERE id = p_original_session_id;

    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied. You must be the owner of the session to branch it.';
    END IF;

    -- Verify the branch message is from an assistant.
    SELECT role, created_at INTO v_branch_message_role, v_branch_message_time
    FROM chat_messages
    WHERE id = p_branch_from_message_id 
    AND session_id = p_original_session_id;
    
    IF v_branch_message_role IS NULL THEN
        RAISE EXCEPTION 'Message not found or does not belong to the specified session.';
    END IF;
    
    IF v_branch_message_role != 'assistant' THEN
        RAISE EXCEPTION 'Branching is only allowed from AI (assistant) messages.';
    END IF;
    
    -- Create new session, copying configuration from the original.
    INSERT INTO chat_sessions (
        user_id,
        title,
        system_prompt,
        branched_from_session_id,
        branched_from_message_id,
        metadata
    )
    SELECT 
        user_id,
        COALESCE(p_new_title, title || ' (Branch)'),
        system_prompt,
        p_original_session_id,
        p_branch_from_message_id,
        metadata
    FROM chat_sessions 
    WHERE id = p_original_session_id
    RETURNING id INTO v_new_session_id;
    
    -- Copy all messages up to and including the branch point.
    INSERT INTO chat_messages (
        id,
        session_id,
        user_id,
        role,
        parts,
        model_used,
        model_provider,
        model_config,
        created_at,
        metadata
    )
    SELECT 
        gen_random_uuid()::text,  -- Generate new UUID for each message
        v_new_session_id,  -- New session ID
        user_id,
        role,
        parts,
        model_used,
        model_provider,
        model_config,
        created_at,
        metadata
    FROM chat_messages 
    WHERE session_id = p_original_session_id 
    AND created_at <= v_branch_message_time
    ORDER BY created_at;
    
    RETURN v_new_session_id;
END;
$$;



--
-- Function: get_session_branches(p_session_id)
-- Description: Retrieves all sessions that have been branched from a given session.
--
CREATE OR REPLACE FUNCTION get_session_branches(p_session_id uuid)
RETURNS TABLE (
    branch_id uuid,
    branch_title text,
    branch_created_at timestamptz,
    branch_point_message jsonb,
    branch_point_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        cm.parts,
        cm.created_at
    FROM chat_sessions cs
    JOIN chat_messages cm ON cs.branched_from_message_id = cm.id
    WHERE cs.branched_from_session_id = p_session_id
    ORDER BY cs.created_at;
END;
$$;

--
-- Function: get_branch_ancestry(p_session_id)
-- Description: Recursively fetches the parent chain of a branched session.
--
CREATE OR REPLACE FUNCTION get_branch_ancestry(p_session_id uuid)
RETURNS TABLE (
    session_id uuid,
    title text,
    level integer,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE branch_tree AS (
        -- Start with the current session
        SELECT 
            cs.id,
            cs.title,
            cs.branched_from_session_id,
            0 as level,
            cs.created_at
        FROM chat_sessions cs
        WHERE cs.id = p_session_id
        
        UNION ALL
        
        -- Recursively find parent sessions
        SELECT 
            cs.id,
            cs.title,
            cs.branched_from_session_id,
            bt.level + 1,
            cs.created_at
        FROM chat_sessions cs
        INNER JOIN branch_tree bt ON cs.id = bt.branched_from_session_id
    )
    SELECT 
        bt.id,
        bt.title,
        bt.level,
        bt.created_at
    FROM branch_tree bt
    ORDER BY bt.level DESC;
END;
$$;

--
-- Function: generate_share_slug()
-- Description: Generates a short, unique, random string suitable for a URL slug.
--
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    slug text;
    exists_check boolean;
BEGIN
    LOOP
        -- Generate an 8-character random slug.
        slug := lower(
            substring(
                md5(random()::text) || md5(random()::text), 
                1, 8
            )
        );
        
        -- Check for collisions.
        SELECT EXISTS(
            SELECT 1 FROM chat_sessions WHERE share_slug = slug
        ) INTO exists_check;
        
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN slug;
END;
$$;

--
-- Function: search_user_sessions(p_search_term text)
-- Description: Searches for chat sessions belonging to the current user based on a search term.
-- The search is performed case-insensitively on the session title.
--
CREATE OR REPLACE FUNCTION search_user_sessions(p_search_term text)
RETURNS SETOF chat_sessions
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF p_search_term IS NULL OR p_search_term = '' THEN
        RETURN QUERY
        SELECT cs.*
        FROM chat_sessions cs
        WHERE cs.user_id = auth.uid()
        ORDER BY cs.updated_at DESC;
    ELSE
        RETURN QUERY
        SELECT cs.*
        FROM chat_sessions cs
        WHERE cs.user_id = auth.uid()
          AND cs.title ILIKE '%' || p_search_term || '%'
        ORDER BY cs.updated_at DESC;
    END IF;
END;
$$;

-- ================================================================================
-- Usage Examples
-- ================================================================================

--
-- Usage Examples
--

-- Create a new chat session:
-- INSERT INTO chat_sessions (user_id, title, system_prompt)
-- VALUES (auth.uid(), 'My First Chat', 'You are a helpful assistant.');

-- Add messages to a session:
-- INSERT INTO chat_messages (session_id, user_id, role, parts)
-- VALUES 
-- ('your-session-id', auth.uid(), 'user', '[{"type": "text", "text": "Hello!"}]'),
-- ('your-session-id', auth.uid(), 'assistant', '[{"type": "text", "text": "Hi there!"}]');

-- Retrieve all messages in a session:
-- SELECT id, role, parts, model_used, created_at
-- FROM chat_messages
-- WHERE session_id = 'your-session-id'
-- ORDER BY created_at;


--
-- Message Retry
--

-- Message retry is now handled client-side using the chat-messages service functions:
-- - deleteMessagesAfter() for user message retry
-- - deleteMessageAndAfter() for assistant message retry


--
-- Session Branching
--

-- Create a new conversation branch from an AI message:
-- SELECT branch_chat_session(
--     'original-session-id', 
--     'ai-message-id-to-branch-from', 
--     'A New Direction'
-- );

-- Find all branches created from a specific session:
-- SELECT * FROM get_session_branches('your-session-id');

-- Trace the ancestry of a branched session:
-- SELECT * FROM get_branch_ancestry('your-branched-session-id');


-- ================================================================================
-- Redis Integration for Vercel AI SDK Resumable Streams
-- ================================================================================
--
-- Overview
--
-- This schema supports the Vercel AI SDK's resumable streaming feature. The feature
-- relies on an external Redis instance to manage the stream's state (e.g., buffering),
-- while this database schema stores a log of stream identifiers for each chat session.
--
-- For resumable streaming to function, the application environment must be
-- configured with credentials for a Redis instance.
--
--
-- Environment Variables
-- ---------------------
-- The `resumable-stream` library, used by the Vercel AI SDK, automatically
-- detects the following environment variables:
--
--   REDIS_URL: The direct connection URL for the Redis instance.
--              (e.g., redis://[user:password@]host:port)
--
--   REDIS_TOKEN: An authentication token, if required by the Redis provider.
--
--   REDIS_REST_API_URL: The REST API URL for the Redis instance (e.g., for Upstash).
--
--   REDIS_REST_API_TOKEN: The token for the REST API.
--
--
-- Provider Example: Upstash
-- -------------------------
-- Upstash is a serverless Redis provider with a free tier. After creating a
-- Redis database on Upstash, the dashboard provides all necessary values for
-- the environment variables listed above.
--
--
-- Implementation Notes
-- --------------------
-- The application uses the `resumable-stream` library to enable stream resumption.
-- The server-side logic for this is as follows:
--
-- 1. On a GET request to resume, the API queries the `chat_stream_ids` table to
--    find the most recent `stream_id` for a given `chat_id`. This ID is then
--    used to attempt resumption via the `resumableStream` function.
--
-- 2. On a POST request for a new turn, the API generates a new `streamId`.
--
-- 3. The new `streamId` is inserted into the `chat_stream_ids` table, linking
--    it to the current `chat_id`.
--
-- This database schema provides the `chat_stream_ids` table to support this logic.
--
-- This database schema provides the necessary table to support this server-side logic.
--
-- ================================================================================
-- Usage Examples
-- ================================================================================