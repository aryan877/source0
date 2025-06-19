-- ================================================================================
-- User Profiles and Onboarding
-- ================================================================================
--
-- This migration introduces a `user_profiles` table to store user-specific
-- settings and track onboarding status. It also includes a trigger to
-- automatically create a profile for new users upon sign-up.
--

-- ================================================================================
-- Table: user_profiles
-- Description: Stores additional information for users, such as onboarding status.
-- ================================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    -- Primary Key
    id                      uuid            PRIMARY KEY,
    
    -- Onboarding Status
    has_completed_onboarding boolean        DEFAULT false,
    
    -- Timestamps
    created_at              timestamptz     DEFAULT now(),
    updated_at              timestamptz     DEFAULT now(),

    -- Constraints
    CONSTRAINT fk_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on the user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

--
-- RLS Policies for `user_profiles`
--
-- Policy: Users can only see their own profile.
DROP POLICY IF EXISTS "users_can_select_own_profile" ON user_profiles;
CREATE POLICY "users_can_select_own_profile" 
    ON user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Users can update their own profile.
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
CREATE POLICY "users_can_update_own_profile" 
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile.
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
CREATE POLICY "users_can_insert_own_profile"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);


-- ================================================================================
-- Utility Functions and Triggers
-- ================================================================================

--
-- Function: handle_new_user()
-- Description: A trigger function that automatically creates a profile for a new user.
--
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

--
-- Trigger: on_auth_user_created
-- Description: Executes the `handle_new_user` function after a new user is created.
--
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Apply the updated_at trigger to user_profiles
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 