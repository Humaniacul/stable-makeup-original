/**
 * Stable-Makeup Service  
 * Direct makeup transfer using specialized Stable-Makeup model
 * Replaces complex MediaPipe + ChatGPT + Stable Diffusion pipeline
 */

import flyBackendService from './flyBackendService';

class MakeupService {
  
  async transferMakeup(sourceImage, referenceImage, intensity = 0.8) {
    try {
      console.log('🎨 Starting makeup transfer...');
      
      // Call the backend directly for Stable-Makeup
      const result = await flyBackendService.transferMakeup({
        source_image_base64: sourceImage,
        reference_image_base64: referenceImage,
        makeup_intensity: intensity
      });
      
      console.log('✅ Makeup transfer completed');
      return {
        success: true,
        imageUrl: result.output_image_url,
        processingTime: result.processing_time || 'Unknown'
      };
      
    } catch (error) {
      console.error('❌ Makeup transfer failed:', error);
      throw new Error(`Makeup transfer failed: ${error.message}`);
    }
  }

  // Legacy method for backward compatibility
  async analyzeMakeup(imageBase64, prompt) {
    console.log('🔄 Legacy analyzeMakeup called, redirecting to transferMakeup...');
    
    // For now, use a default reference image until user selects one
    const defaultReference = null; // User must provide reference image
    
    return await this.transferMakeup(imageBase64, defaultReference);
  }
}

export default new MakeupService(); 