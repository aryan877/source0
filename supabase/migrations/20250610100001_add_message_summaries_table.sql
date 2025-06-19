-- ================================================================================
-- Create Message Summaries Table
-- ================================================================================
--
-- This migration creates a new table, `message_summaries`, to store AI-generated
-- summaries of chat messages. This supports the Chat Navigator feature by keeping
-- summaries separate from the core message data.
--

CREATE TABLE IF NOT EXISTS message_summaries (
    -- Primary Key
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    message_id              text            NOT NULL UNIQUE
                                            REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id              uuid            NOT NULL
                                            REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id                 uuid            NOT NULL
                                            REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Summary Content
    summary                 text            NOT NULL,

    -- Timestamps
    created_at              timestamptz     DEFAULT now()
);

-- ================================================================================
-- Performance Indexes
-- ================================================================================

CREATE INDEX IF NOT EXISTS idx_message_summaries_session_id 
    ON message_summaries(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_message_summaries_message_id
    ON message_summaries(message_id);

-- ================================================================================
-- RLS Policies
-- ================================================================================

ALTER TABLE message_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can access summaries for sessions they own or that are public.
DROP POLICY IF EXISTS "authenticated_summary_access" ON message_summaries;
CREATE POLICY "authenticated_summary_access"
    ON message_summaries FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE id = message_summaries.session_id
            AND (chat_sessions.user_id = auth.uid() OR chat_sessions.is_public = true)
        )
    );

-- Policy: Anonymous users can view summaries for public sessions.
DROP POLICY IF EXISTS "anonymous_public_summary_view" ON message_summaries;
CREATE POLICY "anonymous_public_summary_view"
    ON message_summaries FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE id = message_summaries.session_id
            AND chat_sessions.is_public = true
        )
    ); 