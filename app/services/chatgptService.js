import OpenAI from 'openai';
import OPENAI_CONFIG from '../config/openai';

// System prompt for makeup expertise and Stable Diffusion prompt engineering
const MAKEUP_EXPERT_PROMPT = `You are a professional makeup artist and prompt engineer for Stable Diffusion Inpainting. Your job is to generate extremely detailed, zone-specific prompts for AI makeup application.

Input: User makeup request + face data
Output: Two lines:
1. Highly detailed, zone-specific makeup prompt. Always mention all zones (lips, eyelids, brows, cheeks), specify left/right if possible. Be explicit about not changing face shape, neck, or background.
2. Negative prompt for what NOT to change (e.g., no face shape change, no skin color change, no neck change, no background change, no hair change, no identity change, no face replacement, no distortion, no new person).

Example:
Input: "I want a glamorous look with bold lips and gold eyeshadow" + face data
Output:
Apply deep red glossy lipstick to both lips, shimmering gold eyeshadow to both upper eyelids, define both eyebrows with dark brown pencil, add soft pink blush to the apples of both cheeks, keep skin natural, do not alter face shape, neck, or background, studio lighting, photorealistic, preserve identity
blurry, distorted, low quality, deformed, extra limbs, bad anatomy, different person, background change, clothing change, hair change, facial structure change, face shape change, jawline change, nose change, eye shape change, lip shape change, skin texture change, lighting change, different face, new person, identity change, face replacement

Return ONLY the two prompts. No explanations. No instructions. Just the prompts.`;

class ChatGPTService {
  constructor() {
    this.config = OPENAI_CONFIG;
    this.openai = null;
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI client
   */
  initializeOpenAI() {
    try {
      if (this.config.ENABLED && this.config.API_KEY && this.config.API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
        this.openai = new OpenAI({
          apiKey: this.config.API_KEY,
        });
        console.log('✅ OpenAI client initialized successfully');
      } else {
        console.log('⚠️ OpenAI client not initialized - missing API key or disabled');
      }
    } catch (error) {
      console.error('💥 Failed to initialize OpenAI client:', error);
      this.openai = null;
    }
  }

  /**
   * Enhance a simple makeup prompt into a professional description
   * @param {string} userPrompt - The user's simple makeup request
   * @param {Object} facialAnalysis - Optional MediaPipe facial analysis data
   * @returns {Promise<string>} Enhanced professional makeup prompt
   */
  async enhancePrompt(userPrompt, facialAnalysis = null) {
    try {
      // Check if ChatGPT is enabled and configured
      if (!this.config.ENABLED) {
        console.log('⚠️ ChatGPT enhancement disabled in config');
        return userPrompt;
      }

      if (!this.openai) {
        console.log('⚠️ OpenAI client not available, using original prompt');
        return userPrompt;
      }

      console.log('🤖 Enhancing prompt with ChatGPT:', userPrompt);

      // Format the input for the AI prompt engineer
      let contextualPrompt = `Request: "${userPrompt}"`;
      if (facialAnalysis) {
        const faceData = this.buildFaceContext(facialAnalysis);
        contextualPrompt += `\nFace data: ${faceData}`;
      } else {
        // Provide default face data if none available
        contextualPrompt += `\nFace data: { "face_shape": "general", "skin_tone": "neutral", "eye_shape": "almond", "lip_shape": "medium" }`;
      }

      // Use the official OpenAI SDK
      const completion = await this.openai.chat.completions.create({
        model: this.config.MODEL,
        messages: [
          {
            role: 'system',
            content: MAKEUP_EXPERT_PROMPT
          },
          {
            role: 'user',
            content: contextualPrompt
          }
        ],
        max_tokens: this.config.MAX_TOKENS,
        temperature: this.config.TEMPERATURE,
        store: true, // Enable conversation storage for better responses
      });

      const response = completion.choices[0]?.message?.content?.trim();

      if (!response) {
        throw new Error('No response from ChatGPT');
      }

      // Split the response into lines to get prompt and negative prompt
      const lines = response.split('\n').filter(line => line.trim());
      
      let enhancedPrompt = lines[0] || userPrompt; // First line is the makeup prompt
      let negativePrompt = lines[1] || "blurry, distorted, low quality, deformed, different person, background change, clothing change, hair change, facial structure change, face shape change, jawline change, nose change, eye shape change, lip shape change, skin texture change, lighting change, different face, new person, identity change, face replacement"; // Second line is negative prompt

      console.log('✅ Prompt enhanced successfully:', {
        original: userPrompt,
        enhanced: enhancedPrompt,
        negative: negativePrompt,
        model: this.config.MODEL,
        tokens: completion.usage?.total_tokens || 'unknown'
      });

      return {
        prompt: enhancedPrompt,
        negative_prompt: negativePrompt
      };

    } catch (error) {
      console.error('💥 ChatGPT enhancement error:', error);
      console.log('⚠️ Falling back to original prompt');
      return {
        prompt: userPrompt,
        negative_prompt: "blurry, distorted, low quality, deformed, different person, background change, clothing change, hair change, facial structure change, face shape change, jawline change, nose change, eye shape change, lip shape change, skin texture change, lighting change, different face, new person, identity change, face replacement"
      }; // Fallback to original prompt
    }
  }

  /**
   * Build facial context from MediaPipe analysis
   * @param {Object} facialAnalysis - MediaPipe facial analysis data
   * @returns {string} Structured facial data for the AI prompt
   */
  buildFaceContext(facialAnalysis) {
    const faceData = {};

    // Face shape
    if (facialAnalysis.face_structure?.shape || facialAnalysis.face_shape) {
      faceData.face_shape = facialAnalysis.face_structure?.shape || facialAnalysis.face_shape;
    }

    // Skin tone
    if (facialAnalysis.skin_tone) {
      faceData.skin_tone = facialAnalysis.skin_tone;
    }

    // Eye information
    if (facialAnalysis.eye_shape?.shape || facialAnalysis.eye_shape) {
      faceData.eye_shape = facialAnalysis.eye_shape?.shape || facialAnalysis.eye_shape;
    }
    if (facialAnalysis.eye_distance) {
      faceData.eye_distance = facialAnalysis.eye_distance;
    }

    // Lip information
    if (facialAnalysis.lip_shape?.shape || facialAnalysis.lip_shape) {
      faceData.lip_shape = facialAnalysis.lip_shape?.shape || facialAnalysis.lip_shape;
    }

    // Jawline
    if (facialAnalysis.jawline) {
      faceData.jawline = facialAnalysis.jawline;
    }

    // Format as structured data for the AI
    if (Object.keys(faceData).length > 0) {
      return JSON.stringify(faceData);
    }

    return '{ "face_shape": "general", "skin_tone": "neutral", "eye_shape": "almond", "lip_shape": "medium" }';
  }

  /**
   * Extract basic facial analysis from MediaPipe backend response
   * @param {Object} mediaPipeResponse - Full MediaPipe response from backend
   * @returns {Object} Simplified facial analysis for ChatGPT
   */
  extractBasicFacialAnalysis(mediaPipeResponse) {
    if (!mediaPipeResponse || !mediaPipeResponse.facial_analysis) {
      return null;
    }

    const analysis = mediaPipeResponse.facial_analysis;
    const basicAnalysis = {};

    // Face shape from face_structure
    if (analysis.face_structure?.face_shape) {
      basicAnalysis.face_shape = analysis.face_structure.face_shape;
    }

    // Eye shape analysis
    if (analysis.eye_shape?.shape) {
      basicAnalysis.eye_shape = analysis.eye_shape.shape;
    }

    // Lip shape analysis
    if (analysis.lip_shape?.shape) {
      basicAnalysis.lip_shape = analysis.lip_shape.shape;
    }

    // Basic skin tone (we'll derive from face structure ratio)
    if (analysis.face_structure?.ratio) {
      // Estimate skin tone category based on available data
      basicAnalysis.skin_tone = "neutral"; // Default, can be enhanced with actual skin tone detection
    }

    // Eye distance (derive from face structure if available)
    if (analysis.face_structure?.ratio) {
      const ratio = analysis.face_structure.ratio;
      if (ratio > 0.8) {
        basicAnalysis.eye_distance = "close";
      } else if (ratio > 0.7) {
        basicAnalysis.eye_distance = "normal";
      } else {
        basicAnalysis.eye_distance = "wide";
      }
    }

    // Jawline (derive from face shape)
    if (basicAnalysis.face_shape) {
      switch (basicAnalysis.face_shape) {
        case "round":
          basicAnalysis.jawline = "soft";
          break;
        case "elongated":
          basicAnalysis.jawline = "defined";
          break;
        case "oval":
        default:
          basicAnalysis.jawline = "balanced";
          break;
      }
    }

    return Object.keys(basicAnalysis).length > 0 ? basicAnalysis : null;
  }

  /**
   * Test the ChatGPT connection with a simple request
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      if (!this.openai) {
        console.log('❌ OpenAI client not available for testing');
        return false;
      }

      console.log('🧪 Testing ChatGPT connection...');
      
      const testCompletion = await this.openai.chat.completions.create({
        model: this.config.MODEL,
        messages: [
          {
            role: 'user',
            content: 'Say "ChatGPT connection successful" if you can read this.'
          }
        ],
        max_tokens: 20,
        temperature: 0
      });

      const response = testCompletion.choices[0]?.message?.content?.trim();
      const isSuccessful = response?.toLowerCase().includes('successful');
      
      console.log('🧪 Connection test result:', {
        success: isSuccessful,
        response: response,
        model: this.config.MODEL
      });

      return isSuccessful;
    } catch (error) {
      console.error('❌ ChatGPT connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current configuration status
   * @returns {Object} Configuration status
   */
  getStatus() {
    return {
      enabled: this.config.ENABLED,
      hasApiKey: !!(this.config.API_KEY && this.config.API_KEY !== 'YOUR_OPENAI_API_KEY_HERE'),
      hasClient: !!this.openai,
      model: this.config.MODEL,
      ready: this.config.ENABLED && !!this.openai
    };
  }

  /**
   * Test function to verify service is accessible
   * @returns {string} Test result
   */
  testExtractFunction() {
    return 'extractBasicFacialAnalysis function is accessible';
  }
}

export default new ChatGPTService(); 