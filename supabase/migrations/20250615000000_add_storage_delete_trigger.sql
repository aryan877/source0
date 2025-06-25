-- ================================================================================
-- Trigger for Cascading Deletes from Storage to generated_images
-- ================================================================================
--
-- This migration creates a trigger that automatically deletes a record
-- from the `public.generated_images` table whenever the corresponding file
-- is deleted from Supabase Storage.
--
-- This ensures data consistency and avoids orphaned records in the database
-- when a user deletes an uploaded attachment that was an AI-generated image.
--

--
-- Step 1: Create the trigger function
--
CREATE OR REPLACE FUNCTION public.delete_generated_image_on_storage_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
-- Important: `SECURITY DEFINER` allows the function to run with the privileges
-- of the user who defined it, not the user who invokes it. This is necessary
-- to have permission to delete from the `public.generated_images` table.
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deleted object is from the 'chat-attachments' bucket
    IF OLD.bucket_id = 'chat-attachments' THEN
        -- Delete the corresponding entry from the generated_images table
        DELETE FROM public.generated_images
        WHERE file_path = OLD.name;
    END IF;
    RETURN OLD;
END;
$$;

--
-- Step 2: Create the trigger on the storage.objects table
--
DROP TRIGGER IF EXISTS on_storage_object_delete ON storage.objects;
CREATE TRIGGER on_storage_object_delete
    -- Trigger AFTER the delete operation on storage.objects
    AFTER DELETE ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_generated_image_on_storage_delete(); 