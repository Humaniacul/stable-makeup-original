# Stable-Makeup on Replicate

This repository contains the deployment files for running the [Stable-Makeup](https://github.com/Xiaojiu-z/Stable-Makeup) model on Replicate.

## Features

- **High-Quality Makeup Transfer**: Transfer makeup styles from reference images to source faces
- **Identity Preservation**: Maintains the person's identity, facial structure, and background
- **Adjustable Intensity**: Control the strength of makeup application
- **Fast Inference**: GPU-accelerated processing on Replicate

## Usage

### Python API

```python
import replicate

# Replace with your actual model name after deployment
output = replicate.run(
    "your-username/stable-makeup:latest",
    input={
        "source_image": "https://example.com/source-face.jpg",
        "reference_image": "https://example.com/makeup-reference.jpg",
        "makeup_intensity": 1.0
    }
)

print(output)  # URL to the result image
```

### cURL

```bash
curl -s -X POST \
  -H "Authorization: Token YOUR_REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "YOUR_MODEL_VERSION_HASH",
    "input": {
      "source_image": "https://example.com/source-face.jpg",
      "reference_image": "https://example.com/makeup-reference.jpg",
      "makeup_intensity": 1.0
    }
  }' \
  https://api.replicate.com/v1/predictions
```

## Parameters

- **source_image**: The face image to apply makeup to
- **reference_image**: The image containing the makeup style to transfer  
- **makeup_intensity**: Float between 0.1 and 2.0 controlling transfer strength

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

## Model Information

Based on the research paper: "Stable-Makeup: When Real-World Makeup Transfer Meets Diffusion Model" (SIGGRAPH 2025)

Original repository: https://github.com/Xiaojiu-z/Stable-Makeup 