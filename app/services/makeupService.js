/**
 * Stable-Makeup Service  
 * Direct makeup transfer using specialized Stable-Makeup model
 * Replaces complex MediaPipe + ChatGPT + Stable Diffusion pipeline
 */

import flyBackendService from './flyBackendService';

// Debug configuration
const DEBUG_CONFIG = {
  VERBOSE_LOGGING: true,
  TEST_BACKEND_FIRST: true,
};

// Example reference makeup images (you can expand this)
const defaultReferenceImages = [
  {
    id: 1,
    name: "Natural Glow",
    description: "Soft, natural makeup with dewy finish",
    url: "https://images.unsplash.com/photo-1594736797933-d0b22854cc96?w=512&h=512&fit=crop",
    style: "natural"
  },
  {
    id: 2,
    name: "Glamorous Evening",
    description: "Bold, dramatic look for special occasions",
    url: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=512&h=512&fit=crop",
    style: "glamorous"
  },
  {
    id: 3,
    name: "Korean Beauty",
    description: "Fresh, youthful K-beauty inspired look", 
    url: "https://images.unsplash.com/photo-1594824166379-905ad6aed2ab?w=512&h=512&fit=crop",
    style: "korean"
  },
  {
    id: 4,
    name: "Vintage Glam", 
    description: "Classic Hollywood glamour",
    url: "https://images.unsplash.com/photo-1580370873254-e2696ff9666c?w=512&h=512&fit=crop",
    style: "vintage"
  }
];

/**
 * Transfer makeup using Stable-Makeup model
 * @param {string} sourceImageUri - The source image (person to apply makeup to)
 * @param {string} referenceImageUri - The reference image (makeup style to transfer)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Makeup transfer results
 */
export const transferMakeup = async (sourceImageUri, referenceImageUri, options = {}) => {
  try {
    console.log('🎨 Starting Stable-Makeup transfer...');
    console.log('📸 Source image:', sourceImageUri);
    console.log('🎨 Reference image:', referenceImageUri);

    // Check authentication (required for image processing)
    console.log('🔐 Checking user authentication...');
    const { supabase } = await import('../config/supabase');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('💥 Authentication error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error('💥 No authenticated user found');
      throw new Error('Please sign in to use makeup features. Authentication is required to process images.');
    }
    
    console.log('✅ User authenticated:', user.email);

    // Call the new simplified backend endpoint
    console.log('📡 Calling Stable-Makeup API...');
    const backendResult = await flyBackendService.transferMakeup({
      source_image_uri: sourceImageUri,
      reference_image_uri: referenceImageUri,
      makeup_intensity: options.intensity || 0.8,
      guidance_scale: options.guidance_scale || 7.5, 
      num_inference_steps: options.num_inference_steps || 50
    });

    if (!backendResult.success) {
      throw new Error(`Makeup transfer failed: ${backendResult.error}`);
    }

    console.log('✅ Stable-Makeup transfer complete!');

    const result = {
      success: true,
      data: {
        // User input
        sourceImage: sourceImageUri,
        referenceImage: referenceImageUri,
        
        // Result
        resultImage: backendResult.data.result_image_url,
        
        // Processing details
        processingTime: backendResult.data.processing_time,
        predictionId: backendResult.data.prediction_id,
        model: "Stable-Makeup",
        
        // Options used
        makeupIntensity: options.intensity || 0.8,
        guidanceScale: options.guidance_scale || 7.5,
        inferenceSteps: options.num_inference_steps || 50,
        
        // Technical details
        backend: 'stable-makeup',
        timestamp: Date.now()
      }
    };

    console.log('📊 Makeup transfer result:', {
      success: result.success,
      hasResultImage: !!result.data.resultImage,
      model: result.data.model,
      processingTime: result.data.processingTime
    });

    return result;

  } catch (error) {
    console.error('💥 Makeup transfer failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Legacy function for backwards compatibility
 * @param {string} imageUri - The source image
 * @param {string} userPrompt - User's makeup request (will be matched to reference image)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Makeup results
 */
export const analyzeMakeup = async (imageUri, userPrompt = "natural everyday makeup", options = {}) => {
  try {
    console.log('⚠️ Legacy analyzeMakeup called - converting to Stable-Makeup transfer');
    console.log('📸 Source image:', imageUri);
    console.log('💬 User prompt:', userPrompt);
  
    // Match user prompt to reference image
    const referenceImage = matchPromptToReference(userPrompt);
    console.log('🎨 Matched reference image:', referenceImage.name);
  
    // Call new transfer function
    const result = await transferMakeup(imageUri, referenceImage.url, options);

    if (!result.success) {
      return result;
    }

    // Convert to legacy format for backwards compatibility
  return {
    success: true,
    data: {
        // Legacy fields
        userPrompt: userPrompt,
        originalImage: imageUri,
        processedImage: result.data.resultImage,
        hasMakeupApplied: true,
        
        // Simulated legacy fields for backwards compatibility
        facialAnalysis: {
          face_structure: { face_shape: 'general' },
          eye_shape: { shape: 'almond' },
          lip_shape: { shape: 'balanced' }
        },
        totalLandmarks: 468, // Simulated
        annotatedImage: imageUri, // Use original as annotated
        
        // New Stable-Makeup data
        makeupStyle: referenceImage.name,
        instructions: `Applied ${referenceImage.description} using Stable-Makeup AI`,
        products: [], // No product recommendations in new approach
        confidence: 95,
        
        // Processing details
        processingTime: result.data.processingTime,
        backend: 'stable-makeup',
        model: result.data.model,
        
        // Reference image used
        referenceImage: {
          name: referenceImage.name,
          description: referenceImage.description,
          url: referenceImage.url,
          style: referenceImage.style
        }
      }
    };

  } catch (error) {
    console.error('💥 Legacy makeup analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Match user prompt to reference image
 */
function matchPromptToReference(userPrompt) {
  const prompt = userPrompt.toLowerCase();
  
  // Keywords for different styles
  if (prompt.includes('natural') || prompt.includes('everyday') || prompt.includes('subtle')) {
    return defaultReferenceImages[0]; // Natural Glow
  }
  
  if (prompt.includes('glamorous') || prompt.includes('evening') || prompt.includes('bold') || prompt.includes('dramatic')) {
    return defaultReferenceImages[1]; // Glamorous Evening
  }
  
  if (prompt.includes('korean') || prompt.includes('k-beauty') || prompt.includes('fresh') || prompt.includes('youthful')) {
    return defaultReferenceImages[2]; // Korean Beauty
  }
  
  if (prompt.includes('vintage') || prompt.includes('classic') || prompt.includes('hollywood') || prompt.includes('retro')) {
    return defaultReferenceImages[3]; // Vintage Glam
  }
  
  // Default to natural for unknown prompts
  return defaultReferenceImages[0];
}

/**
 * Get available reference images
 */
export const getReferenceImages = () => {
  return defaultReferenceImages;
};

/**
 * Test the Stable-Makeup service
 */
export const testStableMakeup = async () => {
  try {
    console.log('🧪 Testing Stable-Makeup service...');
    
    // Test backend connectivity
    const backendTest = await flyBackendService.testHealth();
    
    return {
      success: backendTest.success,
      message: backendTest.success ? 'Stable-Makeup service ready' : 'Backend connection failed',
      details: backendTest
    };
    
  } catch (error) {
    console.error('🧪 Stable-Makeup test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      suggestion: 'Check backend connection and Replicate API'
    };
  }
};

/**
 * Test complete pipeline with sample images
 */
export const testCompletePipeline = async (sourceImage, referenceImage = null) => {
  try {
    console.log('🚀 Testing complete Stable-Makeup pipeline...');
    
    // Use default reference if none provided
    if (!referenceImage) {
      referenceImage = defaultReferenceImages[0].url;
    }
    
    const result = await transferMakeup(sourceImage, referenceImage, {
      intensity: 0.7, // Lower intensity for testing
      num_inference_steps: 30 // Faster for testing
    });
    
    return {
      success: result.success,
      readyForProduction: result.success,
      fullPipeline: result.data,
      message: result.success ? 'Complete pipeline working perfectly!' : 'Pipeline test failed',
      error: result.success ? null : result.error
    };
    
  } catch (error) {
    console.error('🚀 Complete pipeline test failed:', error);
    return {
      success: false,
      readyForProduction: false,
      message: `Pipeline test failed: ${error.message}`,
      error: error.message
    };
  }
}; 