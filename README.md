# SHMT: Self-supervised Hierarchical Makeup Transfer

This repository contains a Replicate deployment of the [SHMT (Self-supervised Hierarchical Makeup Transfer)](https://github.com/snowfallingplum/SHMT) model for high-quality makeup transfer.

## 🎨 What is SHMT?

SHMT is a state-of-the-art makeup transfer model that uses hierarchical latent diffusion models to achieve high-quality, realistic makeup transfer results. It was published at NeurIPS 2024.

## 🚀 Quick Start

### Using the Replicate API

```python
import replicate

# Run SHMT makeup transfer
output = replicate.run(
    "your-username/shmt:latest",
    input={
        "source": "path/to/source_face.jpg",
        "reference": "path/to/makeup_reference.jpg"
    }
)
```

### Using the Web Interface

1. Visit the Replicate model page
2. Upload your source face image
3. Upload your makeup reference image
4. Click "Run" to get the result

## 📁 Project Structure

```
shmt-replicate/
├── predict.py          # Main prediction script
├── cog.yaml           # Replicate configuration
├── models/            # Model weights
│   ├── shmt_h0.pth    # H0 model (4.7GB)
│   ├── shmt_h4.pth    # H4 model (4.7GB)
│   └── vq-f4/         # VQ-f4 autoencoder
├── SHMT/              # Original SHMT repository
└── test_shmt.py       # Test script
```

## 🔧 Setup

### Prerequisites

- Python 3.10+
- CUDA-compatible GPU (for inference)
- 10GB+ disk space for model weights

### Local Development

1. Clone this repository:
```bash
git clone <repository-url>
cd shmt-replicate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download model weights (see Model Weights section)

4. Test the setup:
```bash
python test_shmt.py
```

## 📥 Model Weights

The following model weights are required:

- **H0 Model**: `shmt_h0.pth` (4.7GB) - [Download from Google Drive](https://drive.google.com/file/d/1zed2At-qnIOXewkZsGq8GODEIxmaxMAE/view?usp=drive_link)
- **H4 Model**: `shmt_h4.pth` (4.7GB) - [Download from Google Drive](https://drive.google.com/file/d/19Kt-5wgqyLty_v8G-oez8COjDqEcApDF/view?usp=drive_link)
- **VQ-f4 Autoencoder**: `vq-f4.zip` (68MB) - [Download from LDM](https://ommer-lab.com/files/latent-diffusion/vq-f4.zip)

Place the files in the `models/` directory:
```
models/
├── shmt_h0.pth
├── shmt_h4.pth
└── vq-f4/
    └── model.ckpt
```

## 🎯 Usage

### Input Parameters

- `source`: Source face image (Path)
- `reference`: Makeup reference image (Path)

### Output

Returns a makeup-transferred image that applies the makeup from the reference image to the source face.

## 🔬 Technical Details

SHMT uses a hierarchical approach with two models:

1. **H0 Model**: Handles coarse makeup transfer
2. **H4 Model**: Handles fine details and refinement

The model requires:
- Face parsing (segmentation masks)
- 3D face reconstruction (depth maps)
- VQ-f4 autoencoder for latent space encoding

## 📊 Performance

- **Resolution**: 256x256 pixels
- **Inference Time**: ~30-60 seconds on GPU
- **Memory Usage**: ~8GB GPU memory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. The original SHMT model is licensed under CC BY-NC-SA 4.0.

## 🙏 Acknowledgments

- [SHMT Paper](https://arxiv.org/abs/xxxx.xxxxx) - Original research
- [SHMT Repository](https://github.com/snowfallingplum/SHMT) - Original implementation
- [Replicate](https://replicate.com) - Deployment platform

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the [SHMT repository](https://github.com/snowfallingplum/SHMT) for technical details# Trigger deployment
