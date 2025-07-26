# Quick Setup Guide

## Option 1: GitHub Auto-Deploy (Recommended)

1. **Create a GitHub repository** and upload this `stable-makeup-replicate` folder

2. **Create a Replicate model**:
   - Go to [replicate.com/create](https://replicate.com/create)
   - Name: `stable-makeup`
   - Visibility: Public
   - Save the model URL (e.g., `r8.im/your-username/stable-makeup`)

3. **Set GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add secrets:
     - `REPLICATE_API_TOKEN`: Your Replicate API token
     - `REPLICATE_MODEL_NAME`: `r8.im/your-username/stable-makeup`

4. **Deploy**: Push to the `main` branch or trigger workflow manually

## Option 2: Manual Upload to Replicate

If you prefer not to use GitHub Actions:

1. **Zip the folder**: Create a zip file with all files in `stable-makeup-replicate/`

2. **Upload via Replicate Web UI**:
   - Go to your model page on Replicate
   - Click "Deploy" → "Upload files"
   - Upload the zip file

3. **Wait for build**: Monitor progress on Replicate dashboard

## What Happens Next

1. **Build time**: ~15-20 minutes (downloading dependencies)
2. **Model available**: At `https://replicate.com/your-username/stable-makeup`
3. **API ready**: You can test via web interface or API calls

## Integration

Once deployed, update your backend (`backend/main.py`):

```python
STABLE_MAKEUP_MODEL = "your-username/stable-makeup:latest"
```

Then redeploy your backend:
```bash
cd backend
fly deploy
```

## Testing

Test the deployed model:
```bash
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "MODEL_VERSION_HASH",
    "input": {
      "source_image": "https://example.com/face.jpg",
      "reference_image": "https://example.com/makeup.jpg",
      "makeup_intensity": 1.0
    }
  }'
``` 