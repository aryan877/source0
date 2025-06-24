-- ================================================================================
-- Table: model_usage_logs
-- Description: Stores logs of model usage, including token counts and other metrics.
-- ================================================================================
CREATE TABLE IF NOT EXISTS model_usage_logs (
    -- Primary Key
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and Session Association
    user_id                 uuid            NOT NULL 
                                           REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id              uuid            NOT NULL 
                                           REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Model Information
    model_id                text            NOT NULL,
    provider                text            NOT NULL,
    
    -- Usage Metrics
    prompt_tokens           integer         NOT NULL,
    completion_tokens       integer         NOT NULL,
    total_tokens            integer         NOT NULL,
    
    -- Timestamps
    created_at              timestamptz     DEFAULT now()
);

-- ================================================================================
-- Performance Indexes
-- ================================================================================
CREATE INDEX IF NOT EXISTS idx_model_usage_logs_user_id_created_at ON model_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_usage_logs_session_id 
    ON model_usage_logs(session_id);

-- ================================================================================
-- RLS Policies
-- ================================================================================

-- Enable RLS
ALTER TABLE model_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies for `model_usage_logs`
CREATE POLICY "users_can_access_own_usage_logs" 
    ON model_usage_logs FOR ALL
    TO authenticated
    USING (auth.uid() = user_id); 

-- ================================================================================
-- Function: get_usage_stats
-- Description: Calculates usage statistics for the currently authenticated user
--              with optional filters. This function is designed to be called via RPC.
-- ================================================================================
CREATE OR REPLACE FUNCTION get_usage_stats(
    start_date_filter text DEFAULT NULL,
    end_date_filter text DEFAULT NULL,
    provider_filter text DEFAULT NULL,
    model_id_filter text DEFAULT NULL
)
RETURNS TABLE (
    total_requests bigint,
    total_tokens bigint,
    total_prompt_tokens bigint,
    total_completion_tokens bigint
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        count(model_usage_logs.id) as total_requests,
        coalesce(sum(model_usage_logs.total_tokens), 0)::bigint as total_tokens,
        coalesce(sum(model_usage_logs.prompt_tokens), 0)::bigint as total_prompt_tokens,
        coalesce(sum(model_usage_logs.completion_tokens), 0)::bigint as total_completion_tokens
    FROM
        model_usage_logs
    WHERE
        user_id = auth.uid() AND
        (start_date_filter IS NULL OR created_at >= start_date_filter::timestamptz) AND
        (end_date_filter IS NULL OR created_at < (end_date_filter::date + interval '1 day')::timestamptz) AND
        (provider_filter IS NULL OR provider = provider_filter) AND
        (model_id_filter IS NULL OR model_id = model_id_filter);
END;
$$ LANGUAGE plpgsql; 