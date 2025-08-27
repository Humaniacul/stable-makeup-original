import os
import sys
import requests
from pathlib import Path as FsPath
from cog import BasePredictor, Input, Path as CogPath
from PIL import Image
import torch

def download_file(url, output_path):
    """Download file from URL to output path"""
    print(f"Downloading {url} to {output_path}")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"Downloaded {output_path}")

def download_gdrive_file(file_id, output_path):
    """Download file from Google Drive using gdown"""
    print(f"Downloading Google Drive file {file_id} to {output_path}")
    try:
        import gdown
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, output_path, quiet=False)
        print(f"Downloaded {output_path}")
    except Exception as e:
        print(f"Failed to download with gdown: {e}")
        # Fallback to direct download
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        download_file(url, output_path)

def setup_shmt_weights():
    """Download and setup SHMT weights"""
    models_dir = FsPath("models")
    models_dir.mkdir(exist_ok=True)
    
    # Environment variable overrides
    h0_url = os.getenv("MAKEUP_SHMT_H0_URL", "https://drive.google.com/file/d/1zed2At-qnIOXewkZsGq8GODEIxmaxMAE/view?usp=drive_link")
    h4_url = os.getenv("MAKEUP_SHMT_H4_URL", "https://drive.google.com/file/d/19Kt-5wgqyLty_v8G-oez8COjDqEcApDF/view?usp=drive_link")
    vqf4_url = os.getenv("MAKEUP_SHMT_VQF4_URL", "https://ommer-lab.com/files/latent-diffusion/vq-f4.zip")
    
    # Extract Google Drive IDs
    h0_id = "1zed2At-qnIOXewkZsGq8GODEIxmaxMAE"
    h4_id = "19Kt-5wgqyLty_v8G-oez8COjDqEcApDF"
    
    # Download H0 weights
    h0_path = models_dir / "shmt_h0.pth"
    if not h0_path.exists():
        download_gdrive_file(h0_id, h0_path)
    
    # Download H4 weights  
    h4_path = models_dir / "shmt_h4.pth"
    if not h4_path.exists():
        download_gdrive_file(h4_id, h4_path)
    
    # Download VQ-f4 autoencoder
    vqf4_dir = models_dir / "vq-f4"
    vqf4_dir.mkdir(exist_ok=True)
    vqf4_path = vqf4_dir / "model.ckpt"
    
    if not vqf4_path.exists():
        print("Downloading VQ-f4 autoencoder...")
        # Download from LDM official release
        vqf4_zip = models_dir / "vq-f4.zip"
        download_file(vqf4_url, vqf4_zip)
        
        # Extract
        import zipfile
        with zipfile.ZipFile(vqf4_zip, 'r') as zip_ref:
            zip_ref.extractall(vqf4_dir)
        
        # Clean up zip
        vqf4_zip.unlink()
    
    return {
        'h0_path': str(h0_path),
        'h4_path': str(h4_path), 
        'vqf4_path': str(vqf4_path)
    }

class Predictor(BasePredictor):
    def setup(self):
        """Download and setup SHMT weights"""
        print("Setting up SHMT weights...")
        self.weight_paths = setup_shmt_weights()
        print("SHMT weights setup complete!")
        
        # TODO: Load SHMT models here
        # self.shmt_model = load_shmt_model(self.weight_paths)

    def predict(self,
                source: CogPath = Input(description="Source face image"),
                reference: CogPath = Input(description="Reference makeup image")) -> CogPath:
        """Run SHMT makeup transfer"""
        src = Image.open(source).convert('RGB')
        ref = Image.open(reference).convert('RGB')
        
        # TODO: Implement SHMT inference
        # result = self.shmt_model.transfer(src, ref)
        
        # For now, return source image as placeholder
        output_path = "output.png"
        src.save(output_path)
        return CogPath(output_path)
