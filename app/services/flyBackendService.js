import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

class FlyBackendService {
  constructor() {
    // Always use production URL for now since local development has issues
    this.baseURL = 'https://beautify-ai-backend.fly.dev';
    console.log('🌐 FlyBackendService initialized');
    console.log('📡 Backend URL:', this.baseURL);
  }

  async healthCheck() {
    try {
      console.log('🔍 Checking backend health...');
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Backend is healthy'
        };
      } else {
        return {
          success: false,
          error: `Health check failed: ${response.status}`,
          data
        };
      }
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async imageToBase64(imageUri) {
    try {
      console.log('🔄 Converting image to base64...');
      
      if (Platform.OS === 'web') {
        // Web platform - use fetch
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Mobile platform - use FileSystem
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
    } catch (error) {
      console.error('Base64 conversion failed:', error);
      throw error;
    }
  }

  async detectFace(imageUri) {
    try {
      console.log('🌐 Making request to:', `${this.baseURL}/detect-face`);
      console.log('📤 Image URI:', imageUri);

      // Try FormData first
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      console.log('📤 FormData prepared with image');

      const response = await fetch(`${this.baseURL}/detect-face`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - let fetch set it automatically for FormData
          'Accept': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('📥 Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Response data keys:', Object.keys(data));

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Face detection failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeMakeup(imageUri) {
    try {
      console.log('🌐 Making request to:', `${this.baseURL}/analyze-makeup`);
      console.log('📤 Image URI:', imageUri);

      // Try FormData first
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      console.log('📤 FormData prepared with image');

      const response = await fetch(`${this.baseURL}/analyze-makeup`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - let fetch set it automatically for FormData
          'Accept': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('📥 Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Response data keys:', Object.keys(data));

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Makeup analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transfer makeup using Stable-Makeup model
   * @param {Object} params - Transfer parameters
   * @param {string} params.source_image_uri - Source image URI
   * @param {string} params.reference_image_uri - Reference image URI  
   * @param {number} params.makeup_intensity - Makeup intensity (0.1-1.0)
   * @param {number} params.guidance_scale - Guidance scale (1.0-20.0)
   * @param {number} params.num_inference_steps - Number of inference steps (10-100)
   * @returns {Promise<Object>} Transfer result
   */
  async transferMakeup(params) {
    try {
      console.log('🎨 Making makeup transfer request to:', `${this.baseURL}/makeup-transfer`);
      console.log('📤 Transfer params:', {
        hasSourceImage: !!params.source_image_uri,
        hasReferenceImage: !!params.reference_image_uri,
        intensity: params.makeup_intensity,
        guidanceScale: params.guidance_scale,
        steps: params.num_inference_steps
      });

      // Convert source image to base64 if it's a local URI
      let sourceImageData = params.source_image_uri;
      if (sourceImageData && !sourceImageData.startsWith('http')) {
        console.log('🔄 Converting source image to base64...');
        const base64 = await this.imageToBase64(sourceImageData);
        sourceImageData = `data:image/jpeg;base64,${base64}`;
      }

      // Convert reference image to base64 if it's a local URI  
      let referenceImageData = params.reference_image_uri;
      if (referenceImageData && !referenceImageData.startsWith('http')) {
        console.log('🔄 Converting reference image to base64...');
        const base64 = await this.imageToBase64(referenceImageData);
        referenceImageData = `data:image/jpeg;base64,${base64}`;
      }

      const requestBody = {
        source_image_base64: sourceImageData.startsWith('data:') ? sourceImageData : null,
        source_image_url: sourceImageData.startsWith('http') ? sourceImageData : null,
        reference_image_base64: referenceImageData.startsWith('data:') ? referenceImageData : null,
        reference_image_url: referenceImageData.startsWith('http') ? referenceImageData : null,
        makeup_intensity: params.makeup_intensity || 0.8,
        guidance_scale: params.guidance_scale || 7.5,
        num_inference_steps: params.num_inference_steps || 50
      };

      console.log('📤 Request prepared with images');

      const response = await fetch(`${this.baseURL}/makeup-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 300000 // 5 minutes for AI processing
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('📥 Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Response data keys:', Object.keys(data));

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Makeup transfer failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Alternative method using base64 if FormData fails
  async analyzeMakeupBase64(imageUri) {
    try {
      console.log('🔄 Trying base64 upload method...');
      
      const base64Image = await this.imageToBase64(imageUri);
      
      const response = await fetch(`${this.baseURL}/analyze-makeup-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          format: 'jpeg'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Makeup analysis failed');
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Base64 makeup analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test backend health and connectivity
   */
  async testHealth() {
    try {
      console.log('🧪 Testing backend health...');
      
      const response = await fetch(`${this.baseURL}/test`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 15000
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend health test successful');
        return {
          success: true,
          message: 'Backend is healthy and ready',
          details: data
        };
      } else {
        throw new Error(`Test endpoint returned ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Backend health test failed:', error.message);
      return {
        success: false,
        message: `Backend test failed: ${error.message}`,
        suggestion: 'Check backend server and API endpoints'
      };
    }
  }

  async processImage(imageUri, analysisType = 'detect') {
    try {
      // Validate input
      if (!imageUri) {
        throw new Error('No image provided');
      }

      console.log(`Starting ${analysisType} analysis with Fly.io backend...`);

      // Choose the appropriate analysis method
      const result = analysisType === 'makeup' 
        ? await this.analyzeMakeup(imageUri)
        : await this.detectFace(imageUri);

      if (result.success) {
        console.log(`${analysisType} analysis completed successfully`);
        return {
          success: true,
          data: result.data,
          backend: 'fly.io'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      return {
        success: false,
        error: error.message,
        backend: 'fly.io'
      };
    }
  }
}

export default new FlyBackendService(); 