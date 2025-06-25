CREATE TABLE IF NOT EXISTS generated_images (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id      uuid            NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id      text            NOT NULL,
    prompt          text            NOT NULL,
    file_path       text            NOT NULL UNIQUE,
    created_at      timestamptz     DEFAULT now(),
    CONSTRAINT fk_message
        FOREIGN KEY(message_id) 
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id, created_at DESC);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated images"
ON generated_images FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated images"
ON generated_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id); 