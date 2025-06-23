-- ================================================================================
-- Table: mcp_servers
-- Description: Stores configuration for Model Context Protocol (MCP) servers.
-- ================================================================================
CREATE TABLE IF NOT EXISTS mcp_servers (
    -- Primary Key
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Association
    user_id                 uuid            NOT NULL 
                                           REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    name                    text            NOT NULL,
    url                     text            NOT NULL,
    transport               text            NOT NULL CHECK (transport IN ('http', 'sse')),
    is_active               boolean         DEFAULT true,
    
    -- Timestamps
    created_at              timestamptz     DEFAULT now(),
    updated_at              timestamptz     DEFAULT now()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_mcp_servers_updated_at ON mcp_servers;
CREATE TRIGGER trigger_update_mcp_servers_updated_at
    BEFORE UPDATE ON mcp_servers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================================
-- Table: mcp_server_headers
-- Description: Stores HTTP headers for MCP servers.
-- ================================================================================
CREATE TABLE IF NOT EXISTS mcp_server_headers (
    -- Primary Key
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Association
    server_id               uuid            NOT NULL 
                                           REFERENCES mcp_servers(id) ON DELETE CASCADE,
    user_id                 uuid            NOT NULL 
                                           REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Header Content
    key                     text            NOT NULL,
    value                   text            NOT NULL,
    
    -- Timestamps
    created_at              timestamptz     DEFAULT now()
);

-- ================================================================================
-- Performance Indexes
-- ================================================================================
CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_id 
    ON mcp_servers(user_id);

CREATE INDEX IF NOT EXISTS idx_mcp_server_headers_server_id 
    ON mcp_server_headers(server_id);

CREATE INDEX IF NOT EXISTS idx_mcp_server_headers_user_id 
    ON mcp_server_headers(user_id);

-- ================================================================================
-- RLS Policies
-- ================================================================================

-- Enable RLS
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_headers ENABLE ROW LEVEL SECURITY;

-- Policies for `mcp_servers`
DROP POLICY IF EXISTS "users_can_access_own_mcp_servers" ON mcp_servers;
CREATE POLICY "users_can_access_own_mcp_servers" 
    ON mcp_servers FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- Policies for `mcp_server_headers`
DROP POLICY IF EXISTS "users_can_access_own_mcp_headers" ON mcp_server_headers;
CREATE POLICY "users_can_access_own_mcp_headers" 
    ON mcp_server_headers FOR ALL
    TO authenticated
    USING (auth.uid() = user_id); 