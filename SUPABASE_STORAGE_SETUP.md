# Supabase Storage Setup for Profile Images

Follow these steps to set up image storage for your Beautify app:

## 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com/project/gbtozqgisxjdrjxubftq
2. Navigate to **Storage** in the left sidebar
3. Click **Create bucket**
4. Name the bucket: `profile-images`
5. Make it **Public** (for easy URL access)
6. Click **Create bucket**

## 2. Set Up Storage Policies

In the Storage section, go to **Policies** and add these policies for the `profile-images` bucket:

### Policy 1: Allow Public Read Access
```sql
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
```

### Policy 2: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Users can upload their own profile images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow Users to Update Their Own Images
```sql
CREATE POLICY "Users can update their own profile images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Allow Users to Delete Their Own Images
```sql
CREATE POLICY "Users can delete their own profile images" ON storage.objects FOR DELETE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 3. CORS Configuration (if needed)

If you encounter CORS issues, add these origins in **Settings > API**:
- `http://localhost:19006` (for Expo web)
- `http://localhost:8081` (for Expo dev)
- Your production domain when deployed

## 4. Test the Setup

After completing the setup:
1. Run your app
2. Go to the Profile screen
3. Tap on the profile image with camera icon
4. Select "Gallery" or "Camera"
5. Choose an image and confirm upload
6. The image should upload and display immediately

## 5. Verify in Supabase

Check the Storage section in your Supabase dashboard to see uploaded images under:
`profile-images/user-123/profile-[timestamp].jpg`

## File Structure

Images are organized as:
```
profile-images/
  └── user-123/
      ├── profile-1703123456789.jpg
      └── profile-1703123456790.jpg
```

This keeps each user's images in their own folder for better organization and security.

## 6. Configure File Size Limits (Optional)

In your Supabase dashboard, go to **Settings > Storage** and configure:
- **Max file size**: 10MB (recommended for profile images)
- **Max files per bucket**: 1000 (or adjust based on expected user count)

## Notes

- **File size limit**: 5MB maximum per image (configurable in the app)
- Images are automatically resized to 400x400px for consistency
- JPEG format is used for optimal compression at 80% quality
- If an image is still too large after compression, it's automatically re-compressed at smaller dimensions
- Old profile images are automatically deleted when new ones are uploaded
- The app gracefully handles permission requests for camera and gallery access
- File size validation happens before upload to save bandwidth
- Users get clear error messages if images are too large 