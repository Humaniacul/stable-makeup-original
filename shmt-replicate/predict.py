import os
import sys
import subprocess
import requests
import tempfile
import numpy as np
import cv2
from pathlib import Path as FsPath
from cog import BasePredictor, Input, Path as CogPath
from PIL import Image
import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
from omegaconf import OmegaConf
from torch import autocast
from contextlib import nullcontext

"""Utility to ensure SHMT's ldm package is available and importable."""
def ensure_shmt_code():
    shmt_dir = FsPath("SHMT")
    if not shmt_dir.exists() or not (shmt_dir / "ldm").exists():
        print("SHMT repository not found. Cloning...")
        subprocess.run([
            "git", "clone", "--depth", "1",
            "https://github.com/snowfallingplum/shmt.git", "SHMT"
        ], check=True)
    if "SHMT" not in sys.path:
        sys.path.insert(0, "SHMT")


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
        gdown.download(url, str(output_path), quiet=False)
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
    # The official zip contains files under logs/..; try common names
    candidate_ckpts = [
        vqf4_dir / "model.ckpt",
        vqf4_dir / "vq-f4.ckpt",
        vqf4_dir / "vq-f4-encoder.ckpt",
    ]
    vqf4_path = None
    
    for cand in candidate_ckpts:
        if cand.exists():
            vqf4_path = cand
            break

    if vqf4_path is None:
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

        # Recompute path after extraction
        for cand in candidate_ckpts:
            if cand.exists():
                vqf4_path = cand
                break

    if vqf4_path is None:
        # As last resort, search recursively
        for root, _, files in os.walk(vqf4_dir):
            for f in files:
                if f.endswith('.ckpt'):
                    vqf4_path = FsPath(root) / f
                    break
            if vqf4_path is not None:
                break
    
    return {
        'h0_path': str(h0_path),
        'h4_path': str(h4_path), 
        'vqf4_path': str(vqf4_path) if vqf4_path is not None else ""
    }


def load_model_from_config(config, ckpt, verbose=False):
    """Load SHMT model from config and checkpoint"""
    print(f"Loading model from {ckpt}")
    pl_sd = torch.load(ckpt, map_location="cpu")
    if "global_step" in pl_sd:
        print(f"Global Step: {pl_sd['global_step']}")
    sd = pl_sd["state_dict"]
    model = instantiate_from_config(config.model)
    m, u = model.load_state_dict(sd, strict=False)
    if len(m) > 0 and verbose:
        print("missing keys:")
        print(m)
    if len(u) > 0 and verbose:
        print("unexpected keys:")
        print(u)

    model.cuda()
    model.eval()
    return model


def preprocess_image(image, size=(256, 256)):
    """Preprocess image for SHMT"""
    # Resize image
    image = image.resize(size, Image.LANCZOS)
    
    # Convert to tensor and normalize to [-1, 1]
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])
    
    return transform(image).unsqueeze(0)


def generate_simple_segmentation(image):
    """Generate a simple face segmentation mask"""
    # Convert PIL to cv2
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # Simple face detection and segmentation
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    # Create a simple mask
    h, w = image.size[1], image.size[0]
    mask = np.zeros((h, w), dtype=np.uint8)
    
    if len(faces) > 0:
        # Use the largest face
        x, y, w_face, h_face = max(faces, key=lambda face: face[2] * face[3])
        mask[y:y+h_face, x:x+w_face] = 1
    else:
        # If no face detected, use center region
        center_y, center_x = h // 2, w // 2
        radius = min(h, w) // 3
        y_min, y_max = max(0, center_y - radius), min(h, center_y + radius)
        x_min, x_max = max(0, center_x - radius), min(w, center_x + radius)
        mask[y_min:y_max, x_min:x_max] = 1
    
    return mask


def generate_simple_depth(image):
    """Generate a simple depth map from image"""
    # Convert to grayscale and normalize
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    
    # Simple depth estimation using gradient magnitude
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    depth = np.sqrt(grad_x**2 + grad_y**2)
    
    # Normalize to 0-255
    depth = (depth / depth.max() * 255).astype(np.uint8)
    
    # Convert back to 3-channel
    depth_3ch = cv2.cvtColor(depth, cv2.COLOR_GRAY2RGB)
    
    return depth_3ch


class Predictor(BasePredictor):
    def setup(self):
        """Download and setup SHMT weights and models"""
        print("Setting up SHMT...")
        
        # Ensure SHMT code is present and importable
        ensure_shmt_code()
        # Lazy import after ensuring code exists
        global instantiate_from_config, DDIMSampler
        from ldm.util import instantiate_from_config
        from ldm.models.diffusion.ddim_test import DDIMSampler

        # Setup seed for reproducibility
        torch.manual_seed(42)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(42)
        
        # Download weights
        self.weight_paths = setup_shmt_weights()
        print("SHMT weights setup complete!")
        
        # Load H0 model (high-frequency details)
        print("Loading H0 model...")
        h0_config_path = "SHMT/configs/latent-diffusion/shmt_h0.yaml"
        h0_config = OmegaConf.load(h0_config_path)
        
        # Fix VQ-f4 path in config
        h0_config.model.params.first_stage_config.params.ckpt_path = self.weight_paths['vqf4_path']
        
        self.h0_model = load_model_from_config(h0_config, self.weight_paths['h0_path'])
        print("H0 model loaded!")
        
        # Load H4 model (low-frequency base)
        print("Loading H4 model...")
        h4_config_path = "SHMT/configs/latent-diffusion/shmt_h4.yaml"
        h4_config = OmegaConf.load(h4_config_path)
        
        # Fix VQ-f4 path in config
        h4_config.model.params.first_stage_config.params.ckpt_path = self.weight_paths['vqf4_path']
        
        self.h4_model = load_model_from_config(h4_config, self.weight_paths['h4_path'])
        print("H4 model loaded!")
        
        # Setup samplers
        self.h0_sampler = DDIMSampler(self.h0_model)
        self.h4_sampler = DDIMSampler(self.h4_model)
        
        # Device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        print("SHMT setup complete!")

    def predict(self,
                source: CogPath = Input(description="Source face image"),
                reference: CogPath = Input(description="Reference makeup image"),
                ddim_steps: int = Input(description="Number of DDIM sampling steps", default=50, le=100),
                guidance_scale: float = Input(description="Guidance scale", default=1.0, le=3.0)) -> CogPath:
        """Run SHMT makeup transfer"""
        
        # Load and preprocess images
        src_img = Image.open(source).convert('RGB')
        ref_img = Image.open(reference).convert('RGB')
        
        print("Preprocessing images...")
        
        # Preprocess images
        source_tensor = preprocess_image(src_img).to(self.device)
        ref_tensor = preprocess_image(ref_img).to(self.device)
        
        # Generate segmentation and depth maps (simplified)
        src_seg = generate_simple_segmentation(src_img.resize((256, 256)))
        ref_seg = generate_simple_segmentation(ref_img.resize((256, 256)))
        src_depth = generate_simple_depth(src_img.resize((256, 256)))
        
        # Convert to tensors
        src_seg_tensor = torch.from_numpy(src_seg).float().unsqueeze(0).unsqueeze(0).to(self.device) / 255.0
        ref_seg_tensor = torch.from_numpy(ref_seg).float().unsqueeze(0).unsqueeze(0).to(self.device) / 255.0
        src_depth_tensor = preprocess_image(Image.fromarray(src_depth)).to(self.device)
        
        print("Running SHMT inference...")
        
        with torch.no_grad():
            with autocast("cuda"):
                # Extract face regions (simplified)
                source_face = source_tensor
                ref_face = ref_tensor
                source_face_gray = torch.mean(source_face, dim=1, keepdim=True)
                
                # Background (simplified - use original source)
                source_bg = source_tensor
                
                # H0 level processing (high-frequency details)
                if hasattr(self.h0_model, 'lap_pyr_c1'):
                    source_HF_0 = self.h0_model.lap_pyr_c1.pyramid_decom(source_face_gray)[0]  # h0
                    source_HF_0_down4 = F.pixel_unshuffle(source_HF_0, downscale_factor=4)
                else:
                    # Fallback if laplacian pyramid not available
                    source_HF_0_down4 = F.pixel_unshuffle(source_face_gray, downscale_factor=4)
                
                source_depth_down4 = F.pixel_unshuffle(src_depth_tensor, downscale_factor=4)
                source_HF = torch.cat([source_HF_0_down4, source_depth_down4], dim=1)
                
                ref_LF_64 = F.pixel_unshuffle(ref_face, downscale_factor=4)
                source_face_seg_64 = F.interpolate(src_seg_tensor, size=(64, 64), mode='bilinear')
                
                # Encode to latent space
                encoder_posterior_bg = self.h0_model.encode_first_stage(source_bg)
                z_bg = self.h0_model.get_first_stage_encoding(encoder_posterior_bg).detach()
                
                encoder_posterior_ref_LF = self.h0_model.encode_first_stage(ref_face)
                z_ref_LF = self.h0_model.get_first_stage_encoding(encoder_posterior_ref_LF).detach()
                
                # Prepare model kwargs
                test_model_kwargs = {
                    'z_bg': z_bg,
                    'source_HF': source_HF,
                    'z_ref_LF': z_ref_LF,
                    'ref_LF_64': ref_LF_64,
                    'source_face_seg_64': source_face_seg_64,
                    'source_seg_onehot': src_seg_tensor,
                    'ref_seg_onehot': ref_seg_tensor
                }
                
                # Unconditional conditioning for guidance
                uc = None
                if guidance_scale != 1.0 and hasattr(self.h0_model, 'learnable_vector'):
                    uc = self.h0_model.learnable_vector
                
                # Sample with H0 model
                shape = [3, 64, 64]  # latent shape
                samples_ddim, _ = self.h0_sampler.sample(
                    S=ddim_steps,
                    batch_size=1,
                    shape=shape,
                    verbose=False,
                    unconditional_guidance_scale=guidance_scale,
                    unconditional_conditioning=uc,
                    eta=0.0,
                    test_model_kwargs=test_model_kwargs
                )
                
                # Decode to image space
                x_samples_ddim = self.h0_model.decode_first_stage(samples_ddim)
                
                # Post-process
                result = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
                
                # Convert to PIL
                result_np = result[0].cpu().permute(1, 2, 0).numpy()
                result_img = Image.fromarray((result_np * 255).astype(np.uint8))
        
        # Save result
        output_path = "output.png"
        result_img.save(output_path)
        print(f"SHMT inference complete! Result saved to {output_path}")
        
        return CogPath(output_path)