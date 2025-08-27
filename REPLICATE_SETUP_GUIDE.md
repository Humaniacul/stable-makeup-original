# 🚀 Quick Setup Guide - Replicate API

## Get Your AI Makeup Pipeline Running in 5 Minutes!

### Step 1: Get Your Replicate API Key

1. **Go to** [replicate.com](https://replicate.com)
2. **Sign up** for a free account (they give you free credits!)
3. **Navigate to** Account → API Tokens
4. **Create a new token**
5. **Copy the token** (starts with `r8_`)

### Step 2: Add Your API Key

1. **Open** `app/config/replicate.js`
2. **Replace** `'YOUR_REPLICATE_TOKEN_HERE'` with your actual token:

```javascript
const REPLICATE_CONFIG = {
  // Your Replicate API token (get from https://replicate.com)
  API_TOKEN: 'r8_your_actual_token_here', // ← Paste your token here
  
  // ... rest of the config stays the same
};
```

### Step 3: Test Your Setup

1. **Run your app**
2. **Go to TestScreen** (flask icon in HomeScreen)
3. **Tap "Replicate"** button
4. **Look for**: ✅ Replicate API connected - stable-diffusion-3.5-large

### Step 4: Test the Full Pipeline

1. **Take a photo** in the TestScreen
2. **Tap "Complete Pipeline"**
3. **Wait for magic** ✨

## 🎯 What You Get

- **Stable Diffusion 3.5 Large**: Latest and greatest model
- **Professional Quality**: 1024x1024 high-resolution images
- **Cost Effective**: ~$0.012 per image (~$1.20 for 100 images)
- **Fast Processing**: ~30-60 seconds per image
- **Scale-to-Zero**: Only pay when you use it

## 🔧 Configuration Options

Edit `app/config/replicate.js` to customize:

```javascript
DEFAULTS: {
  width: 1024,           // Image width
  height: 1024,          // Image height
  num_inference_steps: 28, // Quality vs speed (10-50)
  guidance_scale: 3.5,   // How closely to follow prompt (1-10)
  negative_prompt: '...', // What to avoid
  output_format: 'png'   // Output format
}
```

## 💡 Pro Tips

1. **Start with small images** (512x512) for testing
2. **Use specific prompts**: "warm bronze eyeshadow" vs "brown makeup"
3. **Test different steps**: 28 for quality, 10 for speed
4. **Monitor costs**: Check your usage at replicate.com

## 🎨 Example Prompts That Work Great

- "professional makeup, natural glowing skin, soft contouring"
- "glamorous evening makeup, bold eyeliner, red lips"
- "natural everyday makeup, subtle enhancement"
- "bridal makeup, elegant and timeless"

## 🚨 Common Issues

### "API token not configured"
- Check your token in `app/config/replicate.js`
- Make sure it starts with `r8_`

### "Invalid API key"
- Regenerate your token at replicate.com
- Make sure you copied it correctly

### "Connection failed"
- Check your internet connection
- Try again in a few minutes

### "Slow processing"
- Normal! First run takes longer
- Reduce steps for faster results

## 🎉 You're Ready!

Your AI makeup pipeline is now live! Users can:
1. Take photos
2. Enter makeup style requests
3. Get professional AI-generated makeup results
4. See before/after comparisons

**Happy beautifying!** 💄✨

---

**Need help?** Check the logs in TestScreen or contact support. 