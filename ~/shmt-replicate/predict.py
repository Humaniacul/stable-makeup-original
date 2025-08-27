import os
import torch
import torch.nn as nn
from PIL import Image
import numpy as np
from cog import BasePredictor, Input, Path
import requests
import zipfile
import tempfile

def download_file(url, filename):
    """Download a file from URL"""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

def download_gdrive_file(file_id, filename):
    """Download a file from Google Drive using gdown"""
    try:
        import gdown
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, filename, quiet=False)
    except ImportError:
        print("gdown not available, trying direct download...")
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        download_file(url, filename)

def setup_shmt_weights():
    """Setup SHMT model weights - now using local files"""
    models_dir = "models"
    os.makedirs(models_dir, exist_ok=True)
    
    # Check if files already exist
    h0_path = os.path.join(models_dir, "shmt_h0.pth")
    h4_path = os.path.join(models_dir, "shmt_h4.pth")
    vq_f4_path = os.path.join(models_dir, "vq-f4", "model.ckpt")
    
    # Verify files exist
    if not os.path.exists(h0_path):
        raise FileNotFoundError(f"H0 model not found at {h0_path}")
    if not os.path.exists(h4_path):
        raise FileNotFoundError(f"H4 model not found at {h4_path}")
    
    # Extract VQ-f4 if needed
    vq_f4_zip = os.path.join(models_dir, "vq-f4.zip")
    if os.path.exists(vq_f4_zip) and not os.path.exists(vq_f4_path):
        print("Extracting VQ-f4 model...")
        with zipfile.ZipFile(vq_f4_zip, 'r') as zip_ref:
            zip_ref.extractall(models_dir)
    
    if not os.path.exists(vq_f4_path):
        raise FileNotFoundError(f"VQ-f4 model not found at {vq_f4_path}")
    
    print(f"✅ SHMT models ready:")
    print(f"   H0: {h0_path}")
    print(f"   H4: {h4_path}")
    print(f"   VQ-f4: {vq_f4_path}")
    
    return {
        'h0': h0_path,
        'h4': h4_path,
        'vq_f4': vq_f4_path
    }

class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load the SHMT model"""
        print("Setting up SHMT model...")
        
        # Setup model weights
        self.model_paths = setup_shmt_weights()
        
        # TODO: Load SHMT models here
        # This will be implemented once we add the SHMT repository
        print("SHMT model setup complete!")

    def predict(
        self,
        source_image: Path = Input(description="Source face image"),
        makeup_image: Path = Input(description="Makeup reference image"),
        strength: float = Input(description="Makeup transfer strength", default=0.8, ge=0.0, le=1.0),
    ) -> Path:
        """Run SHMT makeup transfer"""
        
        # For now, just return the source image
        # TODO: Implement actual SHMT inference
        print(f"SHMT inference with strength: {strength}")
        print(f"Source: {source_image}")
        print(f"Makeup: {makeup_image}")
        
        # Return source image as placeholder
        return source_image
