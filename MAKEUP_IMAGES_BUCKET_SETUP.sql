-- ===== MAKEUP IMAGES BUCKET SETUP FOR SUPABASE =====
-- Run this SQL in your Supabase SQL Editor to create the makeup-images bucket
-- This bucket is used for temporary image storage during Stable Diffusion processing

-- Step 1: Create the bucket (run this in Supabase Dashboard > Storage > Create Bucket)
-- OR use this SQL if you have sufficient permissions:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'makeup-images',
  'makeup-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
*/

-- Step 2: Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Public read access to makeup images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload makeup images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own makeup images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own makeup images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list makeup images" ON storage.objects;

-- Step 3: Create RLS policies for the makeup-images bucket

-- Policy 1: Allow public read access (so Replicate can access the URLs)
CREATE POLICY "Public read access to makeup images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'makeup-images');

-- Policy 2: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload makeup images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'makeup-images');

-- Policy 3: Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update their own makeup images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'makeup-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 4: Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete their own makeup images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'makeup-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 5: Allow authenticated users to list makeup images
CREATE POLICY "Authenticated users can list makeup images" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'makeup-images');

-- ===== INSTRUCTIONS =====
-- 1. Go to your Supabase Dashboard: https://app.supabase.com/project/gbtozqgisxjdrjxubftq
-- 2. Navigate to Storage > Create bucket
-- 3. Create bucket with name: makeup-images
-- 4. Make it Public: Yes
-- 5. Set file size limit: 10MB
-- 6. Set allowed mime types: image/jpeg, image/png, image/webp
-- 7. Then run the SQL policies above in SQL Editor

-- ===== FOLDER STRUCTURE =====
-- Images will be organized as:
-- makeup-images/
--   └── [user-id]/
--       ├── makeup_1703123456789_abc123.jpg
--       ├── mask_1703123456790_def456.png
--       └── ...

-- ===== CLEANUP =====
-- The app includes automatic cleanup of old images (older than 24 hours)
-- to prevent storage accumulation 