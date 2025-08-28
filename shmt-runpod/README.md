RunPod Serverless - SHMT Makeup Transfer
=======================================

Overview
--------
This directory contains a Serverless worker for RunPod that serves the SHMT (Self-supervised Hierarchical Makeup Transfer) model. It clones the SHMT repo at runtime if missing, downloads H0/H4/VQ-f4 weights, and exposes a handler that accepts image URLs and returns a base64 PNG.

Inputs
------
- `source_url` (string, required): URL to the source (no-makeup) face image
- `reference_url` (string, required): URL to the reference (makeup) image
- `ddim_steps` (int, default 50)
- `guidance_scale` (float, default 1.0)

Environment Overrides (optional)
--------------------------------
- `MAKEUP_SHMT_H0_ID`: Google Drive file ID for H0 weights
- `MAKEUP_SHMT_H4_ID`: Google Drive file ID for H4 weights
- `MAKEUP_SHMT_VQF4_URL`: URL to VQ-f4 zip

Deploy via RunPod GitHub Integration
------------------------------------
1. Connect GitHub in RunPod Console → Settings → Connections → GitHub → Connect.
2. Create Serverless → New Endpoint → Custom Source → GitHub Repo.
3. Select this repo/branch. Build context: `shmt-runpod` (important!).
4. Create Endpoint. Monitor build under Builds.
5. Test with JSON body:

```
{
  "input": {
    "source_url": "https://.../source.jpg",
    "reference_url": "https://.../ref.jpg",
    "ddim_steps": 50,
    "guidance_scale": 1.0
  }
}
```

Notes
-----
- First run downloads weights to `/workspace/models`.
- Base image uses CUDA 12 runtime; ensure GPU-enabled pod types.
- For production, pin weights in a persistent volume or baked image to avoid cold download.


# Build timestamp: Thu Aug 28 16:07:55 EEST 2025
# Build timestamp: Thu Aug 28 16:10:21 EEST 2025
