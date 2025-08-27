import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';

/**
 * Simplified Image Service for Testing
 * Basic upload without manipulation
 */

// Configuration constants
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Request permissions for camera and media library
 */
export const requestImagePermissions = async () => {
  try {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    return {
      media: mediaStatus === 'granted',
      camera: cameraStatus === 'granted'
    };
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return { media: false, camera: false };
  }
};

/**
 * Check file size
 */
const checkFileSize = async (uri) => {
  try {
    console.log('🔍 Checking file size for:', uri);
    const response = await fetch(uri);
    const blob = await response.blob();
    const sizeInMB = blob.size / (1024 * 1024);
    
    console.log(`📊 File size: ${sizeInMB.toFixed(2)}MB (${blob.size} bytes)`);
    
    return {
      isValid: blob.size <= MAX_FILE_SIZE_BYTES,
      sizeInMB: sizeInMB.toFixed(2),
      sizeInBytes: blob.size
    };
  } catch (error) {
    console.error('❌ Error checking file size:', error);
    return { isValid: true, sizeInMB: 0, sizeInBytes: 0 };
  }
};

/**
 * Pick image from gallery
 */
export const pickImageFromGallery = async () => {
  try {
    console.log('📷 Launching image picker...');
    const permissions = await requestImagePermissions();
    if (!permissions.media) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('✅ Image selected:', result.assets[0].uri);
      const sizeCheck = await checkFileSize(result.assets[0].uri);
      if (!sizeCheck.isValid) {
        throw new Error(`Image too large (${sizeCheck.sizeInMB}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      }
      
      return { success: true, data: result.assets[0] };
    }

    return { success: false, error: 'Image selection canceled' };
  } catch (error) {
    console.error('❌ Error picking image from gallery:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Take photo with camera
 */
export const takePhotoWithCamera = async () => {
  try {
    console.log('📸 Launching camera...');
    const permissions = await requestImagePermissions();
    if (!permissions.camera) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('✅ Photo taken:', result.assets[0].uri);
      const sizeCheck = await checkFileSize(result.assets[0].uri);
      if (!sizeCheck.isValid) {
        throw new Error(`Image too large (${sizeCheck.sizeInMB}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      }
      
      return { success: true, data: result.assets[0] };
    }

    return { success: false, error: 'Photo capture canceled' };
  } catch (error) {
    console.error('❌ Error taking photo with camera:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test network connectivity
 */
const testNetworkConnectivity = async () => {
  try {
    console.log('🌐 Testing network connectivity...');
    
    // Test basic internet connection
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      timeout: 10000 // 10 second timeout
    });
    
    if (response.ok) {
      console.log('✅ Internet connection is working');
      return { connected: true };
    } else {
      console.warn('⚠️ Internet connection issues');
      return { connected: false, error: 'HTTP error: ' + response.status };
    }
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
    return { connected: false, error: error.message };
  }
};

/**
 * Upload image to Supabase Storage (without manipulation)
 */
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    console.log('🚀 Starting profile picture upload...');
    
    // Check authentication state first
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      throw new Error('Authentication failed: ' + authError.message);
    }
    
    if (!authData.user) {
      console.log('❌ No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    if (authData.user.id !== userId) {
      console.log('⚠️ User ID mismatch!');
      throw new Error('User ID mismatch - security violation');
    }
    
    console.log('✅ User authenticated:', authData.user.email);
    
    // Quick connectivity check
    console.log('🌐 Verifying network connectivity...');
    const networkTest = await testNetworkConnectivity();
    if (!networkTest.connected) {
      throw new Error(`Network connectivity issue: ${networkTest.error}`);
    }
    
    // Convert image to blob for upload
    console.log('📄 Converting image to blob...');
    let response, blob;
    try {
      response = await fetch(imageUri);
      blob = await response.blob();
      console.log('✅ Image converted to blob, size:', blob.size);
    } catch (fetchError) {
      console.error('❌ Failed to fetch image:', fetchError);
      throw new Error(`Failed to process image: ${fetchError.message}`);
    }

    // React Native doesn't support blob.arrayBuffer(), skip this conversion
    console.log('📱 Using blob directly (React Native compatible)');

    // Create unique filename
    const fileExt = 'jpg';
    const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
    console.log('📁 Upload filename:', fileName);

    // Test storage bucket access first
    console.log('🗂️ Testing storage bucket access...');
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.log('❌ Cannot list buckets:', bucketError.message);
        throw new Error('Storage bucket access failed: ' + bucketError.message);
      }
      
      const profileBucket = buckets.find(b => b.name === 'profile-images');
      if (!profileBucket) {
        console.log('❌ profile-images bucket not found in:', buckets.map(b => b.name));
        throw new Error('profile-images bucket does not exist');
      }
      console.log('✅ profile-images bucket found and accessible');
    } catch (bucketTestError) {
      console.log('❌ Bucket test failed:', bucketTestError.message);
      throw new Error('Storage bucket test failed: ' + bucketTestError.message);
    }

    // Upload directly to Supabase Storage using fetch (React Native compatible)
    console.log('⬆️ Uploading to Supabase Storage...', `(${blob.size} bytes)`);
    
    try {
      // Use direct fetch upload (more reliable in React Native)
      const directUploadUrl = `https://gbtozqgisxjdrjxubftq.supabase.co/storage/v1/object/profile-images/${fileName}`;
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('No authentication token available');
      }
      
      const directResponse = await fetch(directUploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'image/jpeg',
        },
        body: blob
      });
      
      if (directResponse.ok) {
        console.log('✅ Upload successful!');
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);
        
        return { 
          success: true, 
          data: { 
            path: fileName, 
            url: urlData.publicUrl 
          } 
        };
      } else {
        const errorText = await directResponse.text();
        console.error('❌ Upload failed:', directResponse.status, directResponse.statusText);
        console.error('   Error details:', errorText);
        throw new Error(`Upload failed: ${directResponse.status} ${directResponse.statusText}`);
      }
    } catch (uploadError) {
      console.error('❌ Upload error:', uploadError.message);
      throw new Error('Upload failed: ' + uploadError.message);
    }

    // This code is no longer reached since we return directly from the try block above
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        imageUri,
        userId
      }
    };
  }
};

/**
 * Delete old profile image from storage
 */
export const deleteProfileImage = async (imagePath) => {
  try {
    if (!imagePath) return { success: true };

    console.log('🗑️ Deleting old image:', imagePath);
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([imagePath]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }
    
    console.log('✅ Old image deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete profile picture update process
 */
export const updateProfilePicture = async (imageUri, userId, currentImagePath = null) => {
  try {
    console.log('🔄 Starting profile picture update process...');
    console.log('📋 Process details:');
    console.log('  - Image URI:', imageUri);
    console.log('  - User ID:', userId);
    console.log('  - Current image path:', currentImagePath);
    
    // Upload new image
    const uploadResult = await uploadProfileImage(imageUri, userId);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Delete old image if exists
    if (currentImagePath) {
      console.log('🧹 Cleaning up old image...');
      const deleteResult = await deleteProfileImage(currentImagePath);
      if (!deleteResult.success) {
        console.warn('⚠️ Failed to delete old image, but continuing...', deleteResult.error);
      }
    }

    console.log('✅ Profile picture update completed successfully');
    return uploadResult;
  } catch (error) {
    console.error('❌ Profile picture update failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        imageUri,
        userId,
        currentImagePath
      }
    };
  }
}; 