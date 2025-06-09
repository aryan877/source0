-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

/*
================================================================================
                           CHAT APP DATABASE SCHEMA
================================================================================

                                auth.users (Supabase Auth)
                                     |
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌───────────────┐ ┌──────────────┐ ┌─────────────────┐
            │chat_sessions  │ │chat_messages │ │  user_memories  │
            │               │ │              │ │                 │
            │• id (PK)      │ │• id (PK)     │ │• id (PK)        │
            │• user_id (FK) │ │• session_id  │ │• user_id (FK)   │
            │• title        │ │• user_id (FK)│ │• memory_text    │
            │• model_*      │ │• parent_id   │ │• embedding      │
            │• is_public    │ │• role        │ │• importance     │
            │• share_slug   │ │• content     │ └─────────────────┘
            └───────┬───────┘ │• model_used  │          │
                    │         │• branch_name │          │
                    │         └──────┬───────┘          │
                    │                │                  │
                    │                ▼                  │
                    │         ┌─────────────────┐       │
                    │         │chat_stream_ids  │       │
                    │         │                 │       │
                    │         │• id (PK)        │       │
                    │         │• chat_id (FK)   │       │
                    │         │• stream_id      │       │
                    │         └─────────────────┘       │
                    │                                    │
                    └────────────────┐                  │
                                     │                  │
                    ┌────────────────┼──────────────────┘
                    │                │
                    ▼                ▼
        ┌───────────────────┐ ┌─────────────────┐
        │web_search_results │ │generated_images │
        │                   │ │                 │
        │• id (PK)          │ │• id (PK)        │
        │• message_id (FK)  │ │• message_id (FK)│
        │• query            │ │• user_id (FK)   │
        │• title/url        │ │• prompt         │
        │• snippet          │ │• image_url      │
        └───────────────────┘ └─────────────────┘

RELATIONSHIPS:
- chat_sessions ──(1:many)──> chat_messages
- chat_messages ──(self-ref)──> chat_messages (parent_id for branching)
- chat_sessions ──(1:many)──> chat_stream_ids (for AI SDK resumable streams)
- chat_messages ──(1:many)──> web_search_results
- chat_messages ──(1:many)──> generated_images
- auth.users ──(1:many)──> chat_sessions
- auth.users ──(1:many)──> chat_messages
- auth.users ──(1:many)──> user_memories
- auth.users ──(1:many)──> generated_images

FEATURES:
✓ Branching conversations (parent_id in messages)
✓ Public sharing (is_public, share_slug)
✓ RAG with vector embeddings (user_memories)
✓ Web search integration
✓ AI image generation
✓ Resumable streaming (chat_stream_ids for AI SDK)
✓ Row Level Security on all tables

================================================================================
*/

-- Chat Sessions
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  model_provider text NOT NULL DEFAULT 'openai',
  model_name text NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT false,
  share_slug text UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Messages with branching support
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES chat_messages(id),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  model_used text,
  branch_name text,
  is_active_branch boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 🚨 CRITICAL: Stream IDs for resumable streams (AI SDK requirement)
CREATE TABLE chat_stream_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  stream_id text NOT NULL, -- AI SDK generates these
  created_at timestamptz DEFAULT now()
);

-- User memories (ChatGPT-style RAG)
CREATE TABLE user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_text text NOT NULL,
  source_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  importance_score float DEFAULT 1.0,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Web search results
CREATE TABLE web_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  query text NOT NULL,
  title text,
  url text,
  snippet text,
  search_rank integer,
  created_at timestamptz DEFAULT now()
);

-- Generated images
CREATE TABLE generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text NOT NULL,
  model_used text,
  generation_params jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Essential indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_parent_id ON chat_messages(parent_id) WHERE parent_id IS NOT NULL;

-- 🚨 CRITICAL: For resumable streams
CREATE INDEX idx_chat_stream_ids_chat_id ON chat_stream_ids(chat_id);
CREATE INDEX idx_chat_stream_ids_created_at ON chat_stream_ids(created_at DESC);

-- For memories/RAG
CREATE INDEX idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX ON user_memories USING ivfflat (embedding vector_cosine_ops);

-- Other indexes
CREATE INDEX idx_web_search_message_id ON web_search_results(message_id);
CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);

-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_stream_ids ENABLE ROW LEVEL SECURITY;

-- Sessions: own + public
CREATE POLICY "session_access" ON chat_sessions FOR ALL
USING (auth.uid() = user_id OR is_public = true);

-- Messages: follow session permissions
CREATE POLICY "message_access" ON chat_messages FOR ALL
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND is_public = true)
);

-- Memories: private only
CREATE POLICY "memory_access" ON user_memories FOR ALL
USING (auth.uid() = user_id);

-- Web search: follow message permissions
CREATE POLICY "search_access" ON web_search_results FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE id = message_id AND (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND is_public = true)
    )
  )
);

-- Images: follow message permissions
CREATE POLICY "image_access" ON generated_images FOR ALL
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE id = message_id AND 
    EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND is_public = true)
  )
);

-- Stream IDs: private only
CREATE POLICY "stream_access" ON chat_stream_ids FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE id = chat_id AND user_id = auth.uid()
  )
);

-- Function to append stream ID (called from your API route)
CREATE OR REPLACE FUNCTION append_stream_id(p_chat_id uuid, p_stream_id text)
RETURNS void AS $$
BEGIN
  INSERT INTO chat_stream_ids (chat_id, stream_id)
  VALUES (p_chat_id, p_stream_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to load stream IDs (called from GET /api/chat)
CREATE OR REPLACE FUNCTION load_streams(p_chat_id uuid)
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT stream_id 
    FROM chat_stream_ids 
    WHERE chat_id = p_chat_id 
    ORDER BY created_at ASC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
