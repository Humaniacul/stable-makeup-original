# Authentication & Storage Setup for Beautify App

## 🔐 **Step 1: Enable Authentication in Supabase**

1. Go to your Supabase dashboard: https://app.supabase.com/project/gbtozqgisxjdrjxubftq
2. Navigate to **Authentication** in the left sidebar
3. Go to **Settings** tab
4. Make sure **Enable email confirmations** is turned ON (recommended)
5. **Site URL**: Set to your app's URL (for now, use `http://localhost:19006`)

## 🗂️ **Step 2: Create Storage Bucket (if not done)**

1. Go to **Storage** in left sidebar
2. Click **"Create bucket"**
3. Name: `profile-images`
4. Make it **Public**
5. Click **Create bucket**

## 🔒 **Step 3: Add Proper Storage Policies**

Go to **Storage > Policies** and add these policies:

### **Policy 1: Allow authenticated users to see buckets**
```sql
CREATE POLICY "Authenticated users can list buckets" ON storage.buckets FOR SELECT TO authenticated USING (true);
```

### **Policy 2: Allow public read access to profile images**
```sql
CREATE POLICY "Public read access to profile images" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
```

### **Policy 3: Allow authenticated users to upload their own images**
```sql
CREATE POLICY "Users can upload their own profile images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### **Policy 4: Allow authenticated users to update their own images**
```sql
CREATE POLICY "Users can update their own profile images" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### **Policy 5: Allow authenticated users to delete their own images**
```sql
CREATE POLICY "Users can delete their own profile images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 📱 **Step 4: Test the Complete Flow**

1. **Reload your app** (press `r` in Expo terminal)
2. **You should see the Auth screen** since no user is logged in
3. **Create an account:**
   - Enter your email, password, and full name
   - Click "Create Account"
   - Check your email for verification (if enabled)
4. **Sign in** with your credentials
5. **You should now see the Home screen** with your name
6. **Go to Profile screen** and test uploading a profile picture
7. **Sign out** to test the flow

## 🎯 **How Authentication Works Now:**

### **App Flow:**
- **No user logged in** → Shows Auth screen
- **User logged in** → Shows main app (Home, Profile, etc.)
- **Sign out** → Returns to Auth screen

### **Profile Pictures:**
- **Only authenticated users** can upload images
- **Images are stored** in user-specific folders: `user-id/profile-timestamp.jpg`
- **Public read access** so profile images display everywhere
- **Private upload/edit/delete** so users can only manage their own images

### **User Data:**
- **Authentication** handled by Supabase Auth
- **User profiles** stored in your `users` table
- **Real user IDs** from auth system (no more mock `user-123`)

## 🚀 **Benefits of This Setup:**

✅ **Secure** - Users can only manage their own images  
✅ **Scalable** - Each user has their own folder  
✅ **Real authentication** - Proper sign up/in/out flow  
✅ **Email verification** - Optional but recommended  
✅ **Profile management** - Real user data and profiles  
✅ **Beautiful UI** - Polished auth screens matching your app design  

## 🔧 **Next Steps:**

After authentication works:
1. **Switch back to full image service** (with compression)
2. **Remove debug/test files**
3. **Add password reset functionality** 
4. **Add social login** (Google, Apple) if desired
5. **Test on real devices**

Your app now has proper authentication and secure profile picture uploads! 🎉 