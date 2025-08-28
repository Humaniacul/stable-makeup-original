import base64
import io
import os
import sys
import subprocess
import tempfile
from pathlib import Path as FsPath

import requests
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from omegaconf import OmegaConf

import runpod


def ensure_shmt_code():
    shmt_dir = FsPath("/workspace/SHMT")
    if not shmt_dir.exists() or not (shmt_dir / "ldm").exists():
        shmt_dir.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            "git", "clone", "--depth", "1",
            "https://github.com/snowfallingplum/shmt.git", str(shmt_dir)
        ], check=True)
    if str(shmt_dir) not in sys.path:
        sys.path.insert(0, str(shmt_dir))


def download_file(url: str, output_path: FsPath):
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(output_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def download_gdrive_file(file_id: str, output_path: FsPath):
    try:
        import gdown
        gdown.download(f"https://drive.google.com/uc?id={file_id}", str(output_path), quiet=False)
    except Exception:
        download_file(f"https://drive.google.com/uc?export=download&id={file_id}", output_path)


def setup_shmt_weights():
    models_dir = FsPath("/workspace/models")
    models_dir.mkdir(parents=True, exist_ok=True)

    h0_id = os.getenv("MAKEUP_SHMT_H0_ID", "1zed2At-qnIOXewkZsGq8GODEIxmaxMAE")
    h4_id = os.getenv("MAKEUP_SHMT_H4_ID", "19Kt-5wgqyLty_v8G-oez8COjDqEcApDF")
    vqf4_url = os.getenv("MAKEUP_SHMT_VQF4_URL", "https://ommer-lab.com/files/latent-diffusion/vq-f4.zip")

    h0_path = models_dir / "shmt_h0.pth"
    if not h0_path.exists():
        download_gdrive_file(h0_id, h0_path)

    h4_path = models_dir / "shmt_h4.pth"
    if not h4_path.exists():
        download_gdrive_file(h4_id, h4_path)

    vqf4_dir = models_dir / "vq-f4"
    vqf4_dir.mkdir(exist_ok=True)
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
        z = models_dir / "vq-f4.zip"
        download_file(vqf4_url, z)
        import zipfile
        with zipfile.ZipFile(z, 'r') as zip_ref:
            zip_ref.extractall(vqf4_dir)
        z.unlink()
        for cand in candidate_ckpts:
            if cand.exists():
                vqf4_path = cand
                break
        if vqf4_path is None:
            for root, _, files in os.walk(vqf4_dir):
                for f in files:
                    if f.endswith('.ckpt'):
                        vqf4_path = FsPath(root) / f
                        break
                if vqf4_path is not None:
                    break

    return {
        "h0_path": str(h0_path),
        "h4_path": str(h4_path),
        "vqf4_path": str(vqf4_path) if vqf4_path is not None else ""
    }


def load_model_from_config(config, ckpt):
    from ldm.util import instantiate_from_config
    pl_sd = torch.load(ckpt, map_location="cpu")
    sd = pl_sd["state_dict"]
    model = instantiate_from_config(config.model)
    model.load_state_dict(sd, strict=False)
    model.cuda().eval()
    return model


def preprocess_image(image, size=(256, 256)):
    image = image.resize(size, Image.LANCZOS)
    arr = np.array(image).astype(np.float32) / 255.0
    arr = (arr - 0.5) / 0.5
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
    return tensor


def generate_simple_segmentation(image: Image.Image):
    img = np.array(image)
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    cy, cx = h // 2, w // 2
    ry = int(h * 0.35)
    rx = int(w * 0.28)
    mask[max(0, cy - ry):min(h, cy + ry), max(0, cx - rx):min(w, cx + rx)] = 1
    return mask


def pil_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# Global state
MODELS = None


def init_models():
    global MODELS
    if MODELS is not None:
        return MODELS
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)
    ensure_shmt_code()
    from ldm.models.diffusion.ddim_test import DDIMSampler
    weights = setup_shmt_weights()
    h0_cfg = OmegaConf.load("/workspace/SHMT/configs/latent-diffusion/shmt_h0.yaml")
    h0_cfg.model.params.first_stage_config.params.ckpt_path = weights['vqf4_path']
    h0 = load_model_from_config(h0_cfg, weights['h0_path'])
    h0_sampler = DDIMSampler(h0)
    MODELS = {
        "device": torch.device("cuda" if torch.cuda.is_available() else "cpu"),
        "h0": h0,
        "h0_sampler": h0_sampler,
    }
    return MODELS


def handler(event):
    try:
        print(f"Handler called with event: {event}")
        models = init_models()
        device = models["device"]
        h0 = models["h0"]
        h0_sampler = models["h0_sampler"]

        inp = event.get("input", {})
        source_url = inp.get("source_url")
        reference_url = inp.get("reference_url")
        ddim_steps = min(100, max(1, int(inp.get("ddim_steps", 50))))
        guidance_scale = max(0.1, min(3.0, float(inp.get("guidance_scale", 1.0))))

        if not source_url or not reference_url:
            return {"error": "source_url and reference_url are required"}
        
        print(f"Processing: source={source_url}, ref={reference_url}, steps={ddim_steps}")
    except Exception as e:
        return {"error": f"Setup failed: {str(e)}"}

    try:
        with tempfile.TemporaryDirectory() as td:
            td = FsPath(td)
            src_path = td / "src.png"
            ref_path = td / "ref.png"
            print("Downloading images...")
            download_file(source_url, src_path)
            download_file(reference_url, ref_path)
            src_img = Image.open(src_path).convert('RGB')
            ref_img = Image.open(ref_path).convert('RGB')
            print(f"Images loaded: src={src_img.size}, ref={ref_img.size}")

        print("Preprocessing...")
        source_tensor = preprocess_image(src_img).to(device)
        ref_tensor = preprocess_image(ref_img).to(device)
        src_seg = generate_simple_segmentation(src_img.resize((256, 256)))
        ref_seg = generate_simple_segmentation(ref_img.resize((256, 256)))
        src_seg_tensor = torch.from_numpy(src_seg).float().unsqueeze(0).unsqueeze(0).to(device)

        print("Running inference...")
        with torch.no_grad():
            source_face = source_tensor
            ref_face = ref_tensor
            source_face_gray = torch.mean(source_face, dim=1, keepdim=True)
            source_bg = source_tensor

            source_HF_0_down4 = F.pixel_unshuffle(source_face_gray, downscale_factor=4)
            source_HF = torch.cat([source_HF_0_down4, source_HF_0_down4], dim=1)
            ref_LF_64 = F.pixel_unshuffle(ref_face, downscale_factor=4)
            source_face_seg_64 = F.interpolate(src_seg_tensor, size=(64, 64), mode='bilinear')

            enc_bg = h0.encode_first_stage(source_bg)
            z_bg = h0.get_first_stage_encoding(enc_bg).detach()
            enc_ref = h0.encode_first_stage(ref_face)
            z_ref_LF = h0.get_first_stage_encoding(enc_ref).detach()

            test_model_kwargs = {
                'z_bg': z_bg,
                'source_HF': source_HF,
                'z_ref_LF': z_ref_LF,
                'ref_LF_64': ref_LF_64,
                'source_face_seg_64': source_face_seg_64,
                'source_seg_onehot': src_seg_tensor,
                'ref_seg_onehot': src_seg_tensor
            }
            uc = None
            shape = [3, 64, 64]
            samples_ddim, _ = h0_sampler.sample(
                S=ddim_steps,
                batch_size=1,
                shape=shape,
                verbose=False,
                unconditional_guidance_scale=guidance_scale,
                unconditional_conditioning=uc,
                eta=0.0,
                test_model_kwargs=test_model_kwargs
            )
            x_samples_ddim = h0.decode_first_stage(samples_ddim)
            result = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
            result_np = result[0].cpu().permute(1, 2, 0).numpy()
            result_img = Image.fromarray((result_np * 255).astype(np.uint8))

        print("Inference complete!")
        return {"image_base64": pil_to_b64(result_img)}
    
    except Exception as e:
        print(f"Inference error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Inference failed: {str(e)}"}


runpod.serverless.start({"handler": handler})


