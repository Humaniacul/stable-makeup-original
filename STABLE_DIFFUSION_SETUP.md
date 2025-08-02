# 🎨 Stable Diffusion Inpainting + ControlNet Setup Guide

## Overview

This guide walks you through implementing **Stable Diffusion inpainting** with **ControlNet** for AI makeup application in your React Native app.

## 🔧 What You'll Need

### 1. **API Provider** (Choose One)

#### Option A: Replicate (Recommended)
- **Pros**: Easy setup, reliable, handles infrastructure
- **Cons**: Pay per generation (~$0.01-0.05 per image)
- **Setup**: Get API key from [replicate.com](https://replicate.com)

#### Option B: RunPod
- **Pros**: Lower cost for high usage, more control
- **Cons**: Requires more setup, GPU server management
- **Setup**: Configure serverless GPU endpoints

#### Option C: Custom Backend
- **Pros**: Full control, no API costs after setup
- **Cons**: Complex setup, requires GPU infrastructure
- **Setup**: Deploy your own SD + ControlNet server

### 2. **Models Required**

- **Stable Diffusion Inpainting**: `runway-ml/stable-diffusion-inpainting`
- **ControlNet**: `lllyasviel/sd-controlnet-openpose` (for face preservation)
- **Face Analysis**: Your existing MediaPipe (✅ already working)

## 🚀 Implementation Steps

### Step 1: Configure API Provider

Edit `app/services/stableDiffusionService.js`:

```javascript
const SD_CONFIG = {
  REPLICATE: {
    ENABLED: true,
    API_TOKEN: 'r8_your_actual_replicate_token_here', // Get from replicate.com
    MODEL_VERSION: 'stability-ai/stable-diffusion-inpainting',
    CONTROLNET_MODEL: 'lllyasviel/sd-controlnet-openpose',
  }
};
```

### Step 2: Install Required Packages

```bash
npm install --save react-native-svg react-native-canvas
```

### Step 3: Implement Real API Calls

Replace the mock functions in `stableDiffusionService.js`:

#### A. For Replicate API:

```javascript
async runReplicateInpainting({ imageUri, maskUri, prompt, controlNet, options }) {
  console.log('🔄 Using Replicate API for inpainting...');
  
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.config.REPLICATE.API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: this.config.MODEL_VERSION,
        input: {
          image: imageUri,
          mask: maskUri,
          prompt: prompt,
          negative_prompt: options.negativePrompt || 'blurry, distorted, low quality',
          num_inference_steps: options.steps || 50,
          guidance_scale: options.guidanceScale || 7.5,
          strength: options.strength || 0.8,
          // ControlNet conditioning
          controlnet_conditioning_scale: controlNet?.strength || 0.8,
          controlnet_guidance_start: 0.0,
          controlnet_guidance_end: 1.0,
        }
      })
    });

    const prediction = await response.json();
    
    // Poll for completion
    const result = await this.pollReplicateResult(prediction.id);
    
    return {
      imageUri: result.output,
      processingTime: result.processing_time,
      model: 'stable-diffusion-inpainting',
      seed: result.seed
    };
    
  } catch (error) {
    console.error('💥 Replicate inpainting failed:', error);
    throw error;
  }
}

async pollReplicateResult(predictionId) {
  const maxAttempts = 30; // 5 minutes max
  const pollInterval = 10000; // 10 seconds
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${this.config.REPLICATE.API_TOKEN}`,
      }
    });
    
    const result = await response.json();
    
    if (result.status === 'succeeded') {
      return result;
    } else if (result.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${result.error}`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Replicate prediction timed out');
}
```

### Step 4: Implement Mask Generation

Replace `generateBasicMask()` with real mask generation:

```javascript
async generateBasicMask(imageUri, facialLandmarks) {
  console.log('🎭 Generating real makeup mask...');
  
  // Option A: Use react-native-canvas
  const canvas = new Canvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw mask based on facial landmarks
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Black areas = areas to inpaint (face regions)
  ctx.fillStyle = 'black';
  
  // Draw face region
  if (facialLandmarks.facialAnalysis?.face_structure) {
    this.drawFaceRegion(ctx, facialLandmarks.facialAnalysis.face_structure);
  }
  
  // Draw eye regions
  if (facialLandmarks.facialAnalysis?.eye_shape) {
    this.drawEyeRegions(ctx, facialLandmarks.facialAnalysis.eye_shape);
  }
  
  // Draw lip region
  if (facialLandmarks.facialAnalysis?.lip_shape) {
    this.drawLipRegion(ctx, facialLandmarks.facialAnalysis.lip_shape);
  }
  
  // Convert to image URI
  const maskUri = await canvas.toDataURL();
  return maskUri;
}

drawFaceRegion(ctx, faceStructure) {
  // Use MediaPipe landmarks to draw precise face outline
  // This preserves hair, background, clothing
  ctx.beginPath();
  // Draw face contour based on landmarks
  ctx.fill();
}
```

### Step 5: Test the Complete Pipeline

1. **Add your Replicate API key** to the config
2. **Test with TestScreen**: 
   - Tap "Stable Diff" to test API connection
   - Tap "Complete Pipeline" to test full flow
3. **Monitor logs** for each step

## 📱 Usage Flow

```
📸 User takes photo
  ↓
💬 User enters prompt: "latina glam for wedding"
  ↓
🤖 ChatGPT enhances: "Apply glamorous latina makeup with bold eyeliner, warm bronze tones, contoured cheeks, glossy nude lips, dramatic lashes, perfectly sculpted eyebrows"
  ↓
🎯 MediaPipe extracts 468 facial landmarks
  ↓
🎭 Generate mask (face regions only)
  ↓
🎨 Stable Diffusion inpainting with ControlNet
  ↓
✨ Final result with makeup applied!
```

## 🎛️ Advanced Configuration

### ControlNet Settings
```javascript
const controlNetData = {
  type: 'openpose',
  strength: 0.8,        // How strongly to preserve structure
  guidance_scale: 7.5,  // How closely to follow prompt
  start: 0.0,          // When to start control
  end: 1.0             // When to stop control
};
```

### Inpainting Settings
```javascript
const inpaintingOptions = {
  steps: 50,                    // Quality vs speed
  guidanceScale: 7.5,          // Prompt adherence
  strength: 0.8,               // How much to change
  negativePrompt: 'blurry, distorted, low quality, duplicate face'
};
```

## 💡 Tips for Best Results

1. **High-quality input photos** work best
2. **Specific prompts** get better results: "warm bronze eyeshadow" vs "brown eyes"
3. **Proper lighting** in original photo helps
4. **Face directly toward camera** works best
5. **Test with different strength values** (0.6-0.9)

## 🔍 Troubleshooting

### Common Issues

1. **API Key Invalid**: Check your Replicate token
2. **Mask Generation Fails**: Ensure landmarks are detected
3. **Poor Results**: Try adjusting strength/guidance scale
4. **Slow Processing**: Normal for first run, caches after

### Debug Steps

1. Check TestScreen status indicators
2. Monitor console logs for each step
3. Verify image URIs are accessible
4. Test with different photos/prompts

## 📊 Cost Estimation

- **Replicate**: ~$0.01-0.05 per image
- **High usage**: Consider RunPod or custom backend
- **Free tier**: Test with small volumes first

## 🚀 Next Steps

1. Get your Replicate API key
2. Configure the service
3. Test with the TestScreen
4. Fine-tune parameters
5. Deploy to production!

Your complete AI makeup pipeline is ready! 🎉

---

**Need help?** The TestScreen will show you exactly which components are working and which need setup. 