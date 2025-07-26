import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Image Service for Beautify AI App
 * Handles profile picture uploads and management
 */

// Configuration constants
const MAX_FILE_SIZE_MB = 5; // Maximum file size in MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const IMAGE_QUALITY = 0.8; // JPEG quality (0.1 - 1.0)
const MAX_DIMENSION = 400; // Maximum width/height in pixels

/**
 * Request permissions for camera and media library
 */
export const requestImagePermissions = async () => {
  try {
    // Request media library permissions
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    // Request camera permissions
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
    const response = await fetch(uri);
    const blob = await response.blob();
    const sizeInMB = blob.size / (1024 * 1024);
    
    return {
      isValid: blob.size <= MAX_FILE_SIZE_BYTES,
      sizeInMB: sizeInMB.toFixed(2),
      sizeInBytes: blob.size
    };
  } catch (error) {
    console.error('Error checking file size:', error);
    return { isValid: true, sizeInMB: 0, sizeInBytes: 0 }; // Allow if can't check
  }
};

/**
 * Pick image from gallery
 */
export const pickImageFromGallery = async () => {
  try {
    const permissions = await requestImagePermissions();
    if (!permissions.media) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: IMAGE_QUALITY,
    });

    if (!result.canceled && result.assets[0]) {
      // Check file size
      const sizeCheck = await checkFileSize(result.assets[0].uri);
      if (!sizeCheck.isValid) {
        throw new Error(`Image too large (${sizeCheck.sizeInMB}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      }
      
      return { success: true, data: result.assets[0] };
    }

    return { success: false, error: 'Image selection canceled' };
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Take photo with camera
 */
export const takePhotoWithCamera = async () => {
  try {
    const permissions = await requestImagePermissions();
    if (!permissions.camera) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: IMAGE_QUALITY,
    });

    if (!result.canceled && result.assets[0]) {
      // Check file size
      const sizeCheck = await checkFileSize(result.assets[0].uri);
      if (!sizeCheck.isValid) {
        throw new Error(`Image too large (${sizeCheck.sizeInMB}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      }
      
      return { success: true, data: result.assets[0] };
    }

    return { success: false, error: 'Photo capture canceled' };
  } catch (error) {
    console.error('Error taking photo with camera:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Compress and resize image for profile picture
 */
export const processProfileImage = async (imageUri) => {
  try {
    // First check original file size
    const originalSizeCheck = await checkFileSize(imageUri);
    console.log(`Original image size: ${originalSizeCheck.sizeInMB}MB`);

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: MAX_DIMENSION, height: MAX_DIMENSION } } // Resize to max dimensions
      ],
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Check final file size after processing
    const finalSizeCheck = await checkFileSize(manipulatedImage.uri);
    console.log(`Processed image size: ${finalSizeCheck.sizeInMB}MB`);

    // If still too large after processing, increase compression
    if (!finalSizeCheck.isValid) {
      console.log('Image still too large, applying higher compression...');
      const higherCompressed = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 300, height: 300 } } // Smaller size
        ],
        {
          compress: 0.5, // Higher compression
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const recompressedSizeCheck = await checkFileSize(higherCompressed.uri);
      if (!recompressedSizeCheck.isValid) {
        throw new Error(`Unable to compress image below ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller image.`);
      }

      return { success: true, data: higherCompressed };
    }

    return { success: true, data: manipulatedImage };
  } catch (error) {
    console.error('Error processing image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload image to Supabase Storage
 */
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    console.log('🔐 Checking authentication state...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth check failed:', authError.message);
      throw new Error('Authentication failed: ' + authError.message);
    }
    
    if (!authData.user) {
      console.log('❌ No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('✅ User authenticated:', authData.user.email);
    console.log('👤 Auth User ID:', authData.user.id);
    console.log('👤 Provided User ID:', userId);
    
    if (authData.user.id !== userId) {
      console.log('⚠️ User ID mismatch!');
      throw new Error('User ID mismatch - security violation');
    }

    // Process the image first
    const processResult = await processProfileImage(imageUri);
    if (!processResult.success) {
      throw new Error(processResult.error);
    }

    // Convert image to blob for upload
    console.log('📄 Converting image to blob...');
    const response = await fetch(processResult.data.uri);
    const blob = await response.blob();
    console.log('✅ Image converted to blob, size:', blob.size);

    // Create unique filename
    const fileExt = 'jpg';
    const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
    console.log('📁 Upload filename:', fileName);

    // Upload to Supabase Storage
    console.log('⬆️ Uploading to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.log('❌ Upload failed:', error.message);
      console.log('   Error code:', error.statusCode);
      console.log('   Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return { 
      success: true, 
      data: { 
        path: data.path, 
        url: urlData.publicUrl 
      } 
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete old profile image from storage
 */
export const deleteProfileImage = async (imagePath) => {
  try {
    if (!imagePath) return { success: true };

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([imagePath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete profile picture update process
 */
export const updateProfilePicture = async (imageUri, userId, currentImagePath = null) => {
  try {
    // Upload new image
    const uploadResult = await uploadProfileImage(imageUri, userId);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Delete old image if exists
    if (currentImagePath) {
      await deleteProfileImage(currentImagePath);
    }

    return uploadResult;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get human readable file size
 */
export const getFileSizeInfo = (sizeInBytes) => {
  const sizeInMB = sizeInBytes / (1024 * 1024);
  const sizeInKB = sizeInBytes / 1024;
  
  if (sizeInMB >= 1) {
    return `${sizeInMB.toFixed(2)} MB`;
  } else {
    return `${sizeInKB.toFixed(0)} KB`;
  }
};

/**
 * Validate image before upload
 */
export const validateImageForUpload = async (imageUri) => {
  try {
    const sizeCheck = await checkFileSize(imageUri);
    
    return {
      isValid: sizeCheck.isValid,
      size: getFileSizeInfo(sizeCheck.sizeInBytes),
      maxSize: `${MAX_FILE_SIZE_MB} MB`,
      error: !sizeCheck.isValid ? `Image is too large (${sizeCheck.sizeInMB}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.` : null
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Unable to validate image file'
    };
  }
};

/**
 * Show image picker options
 */
export const showImagePickerOptions = (onGallery, onCamera, onCancel) => {
  // This will be implemented in the component using Alert
  return {
    gallery: onGallery,
    camera: onCamera,
    cancel: onCancel
  };
}; 