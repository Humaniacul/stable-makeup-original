# Deployment Guide: Stable-Makeup to Replicate

This guide walks you through deploying the Stable-Makeup model to Replicate.com.

## Prerequisites

1. **Replicate Account**: Create account at [replicate.com](https://replicate.com)
2. **API Token**: Get your API token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
3. **Docker**: Install Docker on your machine
4. **Cog**: Install Cog (Replicate's deployment tool)

## Step 1: Install Cog

### Windows (if you have issues with the pip version):
```bash
# Download the binary directly
curl -o cog.exe -L "https://github.com/replicate/cog/releases/latest/download/cog_Windows_x86_64.exe"
```

### macOS/Linux:
```bash
sudo curl -o /usr/local/bin/cog -L https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m)
sudo chmod +x /usr/local/bin/cog
```

## Step 2: Create Model on Replicate

1. Go to [replicate.com/create](https://replicate.com/create)
2. Enter model name: `stable-makeup`
3. Add description: "Stable-Makeup: AI makeup transfer using diffusion models"
4. Set visibility (recommend: Public)
5. Click "Create model"

## Step 3: Login to Replicate

```bash
cog login
```

Enter your API token when prompted.

## Step 4: Test Locally (Optional)

```bash
# From the stable-makeup-replicate directory
cog predict -i source_image=@source.jpg -i reference_image=@reference.jpg
```

## Step 5: Push to Replicate

```bash
# Replace 'your-username' with your actual Replicate username
cog push r8.im/your-username/stable-makeup
```

This will:
- Build the Docker image
- Upload to Replicate
- Process dependencies (takes ~10-15 minutes)

## Step 6: Download Model Weights

**Important**: The current deployment uses placeholder weights. For the actual model:

1. Download weights from [Stable-Makeup Google Drive](https://drive.google.com/drive/folders/LINK_FROM_REPO)
2. Update `predict.py` to load the actual model files
3. Re-push the model with `cog push`

## Step 7: Update Your Backend

After successful deployment, update your FastAPI backend (`backend/main.py`):

```python
# Replace this line:
STABLE_MAKEUP_MODEL = "placeholder/stable-makeup"

# With your actual model:
STABLE_MAKEUP_MODEL = "your-username/stable-makeup:latest"
```

Then redeploy your backend:

```bash
cd backend
fly deploy
```

## Step 8: Test the Integration

1. Test the Replicate model directly:
   ```bash
   curl -s -X POST \
     -H "Authorization: Token YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"version": "YOUR_VERSION_HASH", "input": {"source_image": "URL", "reference_image": "URL"}}' \
     https://api.replicate.com/v1/predictions
   ```

2. Test through your backend:
   ```bash
   curl -X POST https://beautify-ai-backend.fly.dev/makeup-transfer \
     -H "Content-Type: application/json" \
     -d '{"source_image_url": "URL", "reference_image_url": "URL"}'
   ```

## Troubleshooting

### Build Errors
- Check `cog.yaml` syntax
- Ensure all Python packages are compatible
- Verify system packages are available

### Runtime Errors
- Check model weights are downloaded correctly
- Verify image preprocessing works
- Test with different input image sizes

### Performance Issues
- Ensure GPU is enabled (`gpu: true` in cog.yaml)
- Optimize image sizes (512x512 recommended)
- Consider reducing inference steps for faster results

## Next Steps

1. **Get Model Weights**: Download actual Stable-Makeup pretrained weights
2. **Update predict.py**: Implement the full inference pipeline
3. **Test Thoroughly**: Test with various makeup styles and face types
4. **Update Frontend**: Integrate the new API into your React Native app

## Cost Optimization

- Use appropriate GPU instances
- Cache models properly
- Batch multiple requests if possible
- Consider cold start times in your app UX 