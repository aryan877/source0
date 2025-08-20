-- ================================================================================
-- User API Keys Migration - Flexible Schema
-- Version 1.0
-- ================================================================================
--
-- This migration adds support for storing user API keys in the database instead
-- of localStorage, with model-level enabling/disabling functionality.
-- Design is intentionally lean and flexible to support future providers/models.
--

-- ================================================================================
-- Tables
-- ================================================================================

--
-- Table: user_api_keys
-- Description: Stores user API keys for different providers with model-level control
--
CREATE TABLE IF NOT EXISTS user_api_keys (
    -- Primary Key
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Association
    user_id             uuid            NOT NULL 
                                       REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Provider Information (flexible text field)
    provider            text            NOT NULL,
    
    -- Encrypted API Key
    api_key_encrypted   text            NOT NULL,
    
    
    -- Provider-level toggle
    is_enabled          boolean         NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at          timestamptz     DEFAULT now(),
    updated_at          timestamptz     DEFAULT now(),
    
    -- Unique constraint: one key per user per provider
    UNIQUE(user_id, provider)
);

--
-- Table: user_byok_settings
-- Description: Stores per-user BYOK settings (provider-level only)
--
CREATE TABLE IF NOT EXISTS user_byok_settings (
    -- Primary Key
    user_id             uuid            PRIMARY KEY 
                                       REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Global BYOK toggle
    global_byok_enabled boolean         NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at          timestamptz     DEFAULT now(),
    updated_at          timestamptz     DEFAULT now()
);

-- ================================================================================
-- Indexes
-- ================================================================================

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enabled ON user_api_keys(user_id, is_enabled) WHERE is_enabled = true;

-- ================================================================================
-- RLS Security Policies
-- ================================================================================

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_byok_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_api_keys" ON user_api_keys;
CREATE POLICY "users_own_api_keys" ON user_api_keys FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_byok_settings" ON user_byok_settings;
CREATE POLICY "users_own_byok_settings" ON user_byok_settings FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ================================================================================
-- Functions
-- ================================================================================

-- Apply triggers to update updated_at columns
DROP TRIGGER IF EXISTS trigger_update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER trigger_update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_byok_settings_updated_at ON user_byok_settings;
CREATE TRIGGER trigger_update_user_byok_settings_updated_at
    BEFORE UPDATE ON user_byok_settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

--
-- Function: get_user_api_key(p_user_id, p_provider)
-- Description: Safely retrieves a user's API key for a provider
--
CREATE OR REPLACE FUNCTION get_user_api_key(
    p_user_id uuid,
    p_provider text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_encrypted_key text;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT api_key_encrypted INTO v_encrypted_key
    FROM user_api_keys
    WHERE user_id = p_user_id 
    AND provider = p_provider 
    AND is_enabled = true;

    RETURN v_encrypted_key;
END;
$$;

--
-- Function: is_model_enabled_for_user(p_user_id, p_model_id, p_provider)
-- Description: Checks if a specific model is enabled for a user's BYOK (provider-level only)
--
CREATE OR REPLACE FUNCTION is_model_enabled_for_user(
    p_user_id uuid,
    p_model_id text,
    p_provider text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_global_enabled boolean DEFAULT false;
    v_provider_enabled boolean DEFAULT false;
BEGIN
    -- Get global BYOK setting
    SELECT global_byok_enabled INTO v_global_enabled
    FROM user_byok_settings
    WHERE user_id = p_user_id;

    IF v_global_enabled IS NULL OR v_global_enabled = false THEN
        RETURN false;
    END IF;

    -- Check provider status (all models enabled by default if provider is enabled)
    SELECT is_enabled INTO v_provider_enabled
    FROM user_api_keys
    WHERE user_id = p_user_id 
    AND provider = p_provider;

    RETURN COALESCE(v_provider_enabled, false);
END;
$$;