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
-- - Message Regeneration: Supports replacing a message and clearing subsequent history.
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
CREATE TABLE chat_sessions (
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
    branched_from_message_id uuid           REFERENCES chat_messages(id) ON DELETE SET NULL,
    
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
CREATE TABLE chat_messages (
    -- Primary Key
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
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
-- Table: chat_attachments
-- Description: Manages file attachments associated with chat messages, integrating
-- with Supabase Storage.
--
CREATE TABLE chat_attachments (
    -- Primary Key
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    message_id          uuid            NOT NULL 
                                       REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id             uuid            NOT NULL 
                                       REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File Information
    file_name           text            NOT NULL,
    file_path           text            NOT NULL,  -- Supabase Storage path
    file_size           bigint,
    mime_type           text,
    
    -- Timestamp
    created_at          timestamptz     DEFAULT now()
);

--
-- Table: chat_stream_ids
-- Description: Supports resumable streaming (e.g., with Vercel AI SDK) by storing
-- a mapping between chat sessions and stream identifiers. The stream state itself
-- is managed externally (e.g., in Redis).
--
CREATE TABLE chat_stream_ids (
    -- Primary Key
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Association
    chat_id             uuid            NOT NULL 
                                       REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Stream data
    stream_id           text            NOT NULL UNIQUE,
    
    -- Stream State Management
    status              text            DEFAULT 'active' 
                                       CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    
    -- Stream Timing
    started_at          timestamptz     DEFAULT now(),
    completed_at        timestamptz,
    last_activity_at    timestamptz     DEFAULT now(),
    
    -- Extensibility
    stream_config       jsonb           DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at          timestamptz     DEFAULT now()
);

-- ================================================================================
-- Performance Indexes
-- ================================================================================

-- Indexes for `chat_sessions`
CREATE INDEX idx_chat_sessions_user_id 
    ON chat_sessions(user_id);

CREATE INDEX idx_chat_sessions_public_recent 
    ON chat_sessions(is_public, created_at DESC) 
    WHERE is_public = true;

CREATE INDEX idx_chat_sessions_share_slug 
    ON chat_sessions(share_slug) 
    WHERE share_slug IS NOT NULL;

-- Indexes for session branching
CREATE INDEX idx_chat_sessions_branched_from 
    ON chat_sessions(branched_from_session_id) 
    WHERE branched_from_session_id IS NOT NULL;

CREATE INDEX idx_chat_sessions_branch_source 
    ON chat_sessions(branched_from_message_id) 
    WHERE branched_from_message_id IS NOT NULL;

-- Indexes for `chat_messages`
CREATE INDEX idx_chat_messages_session_timeline 
    ON chat_messages(session_id, created_at);

-- Indexes for model tracking
CREATE INDEX idx_chat_messages_model_provider 
    ON chat_messages(model_provider) 
    WHERE model_provider IS NOT NULL;

CREATE INDEX idx_chat_messages_model_used 
    ON chat_messages(model_used) 
    WHERE model_used IS NOT NULL;

-- JSONB indexes for message content and model configuration
CREATE INDEX idx_chat_messages_parts_gin 
    ON chat_messages USING gin(parts);

CREATE INDEX idx_chat_messages_model_config_gin 
    ON chat_messages USING gin(model_config);

-- Indexes for `chat_attachments`
CREATE INDEX idx_chat_attachments_message 
    ON chat_attachments(message_id);

CREATE INDEX idx_chat_attachments_user_recent 
    ON chat_attachments(user_id, created_at DESC);

-- Indexes for `chat_stream_ids`
CREATE INDEX idx_chat_stream_ids_chat 
    ON chat_stream_ids(chat_id);

CREATE INDEX idx_chat_stream_ids_status 
    ON chat_stream_ids(status, last_activity_at);

CREATE INDEX idx_chat_stream_ids_active_streams 
    ON chat_stream_ids(status, started_at) 
    WHERE status = 'active';

-- ================================================================================
-- Supabase Storage Configuration
-- ================================================================================

-- Enable RLS on the storage schema
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
    false,
    52428800, -- 50MB limit
    ARRAY[
        -- Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        -- Videos
        'video/mp4', 'video/webm', 'video/quicktime',
        -- Audio
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm',
        -- Documents
        'text/plain', 'text/markdown', 'text/csv', 'text/html',
        'application/pdf', 'application/json', 'application/xml',
        -- Office Documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ================================================================================
-- Storage RLS Security Policies
-- ================================================================================

-- Policy: Allow authenticated users to upload files to the chat bucket.
CREATE POLICY "authenticated_users_can_upload" 
    ON storage.objects FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

-- Policy: Control file access for authenticated users.
-- Allows access to own files or files in public/owned chats.
CREATE POLICY "authenticated_file_access" 
    ON storage.objects FOR SELECT 
    TO authenticated
    USING (
        bucket_id = 'chat-attachments' AND (
            -- Own files
            (storage.foldername(name))[2] = auth.uid()::text OR
            -- Files in accessible chats
            (
                name LIKE 'chat-%' AND
                EXISTS (
                    SELECT 1 FROM chat_sessions cs
                    WHERE cs.id::text = REPLACE((storage.foldername(name))[1], 'chat-', '')
                    AND (cs.user_id = auth.uid() OR cs.is_public = true)
                )
            )
        )
    );

-- Policy: Allow anonymous users to access files in public chats.
CREATE POLICY "public_chat_file_access" 
    ON storage.objects FOR SELECT 
    TO anon
    USING (
        bucket_id = 'chat-attachments' AND 
        name LIKE 'chat-%' AND
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id::text = REPLACE((storage.foldername(name))[1], 'chat-', '') 
            AND cs.is_public = true
        )
    );

-- Policy: Allow users to update their own files.
CREATE POLICY "users_can_update_own_files" 
    ON storage.objects FOR UPDATE 
    TO authenticated
    USING (
        bucket_id = 'chat-attachments' AND 
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Allow users to delete their own files.
CREATE POLICY "users_can_delete_own_files" 
    ON storage.objects FOR DELETE 
    TO authenticated
    USING (
        bucket_id = 'chat-attachments' AND 
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Enable RLS on all chat-related tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_stream_ids ENABLE ROW LEVEL SECURITY;

--
-- RLS Policies for `chat_sessions`
--
-- Policy: Authenticated users can access their own sessions and any public sessions.
CREATE POLICY "authenticated_session_access" 
    ON chat_sessions FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id OR is_public = true);

-- Policy: Anonymous users can only view public sessions.
CREATE POLICY "anonymous_public_session_view" 
    ON chat_sessions FOR SELECT 
    TO anon
    USING (is_public = true);

--
-- RLS Policies for `chat_messages`
--
-- Policy: Authenticated users can access messages in sessions they have access to.
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
-- RLS Policies for `chat_attachments`
--
-- Policy: Authenticated users can access attachments in sessions they have access to.
CREATE POLICY "authenticated_attachment_access" 
    ON chat_attachments FOR ALL 
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM chat_messages cm 
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cm.id = message_id 
            AND (cs.user_id = auth.uid() OR cs.is_public = true)
        )
    );

--
-- RLS Policies for `chat_stream_ids`
--
-- Policy: Stream information is only accessible to the session owner.
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
    p_branch_from_message_id uuid,
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
    -- Verify the branch message is from an assistant.
    SELECT role, created_at, user_id INTO v_branch_message_role, v_branch_message_time, v_user_id
    FROM chat_messages cm
    JOIN chat_sessions cs ON cm.session_id = cs.id
    WHERE cm.id = p_branch_from_message_id 
    AND cs.id = p_original_session_id;
    
    IF v_branch_message_role IS NULL THEN
        RAISE EXCEPTION 'Message not found or not accessible';
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
-- Function: regenerate_message_and_clear_after(p_message_id, p_new_parts, ...)
-- Description: Replaces the content of a specified message and deletes all
-- subsequent messages in the same session. This is for simple "regenerate" actions.
--
CREATE OR REPLACE FUNCTION regenerate_message_and_clear_after(
    p_message_id uuid,
    p_new_parts jsonb,
    p_model_used text DEFAULT NULL,
    p_model_provider text DEFAULT NULL,
    p_model_config jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id uuid;
    v_message_time timestamptz;
    v_user_id uuid;
BEGIN
    -- Get session and timestamp of the message being regenerated.
    SELECT session_id, created_at, user_id 
    INTO v_session_id, v_message_time, v_user_id
    FROM chat_messages 
    WHERE id = p_message_id;
    
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    -- Delete all messages after this one in the same session.
    DELETE FROM chat_messages 
    WHERE session_id = v_session_id 
    AND created_at > v_message_time;
    
    -- Update the target message with new content.
    UPDATE chat_messages 
    SET 
        parts = p_new_parts,
        model_used = p_model_used,
        model_provider = p_model_provider,
        model_config = p_model_config,
        created_at = now()  -- Update timestamp to reflect regeneration
    WHERE id = p_message_id;
    
    RETURN p_message_id;
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
-- Function: create_resumable_stream(p_chat_id, p_stream_id, p_stream_config)
-- Description: Creates a record for a new resumable stream session.
--
CREATE OR REPLACE FUNCTION create_resumable_stream(
    p_chat_id uuid, 
    p_stream_id text,
    p_stream_config jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stream_record_id uuid;
BEGIN
    INSERT INTO chat_stream_ids (
        chat_id, 
        stream_id, 
        status, 
        stream_config,
        started_at,
        last_activity_at
    ) 
    VALUES (
        p_chat_id, 
        p_stream_id, 
        'active',
        p_stream_config,
        now(),
        now()
    )
    RETURNING id INTO v_stream_record_id;
    
    RETURN v_stream_record_id;
END;
$$;

--
-- Function: get_active_stream_id(p_chat_id)
-- Description: Retrieves the most recent, active, non-expired stream ID for a chat.
--
CREATE OR REPLACE FUNCTION get_active_stream_id(p_chat_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stream_id text;
BEGIN
    -- Find the most recent, active, non-expired stream ID for the chat.
    -- The timeout (e.g., '1 hour') should align with application/SDK logic.
    SELECT stream_id 
    INTO v_stream_id
    FROM chat_stream_ids
    WHERE chat_id = p_chat_id
      AND status = 'active'
      AND last_activity_at > (now() - interval '1 hour') -- Example timeout
    ORDER BY started_at DESC
    LIMIT 1;

    RETURN v_stream_id;
END;
$$;

--
-- Function: complete_stream(p_stream_id)
-- Description: Marks a stream as completed.
--
CREATE OR REPLACE FUNCTION complete_stream(p_stream_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_stream_ids 
    SET 
        status = 'completed',
        completed_at = now(),
        last_activity_at = now()
    WHERE stream_id = p_stream_id;
    
    RETURN FOUND;
END;
$$;

--
-- Function: cancel_or_fail_stream(p_stream_id, p_final_status)
-- Description: Marks an active stream as 'cancelled' or 'failed'.
--
CREATE OR REPLACE FUNCTION cancel_or_fail_stream(
    p_stream_id text,
    p_final_status text DEFAULT 'cancelled' -- 'cancelled' or 'failed'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_stream_ids 
    SET 
        status = p_final_status,
        completed_at = now(),
        last_activity_at = now()
    WHERE stream_id = p_stream_id
    AND status = 'active';
    
    RETURN FOUND;
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

-- ================================================================================
-- Usage Examples
-- ================================================================================

--
-- Basic Chat Operations
--

-- Create a new chat session:
INSERT INTO chat_sessions (user_id, title, system_prompt)
VALUES (auth.uid(), 'My First Chat', 'You are a helpful assistant.');

-- Add messages to a session:
INSERT INTO chat_messages (session_id, user_id, role, parts)
VALUES 
('your-session-id', auth.uid(), 'user', '[{"type": "text", "text": "Hello!"}]'),
('your-session-id', auth.uid(), 'assistant', '[{"type": "text", "text": "Hi there!"}]');

-- Retrieve all messages in a session:
SELECT id, role, parts, model_used, created_at
FROM chat_messages
WHERE session_id = 'your-session-id'
ORDER BY created_at;


--
-- Message Regeneration
--

-- Regenerate an AI response by replacing its content and clearing subsequent messages:
SELECT regenerate_message_and_clear_after(
    'message-id-to-regenerate',
    '[{"type": "text", "text": "This is the new, regenerated response."}]'::jsonb,
    'gpt-4o',
    'openai'
);


--
-- Session Branching
--

-- Create a new conversation branch from an AI message:
SELECT branch_chat_session(
    'original-session-id', 
    'ai-message-id-to-branch-from', 
    'A New Direction'
);

-- Find all branches created from a specific session:
SELECT * FROM get_session_branches('your-session-id');

-- Trace the ancestry of a branched session:
SELECT * FROM get_branch_ancestry('your-branched-session-id');


-- ================================================================================
-- Redis Integration for Vercel AI SDK Resumable Streams
-- ================================================================================
--
-- Overview
--
-- This schema is designed to support the Vercel AI SDK's resumable streaming feature.
-- This feature relies on an external Redis instance to manage stream state (e.g.,
-- buffering and checkpoints), while this database schema is responsible for storing
-- the mapping between a chat session and its `stream_id`.
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
-- To enable resumability, the `experimental_resumeStream` function from the
-- Vercel AI SDK should be used instead of `streamText` or `streamObject` directly.
--
-- A typical server-side implementation flow is as follows:
--
-- 1. On a new chat request, check for an active `stream_id` for the given
--    chat session in the `chat_stream_ids` table. The `get_active_stream_id`
--    function can be used for this purpose.
--
-- 2. If an active stream ID exists, call `experimental_resumeStream({ streamId })`
--    to resume the stream.
--
-- 3. If no active stream exists, proceed with a standard `streamText` call. The
--    underlying library will generate a new `streamId`.
--
-- 4. This new `streamId` must be captured from the stream's result and stored in the
--    `chat_stream_ids` table. The `create_resumable_stream` function is provided
--    for this.
--
-- 5. When the stream completes, its status should be updated in the database using
--    the `complete_stream` or `cancel_or_fail_stream` functions.
--
-- This database schema provides the necessary tables and helper functions to
-- support this server-side logic.