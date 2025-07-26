/**
 * COMPLETELY NEW Stable Diffusion Service
 * Backend Proxy Approach - No more React Native network issues!
 * 
 * This service calls our own backend which handles Replicate API calls
 * Eliminating all React Native fetch/network problems
 */

// Backend configuration
const BACKEND_CONFIG = {
  // Local development
  LOCAL_URL: 'http://localhost:8000',
  
  // Production (fly.io)
  PRODUCTION_URL: 'https://beautify-ai-backend.fly.dev',
  
  // Auto-detect which URL to use
  getBaseURL() {
    return __DEV__ ? this.PRODUCTION_URL : this.PRODUCTION_URL; // Always use fly.io now
  }
};

class StableDiffusionService {
  constructor() {
    this.backendURL = BACKEND_CONFIG.getBaseURL();
    console.log('🚀 NEW StableDiffusionService initialized with backend proxy');
    console.log('📡 Backend URL:', this.backendURL);
  }

  /**
   * Convert image to base64 for backend processing
   */
  async convertImageToBase64(imageUri) {
    try {
      console.log('🔄 Converting image to base64...');
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          console.log('✅ Image converted to base64');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Base64 conversion failed:', error);
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  /**
   * Apply makeup using backend proxy (MUCH MORE RELIABLE)
   */
  async applyMakeup(imageUri, enhancedPrompt, facialLandmarks, options = {}) {
    try {
      console.log('🎨 Starting makeup application via BACKEND...');
      console.log('📸 Image:', imageUri);
      console.log('💬 Prompt:', enhancedPrompt);

      // Step 1: Convert image to base64 (no network calls)
      console.log('📤 Step 1: Converting image to base64...');
      const base64Image = await this.convertImageToBase64(imageUri);
      console.log('✅ Base64 conversion complete');

      // Step 2: Call backend for makeup generation
      console.log('🔄 Step 2: Calling backend for makeup generation...');
      
      const makeupResult = await this.callBackendForMakeup({
        image_base64: base64Image,
        prompt: enhancedPrompt,
        negative_prompt: facialLandmarks.negative_prompt || "blurry, distorted, low quality, bad makeup",
        guidance_scale: 3.5,
        num_inference_steps: 20,
        strength: 0.8
      });

      console.log('✅ Makeup generation completed via backend');

      return {
        success: true,
        data: {
          originalImage: imageUri,
          makeupImage: makeupResult.image_url,
          prompt: enhancedPrompt,
          processingTime: makeupResult.processing_time,
          predictionId: makeupResult.prediction_id,
          model: 'stable-diffusion-3.5-large',
          method: 'backend-proxy'
        }
      };

    } catch (error) {
      console.error('💥 Makeup application failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Call backend for makeup generation (bypasses React Native network issues)
   */
  async callBackendForMakeup(requestData) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Backend call attempt ${attempt}/${maxRetries}`);
        
        const response = await fetch(`${this.backendURL}/generate-makeup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestData),
          timeout: 300000 // 5 minutes for AI processing
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
        }

        return result;

      } catch (error) {
        console.error(`💥 Backend call attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // Check if it's a backend connectivity issue
          if (error.message.includes('fetch') || error.message.includes('network')) {
            throw new Error('Cannot connect to backend. Make sure the backend server is running.');
          } else {
            throw new Error(`Backend error: ${error.message}`);
          }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  /**
   * Test backend connectivity
   */
  async testBackendConnection() {
    try {
      console.log('🔍 Testing backend connection...');
      
      const response = await fetch(`${this.backendURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection successful');
        return {
          success: true,
          message: 'Backend is healthy',
          status: data.status,
          backendURL: this.backendURL
        };
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
      return {
        success: false,
        message: `Backend connection failed: ${error.message}`,
        backendURL: this.backendURL,
        suggestion: 'Make sure the backend server is running with: cd backend && python main.py'
      };
    }
  }

  /**
   * Test makeup generation endpoint
   */
  async testMakeupGeneration() {
    try {
      console.log('🧪 Testing makeup generation endpoint...');
      
      const response = await fetch(`${this.backendURL}/test-makeup`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 15000
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Makeup generation test successful');
        return {
          success: true,
          message: 'Makeup generation endpoint is working',
          details: data
        };
      } else {
        throw new Error(`Test endpoint returned ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Makeup generation test failed:', error.message);
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        suggestion: 'Check backend logs and Replicate API token'
      };
    }
  }

  /**
   * Test service readiness
   */
  async testService() {
    try {
      const connectionTest = await this.testBackendConnection();
      const makeupTest = await this.testMakeupGeneration();
      
      return {
        ready: connectionTest.success && makeupTest.success,
        connection: connectionTest,
        makeup: makeupTest
      };
    } catch (error) {
      return {
        ready: false,
        error: error.message
      };
    }
  }

  /**
   * Complete system test
   */
  async runSystemTest() {
    console.log('🔍 Running complete system test...');
    
    const results = [];
    
    // Test 1: Backend connectivity
    const backendTest = await this.testBackendConnection();
    results.push({
      test: 'Backend Connectivity',
      ...backendTest
    });
    
    // Test 2: Makeup generation endpoint
    if (backendTest.success) {
      const makeupTest = await this.testMakeupGeneration();
      results.push({
        test: 'Makeup Generation',
        ...makeupTest
      });
    } else {
      results.push({
        test: 'Makeup Generation',
        success: false,
        message: 'Skipped - backend not accessible'
      });
    }
    
    const allPassed = results.every(r => r.success);
    
    return {
      allPassed,
      summary: `${results.filter(r => r.success).length}/${results.length} tests passed`,
      results
    };
  }
}

// Export singleton instance
const stableDiffusionService = new StableDiffusionService();
export default stableDiffusionService; 