# ChatGPT Integration Setup Guide

## Overview
The app now includes ChatGPT integration to enhance user makeup prompts into professional descriptions perfect for AI image generation.

## How It Works
1. **User Input**: "natural look for work"
2. **ChatGPT Enhancement**: "Apply subtle neutral eyeshadow in warm beige tones, soft brown mascara, natural pink blush on cheeks, nude pink lip tint, and light foundation for a polished everyday professional look"
3. **Facial Context**: Combines with MediaPipe analysis (e.g., "almond eye shape, full lip shape")
4. **Result**: Professional makeup description optimized for Stable Diffusion

## Setup Instructions

### Step 1: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated API key

### Step 2: Configure the App
1. Open `app/config/openai.js`
2. Replace `'YOUR_OPENAI_API_KEY_HERE'` with your actual API key
3. Optionally adjust settings:
   - `MODEL`: 'gpt-4' (better quality) or 'gpt-3.5-turbo' (faster/cheaper)
   - `ENABLED`: true/false to enable/disable ChatGPT enhancement

### Step 3: Test the Integration
1. Run the app
2. Take a photo and enter a simple prompt like "natural makeup"
3. Check the console logs for enhancement results
4. The ResultScreen should show the enhanced professional description

## Current Features
- ✅ Professional makeup terminology conversion
- ✅ Facial analysis integration (eye shape, lip shape, face structure)
- ✅ Fallback to original prompt if API fails
- ✅ Configurable model and settings
- ✅ Easy enable/disable toggle

## Next Steps
- 🔄 Stable Diffusion integration for actual makeup application
- 🔄 Enhanced results screen with before/after comparison
- 🔄 Custom GPT model training for even better makeup expertise

## Troubleshooting
- **"API key not configured"**: Update the API key in `app/config/openai.js`
- **"ChatGPT enhancement disabled"**: Set `ENABLED: true` in the config
- **API errors**: Check your OpenAI account billing and usage limits
- **Network issues**: Ensure internet connection and API endpoint accessibility

## Cost Considerations
- GPT-4: ~$0.03 per request (higher quality)
- GPT-3.5-turbo: ~$0.002 per request (faster, cheaper)
- Typical usage: 1-2 cents per makeup analysis

The integration is designed to gracefully fallback to the original prompt if ChatGPT is unavailable, ensuring the app always works. 