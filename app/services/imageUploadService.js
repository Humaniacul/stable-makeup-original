/**
 * COMPLETELY REWRITTEN - Simple Base64 Upload Service
 * Converts local files to base64, then uploads to get HTTP/HTTPS URLs
 */

import { supabase } from '../config/supabase';

class ImageUploadService {
  constructor() {
    this.bucketName = 'makeup-images';
  }

  /**
   * Convert local file to base64 then upload - GUARANTEED HTTP/HTTPS URL
   */
  async uploadImageForReplicate(imageUri, filename = null) {
    try {
      console.log('📤 🚀 BASE64 UPLOAD SERVICE ACTIVE 🚀');
      console.log('🔗 Converting local file to base64...');
      
      // Get user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Generate filename
      if (!filename) {
        const timestamp = Date.now();
        filename = `${user.id}/makeup_${timestamp}.jpg`;
      }

      // Convert to base64 first
      const base64Response = await fetch(imageUri);
      const blob = await base64Response.blob();
      
      console.log('✅ Converted to blob, size:', blob.size);

      // Upload blob to Supabase
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // BUILD HTTP/HTTPS URL DIRECTLY
      const publicUrl = `https://gbtozqgisxjdrjxubftq.supabase.co/storage/v1/object/public/${this.bucketName}/${filename}`;
      
      console.log('✅ UPLOAD SUCCESS - HTTP/HTTPS URL:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('💥 Base64 upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload mask the same way
   */
  async uploadMaskForReplicate(maskData, filename = null) {
    try {
      console.log('🎭 🚀 BASE64 MASK UPLOAD SERVICE ACTIVE 🚀');
      
      // Get user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Generate filename
      if (!filename) {
        const timestamp = Date.now();
        filename = `${user.id}/mask_${timestamp}.png`;
      }

      // Convert to base64 first
      const base64Response = await fetch(maskData);
      const blob = await base64Response.blob();

      // Upload blob to Supabase
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;

      // BUILD HTTP/HTTPS URL DIRECTLY
      const publicUrl = `https://gbtozqgisxjdrjxubftq.supabase.co/storage/v1/object/public/${this.bucketName}/${filename}`;
      
      console.log('✅ MASK UPLOAD SUCCESS - HTTP/HTTPS URL:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('💥 Mask upload failed:', error);
      throw error;
    }
  }

  // Keep other methods for compatibility
  async initializeBucket() {
    return true;
  }

  async testAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    return { authenticated: !!user, user };
  }
}

// Force refresh - export fresh instance
export default new ImageUploadService(); 