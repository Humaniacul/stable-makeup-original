# RunPod Deployment Guide

This repository is now configured for **RunPod Serverless** deployment only.

## Quick Start

### Option 1: GitHub Integration (Recommended)
1. **Connect GitHub** in RunPod Console → Settings → Connections → GitHub
2. **Create Endpoint** → Custom Source → GitHub Repo
3. **Select this repo**, Build Context: `shmt-runpod`
4. **Deploy automatically** on every push to `master`

### Option 2: Docker Hub + GitHub Actions
1. **Set GitHub Secrets**:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password or access token

2. **Push to master** → Auto-builds Docker image → Manual deploy on RunPod

3. **Update RunPod endpoint** with new image: `${{ secrets.DOCKER_USERNAME }}/shmt-runpod:latest`

## Repository Structure

```
├── shmt-runpod/           # RunPod serverless worker
│   ├── Dockerfile         # Container definition
│   ├── requirements.txt   # Python dependencies
│   ├── rp_handler.py     # RunPod handler function
│   └── README.md         # Detailed usage guide
├── .github/workflows/    
│   └── deploy-runpod.yml # GitHub Actions for Docker builds
└── app/                  # React Native mobile app
```

## Testing Your Endpoint

```bash
curl -X POST "YOUR_RUNPOD_ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "source_url": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400",
      "reference_url": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400",
      "ddim_steps": 50,
      "guidance_scale": 1.0
    }
  }'
```

## What Was Removed

- ❌ All Replicate-specific files (`cog.yaml`, `predict.py`)
- ❌ Replicate GitHub Actions workflows  
- ❌ Replicate dependencies

## What's Active Now

- ✅ RunPod serverless worker (`shmt-runpod/`)
- ✅ GitHub Actions for Docker builds
- ✅ React Native app (unchanged)
- ✅ SHMT model with full quality inference

## Environment Variables

Set these in your RunPod endpoint:
- `MAKEUP_SHMT_H0_ID`: Google Drive ID for H0 weights
- `MAKEUP_SHMT_H4_ID`: Google Drive ID for H4 weights  
- `MAKEUP_SHMT_VQF4_URL`: URL for VQ-f4 autoencoder weights

## Performance

- **Cold start**: ~2-3 minutes (downloads weights)
- **Warm inference**: ~30-60 seconds
- **Image quality**: Full SHMT pipeline, no mock data
