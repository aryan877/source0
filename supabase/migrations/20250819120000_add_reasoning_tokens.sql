-- ================================================================================
-- Add reasoning_tokens column to model_usage_logs table
-- Description: Adds support for tracking reasoning tokens in model usage logs
-- ================================================================================

-- Add reasoning_tokens column
ALTER TABLE model_usage_logs 
ADD COLUMN IF NOT EXISTS reasoning_tokens integer DEFAULT 0;

-- Drop the existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_usage_stats(text, text, text, text);

-- Update the get_usage_stats function to include reasoning tokens
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
    total_completion_tokens bigint,
    total_reasoning_tokens bigint
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        count(model_usage_logs.id) as total_requests,
        coalesce(sum(model_usage_logs.total_tokens), 0)::bigint as total_tokens,
        coalesce(sum(model_usage_logs.prompt_tokens), 0)::bigint as total_prompt_tokens,
        coalesce(sum(model_usage_logs.completion_tokens), 0)::bigint as total_completion_tokens,
        coalesce(sum(model_usage_logs.reasoning_tokens), 0)::bigint as total_reasoning_tokens
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