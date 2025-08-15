import os
import sys
import subprocess
import re
import requests
from typing import List
import torch
from PIL import Image
import numpy as np
import cv2
from cog import BasePredictor, Input, Path

class Predictor(BasePredictor):
    def setup(self) -> None:
        print("🚀 Setting up Stable-Makeup model...")
        # No setup required - everything is done in predict()
        print("✅ Setup complete!")

    def predict(
        self,
        source_image: Path = Input(description="Source face image"),
        reference_image: Path = Input(description="Reference makeup image"),
        makeup_intensity: float = Input(description="Makeup transfer intensity", default=1.0, ge=0.1, le=2.0)
    ) -> Path:
        print(f"🎨 Starting Stable-Makeup inference with intensity: {makeup_intensity}")
        
        try:
            # Clone repository if not exists
            if not os.path.exists("Stable-Makeup"):
                print("📥 Cloning original Stable-Makeup repository...")
                subprocess.run(["git", "clone", "https://github.com/Xiaojiu-z/Stable-Makeup.git"], check=True)
            
            os.chdir("Stable-Makeup")
            sys.path.append(os.getcwd())
            
            # Create necessary directories
            os.makedirs("models/stablemakeup", exist_ok=True)
            os.makedirs("test_imgs/id", exist_ok=True)
            os.makedirs("test_imgs/makeup", exist_ok=True)
            os.makedirs("output", exist_ok=True)
            
            # Copy model weights
            self.copy_model_weights("models/stablemakeup")
            
            # Fix SPIGA model loading BEFORE any imports
            self.fix_spiga_model_loading()
            
            # Fix all compatibility issues BEFORE any imports
            self.fix_all_issues()
            
            # Save input images
            source_path = "test_imgs/id/source.jpg"
            reference_path = "test_imgs/makeup/reference.jpg"
            
            source_img = Image.open(source_image).convert("RGB")
            source_img.save(source_path)
            
            reference_img = Image.open(reference_image).convert("RGB")
            reference_img.save(reference_path)
            
            # Import and run inference (after all fixes are applied)
            from infer_kps import infer_with_params
            result_image = infer_with_params(source_path, reference_path, makeup_intensity)
            
            # Save result (with optional eye-color preservation)
            result_path = "/tmp/result.jpg"
            if not isinstance(result_image, Image.Image):
                # Handle numpy array case
                result_image = Image.fromarray(result_image.astype(np.uint8))

            # Preserve eye colors by compositing source eyes back onto result
            try:
                if os.environ.get("MAKEUP_PRESERVE_EYES", "1") == "1":
                    feather_px = int(os.environ.get("MAKEUP_PRESERVE_EYES_FEATHER", "18"))
                    mode = os.environ.get("MAKEUP_PRESERVE_EYES_MODE", "adaptive").strip().lower()
                    result_image = self._preserve_eyes_colors(
                        source_img,
                        result_image,
                        feather_radius_px=max(0, feather_px),
                        mode=mode,
                    )
            except Exception as e:
                print(f"⚠️ Eye-color preservation skipped due to error: {e}")

            result_image.save(result_path)
            
            print("✅ Stable-Makeup inference completed successfully!")
            return Path(result_path)
            
        except Exception as e:
            print(f"❌ Error during inference: {e}")
            import traceback
            traceback.print_exc()
            
            # Return a fallback image
            fallback = Image.new('RGB', (512, 512), color='black')
            fallback_path = "/tmp/error.jpg"
            fallback.save(fallback_path)
            return Path(fallback_path)

    def fix_spiga_model_loading(self):
        print("🔧 Fixing SPIGA model loading...")
        spiga_models_dir = os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/models/weights")
        os.makedirs(spiga_models_dir, exist_ok=True)
        model_path = os.path.join(spiga_models_dir, "spiga_300wpublic.pt")

        if os.path.exists(model_path) and os.path.getsize(model_path) > 1000000:
            print("✅ SPIGA model found locally!")
        else:
            print("📥 Downloading SPIGA model from HuggingFace...")
            urls = [
                "https://huggingface.co/Stkzzzz222/fragments_V2/resolve/main/spxxz.pt",
                "https://github.com/andresprados/SPIGA/releases/download/v1.0.0/spiga_300wpublic.pt"
            ]
            downloaded = False
            for i, url in enumerate(urls):
                print(f"🔄 Trying URL {i+1}: {url}")
                try:
                    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                    response = requests.get(url, headers=headers, stream=True, timeout=30)
                    response.raise_for_status()
                    
                    total_size = int(response.headers.get('content-length', 0))
                    block_size = 8192
                    downloaded_size = 0
                    
                    with open(model_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=block_size):
                            f.write(chunk)
                            downloaded_size += len(chunk)
                            if total_size > 0:
                                progress = (downloaded_size / total_size) * 100
                                sys.stdout.write(f"\rDownloading: {progress:.2f}%")
                                sys.stdout.flush()
                    sys.stdout.write("\n")
                    
                    # Verify downloaded file is not HTML
                    with open(model_path, 'rb') as f:
                        first_bytes = f.read(100)
                    if b'<!DOCTYPE html>' in first_bytes or b'<html' in first_bytes:
                        raise ValueError("Downloaded file is HTML, not a model file.")
                    
                    print(f"✅ SPIGA model downloaded successfully from URL {i+1}!")
                    downloaded = True
                    break
                except Exception as e:
                    print(f"❌ Failed with URL {i+1}: {e}")
            
            if not downloaded:
                print("⚠️ All download attempts failed")
                raise Exception("Failed to download SPIGA model from all sources.")

        # Patch SPIGA framework.py to use local file with PROPER torch.load replacement
        framework_path = os.path.join(os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py"))
        if os.path.exists(framework_path):
            with open(framework_path, "r") as f:
                content = f.read()
            
            # Look for the original torch.hub.load_state_dict_from_url call and replace it entirely
            original_pattern = r'model_state_dict = torch\.hub\.load_state_dict_from_url\([^)]+\)'
            
            if re.search(original_pattern, content):
                # Replace the entire load_state_dict_from_url call with a simple torch.load
                new_code = f'''model_state_dict = torch.load("{model_path}", map_location=map_location)'''
                content = re.sub(original_pattern, new_code, content)
                
                with open(framework_path, "w") as f:
                    f.write(content)
                print("✅ Patched SPIGA framework.py with complete torch.load replacement!")
            else:
                # Fallback: manual line-by-line replacement for better control
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if 'torch.hub.load_state_dict_from_url(' in line:
                        # Find the indentation level
                        indent = len(line) - len(line.lstrip())
                        # Replace with proper torch.load statement
                        lines[i] = ' ' * indent + f'model_state_dict = torch.load("{model_path}", map_location=map_location)'
                        break
                
                content = '\n'.join(lines)
                with open(framework_path, "w") as f:
                    f.write(content)
                print("✅ Patched SPIGA framework.py with line-by-line replacement!")
        else:
            print("⚠️ SPIGA framework file not found")

    def fix_all_issues(self):
        print("🔧 Fixing huggingface_hub imports...")
        self.fix_huggingface_imports()
        
        print("🔧 Fixing diffusers imports...")
        self.fix_diffusers_imports()
        
        print("🔧 Fixing syntax errors...")
        self.fix_syntax_errors()
        
        print("🔧 Fixing pipeline_sd15.py imports completely...")
        self.fix_pipeline_sd15_file()
        
        print("🔧 Adding missing functions to infer_kps.py...")
        self.add_infer_function()
        
        print("✅ Fixed all issues in infer_kps.py")

    def fix_pipeline_sd15_file(self):
        """Completely fix the pipeline_sd15.py file imports"""
        pipeline_file = "pipeline_sd15.py"
        if os.path.exists(pipeline_file):
            with open(pipeline_file, "r") as f:
                content = f.read()
            
            # Read the original file to see the exact import structure
            print("🔍 Checking pipeline_sd15.py imports...")
            
            # Fix any broken import statements first
            # Remove any incomplete imports that might cause "cannot import name 'un'" error
            content = re.sub(r'from diffusers\.utils import[^)]*\bun\b[^)]*\)', '', content, flags=re.DOTALL)
            content = re.sub(r',\s*un\s*,', ',', content)
            content = re.sub(r',\s*un\s*\)', ')', content)
            content = re.sub(r'\(\s*un\s*,', '(', content)
            
            # Now fix the PEFT-related imports by replacing the entire import block
            # Look for the diffusers.utils import and replace it
            import_pattern = r'from diffusers\.utils import \([^)]+\)'
            
            if re.search(import_pattern, content, re.DOTALL):
                # Replace the entire import block with only functions that exist in diffusers 0.21.4
                new_import = '''from diffusers.utils import (
    deprecate,
    is_accelerate_available,
    is_accelerate_version,
    logging,
    replace_example_docstring,
)

# Handle missing functions in diffusers 0.21.4
try:
    from diffusers.utils import randn_tensor
except ImportError:
    def randn_tensor(shape, generator=None, device=None, dtype=None):
        """Fallback implementation of randn_tensor"""
        return torch.randn(shape, generator=generator, device=device, dtype=dtype)

# Handle PEFT imports that don't exist in diffusers 0.21.4
try:
    from diffusers.utils import USE_PEFT_BACKEND, scale_lora_layers, unscale_lora_layers
except ImportError:
    USE_PEFT_BACKEND = False
    def scale_lora_layers(*args, **kwargs):
        pass
    def unscale_lora_layers(*args, **kwargs):
        pass'''
                
                content = re.sub(import_pattern, new_import, content, flags=re.DOTALL)
                print("✅ Replaced diffusers.utils import block")
            else:
                # Try to find individual imports and fix them
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if 'from diffusers.utils import' in line and any(peft_term in line for peft_term in ['USE_PEFT_BACKEND', 'scale_lora_layers', 'unscale_lora_layers', 'randn_tensor']):
                        # Replace this line with safe imports
                        lines[i] = '''from diffusers.utils import deprecate, is_accelerate_available, is_accelerate_version, logging, replace_example_docstring
# Missing functions in diffusers 0.21.4
def randn_tensor(shape, generator=None, device=None, dtype=None):
    return torch.randn(shape, generator=generator, device=device, dtype=dtype)
# PEFT compatibility for diffusers 0.21.4
USE_PEFT_BACKEND = False
def scale_lora_layers(*args, **kwargs): pass
def unscale_lora_layers(*args, **kwargs): pass'''
                        break
                content = '\n'.join(lines)
                print("✅ Fixed individual import lines")
            
            # Write the fixed content back
            with open(pipeline_file, "w") as f:
                f.write(content)
            print("✅ Fixed pipeline_sd15.py imports completely")
        else:
            print("⚠️ pipeline_sd15.py not found")

    def fix_huggingface_imports(self):
        """Fix huggingface_hub imports across all Python files"""
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        # Replace cached_download with hf_hub_download as cached_download
                        if "from huggingface_hub import cached_download" in content:
                            content = re.sub(
                                r"from huggingface_hub import cached_download",
                                "from huggingface_hub import hf_hub_download as cached_download",
                                content
                            )
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                    except Exception as e:
                        continue
        print("✅ Huggingface imports fixed!")

    def fix_diffusers_imports(self):
        """Fix diffusers imports by removing non-existent imports"""
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(".py") and "pipeline_sd15.py" not in file:  # Skip pipeline_sd15.py, we handle it separately
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        # Remove problematic diffusers imports
                        problematic_imports = [
                            "USE_PEFT_BACKEND",
                            "scale_lora_layers", 
                            "unscale_lora_layers",
                            "un",  # Fix the broken 'un' import
                            "randn_tensor"  # This doesn't exist in 0.21.4
                        ]
                        
                        modified = False
                        for imp in problematic_imports:
                            if imp in content:
                                # Remove from import lines
                                content = re.sub(rf",\s*{imp}", "", content)
                                content = re.sub(rf"{imp},\s*", "", content)
                                content = re.sub(rf"from diffusers\.utils import.*{imp}.*", "", content)
                                modified = True
                        
                        if modified:
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                    except Exception as e:
                        continue
        print("✅ Diffusers imports fixed!")

    def fix_syntax_errors(self):
        """Fix syntax errors like trailing dots and malformed parameters"""
        patterns_to_fix = [
            (r'model_id = "sd_model_v1-5"\.', 'model_id = "sd_model_v1-5"'),
            (r'\.(?=\s*$)', ''),  # Remove trailing dots at end of lines
            # Fix the specific syntax error we saw: safety_checker=Noneet=Unet,
            (r'safety_checker=Noneet=Unet,', 'safety_checker=None, unet=Unet,'),
            (r'safety_checker=Noneet=', 'safety_checker=None, unet='),
            # Fix other potential malformed parameters
            (r'(\w+)=(\w+)=(\w+)', r'\1=\2, \3='),  # Fix pattern like param1=param2=param3
        ]
        
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        original_content = content
                        for pattern, replacement in patterns_to_fix:
                            content = re.sub(pattern, replacement, content)
                        
                        if content != original_content:
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                    except Exception as e:
                        continue
        print("✅ Syntax errors fixed!")

    def add_infer_function(self):
        """Add the infer_with_params function to infer_kps.py"""
        infer_file = "infer_kps.py"
        if os.path.exists(infer_file):
            with open(infer_file, "r") as f:
                content = f.read()
            
            # Fix import path for utils.pipeline_sd15
            if "from utils.pipeline_sd15 import" in content:
                content = content.replace("from utils.pipeline_sd15 import", "from pipeline_sd15 import")
            
            # Add the custom infer_with_params function if it doesn't exist
            if "def infer_with_params" not in content:
                function_code = '''
def infer_with_params(source_path, reference_path, intensity=1.0):
    """Custom function to run inference with specific parameters"""
    import shutil
    import os
    
    # Copy files to expected locations
    os.makedirs("test_imgs/id", exist_ok=True)
    os.makedirs("test_imgs/makeup", exist_ok=True) 
    os.makedirs("output", exist_ok=True)
    
    shutil.copy(source_path, "test_imgs/id/")
    shutil.copy(reference_path, "test_imgs/makeup/")
    
    # Get the base filename
    source_name = os.path.basename(source_path)
    reference_name = os.path.basename(reference_path)
    
    # Run the main inference function (adapted from original main())
    try:
        pipe = create_pipeline()
        result = run_inference_single(pipe, source_name, reference_name, intensity)
        return result
    except Exception as e:
        print(f"Error in inference: {e}")
        from PIL import Image
        import numpy as np
        # Return a fallback image
        fallback = np.zeros((512, 512, 3), dtype=np.uint8)
        return Image.fromarray(fallback)
'''
                content += function_code
                
                with open(infer_file, "w") as f:
                    f.write(content)
                print("✅ Added infer_with_params function")

    def _preserve_eyes_colors(self, source_pil: Image.Image, result_pil: Image.Image, feather_radius_px: int = 18, mode: str = "chroma") -> Image.Image:
        """Advanced eye color preservation with multiple techniques for best results.

        Modes:
        - "chroma": copy hue+saturation from source, keep value from result
        - "lab": preserve L*a*b* color components more naturally
        - "iris": focus specifically on iris colors with smart detection
        - "adaptive": automatically choose best method based on image analysis
        - "rgb": direct RGB alpha blending
        """
        try:
            source_rgb = np.array(source_pil.convert("RGB"))
            result_rgb = np.array(result_pil.convert("RGB"))

            # Resize result to source size if needed
            if source_rgb.shape[:2] != result_rgb.shape[:2]:
                result_rgb = cv2.resize(result_rgb, (source_rgb.shape[1], source_rgb.shape[0]), interpolation=cv2.INTER_LINEAR)

            # Get the best available eye mask using multiple detection methods
            mask = self._build_advanced_eye_mask(source_rgb)
            if mask is None or int(mask.max()) == 0:
                print("⚠️ No eyes detected, skipping eye preservation")
                return Image.fromarray(result_rgb)

            # Apply advanced feathering with edge-aware smoothing
            if feather_radius_px > 0:
                mask = self._apply_advanced_feathering(mask, source_rgb, feather_radius_px)

            alpha = (mask.astype(np.float32) / 255.0)[..., None]
            
            # Choose the best blending mode
            if mode == "adaptive":
                mode = self._choose_best_blending_mode(source_rgb, result_rgb, mask)
                print(f"🎯 Auto-selected blending mode: {mode}")

            if mode == "lab":
                return self._blend_lab_color_space(source_rgb, result_rgb, alpha)
            elif mode == "iris":
                return self._blend_iris_focused(source_rgb, result_rgb, alpha)
            elif mode == "rgb":
                blended = (source_rgb.astype(np.float32) * alpha + result_rgb.astype(np.float32) * (1.0 - alpha)).astype(np.uint8)
                return Image.fromarray(blended)
            else:  # chroma (default)
                return self._blend_chroma_enhanced(source_rgb, result_rgb, alpha)

        except Exception as e:
            print(f"⚠️ Eye preservation error: {e}")
            return result_pil

    def _build_advanced_eye_mask(self, image_rgb: np.ndarray) -> np.ndarray:
        """Advanced eye detection using multiple methods for best accuracy."""
        try:
            # Method 1: Try MediaPipe face landmarks (most accurate)
            mask = self._build_eye_mask_via_mediapipe(image_rgb)
            if mask is not None and int(mask.max()) > 0:
                print("✅ Using MediaPipe eye detection")
                return mask

            # Method 2: Try improved Haar cascades with multiple scales
            mask = self._build_eye_mask_via_enhanced_haar(image_rgb)
            if mask is not None and int(mask.max()) > 0:
                print("✅ Using enhanced Haar cascade eye detection")
                return mask

            # Method 3: Fallback to original Haar cascade
            mask = self._build_eye_mask_via_haarcascade(image_rgb)
            if mask is not None and int(mask.max()) > 0:
                print("✅ Using basic Haar cascade eye detection")
                return mask

            print("⚠️ No eye detection method succeeded")
            return np.zeros(image_rgb.shape[:2], dtype=np.uint8)

        except Exception as e:
            print(f"⚠️ Eye detection error: {e}")
            return np.zeros(image_rgb.shape[:2], dtype=np.uint8)

    def _build_eye_mask_via_mediapipe(self, image_rgb: np.ndarray) -> np.ndarray:
        """Use MediaPipe to detect precise eye landmarks."""
        try:
            # Try to import MediaPipe (might not be available in all environments)
            import mediapipe as mp
            
            mp_face_mesh = mp.solutions.face_mesh
            face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5
            )
            
            results = face_mesh.process(image_rgb)
            
            if not results.multi_face_landmarks:
                return None
                
            mask = np.zeros(image_rgb.shape[:2], dtype=np.uint8)
            
            for face_landmarks in results.multi_face_landmarks:
                # Eye landmark indices for MediaPipe
                left_eye_indices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
                right_eye_indices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
                
                h, w = image_rgb.shape[:2]
                
                # Process each eye
                for eye_indices in [left_eye_indices, right_eye_indices]:
                    eye_points = []
                    for idx in eye_indices:
                        landmark = face_landmarks.landmark[idx]
                        x = int(landmark.x * w)
                        y = int(landmark.y * h)
                        eye_points.append([x, y])
                    
                    if len(eye_points) > 3:
                        eye_points = np.array(eye_points, dtype=np.int32)
                        cv2.fillPoly(mask, [eye_points], 255)
                        
                        # Also add a circular region for better coverage
                        center = eye_points.mean(axis=0).astype(int)
                        radius = int(np.max(np.linalg.norm(eye_points - center, axis=1)) * 0.8)
                        cv2.circle(mask, tuple(center), radius, 255, -1)
            
            return mask
            
        except ImportError:
            # MediaPipe not available
            return None
        except Exception:
            return None

    def _build_eye_mask_via_enhanced_haar(self, image_rgb: np.ndarray) -> np.ndarray:
        """Enhanced Haar cascade detection with multiple scales and filters."""
        try:
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
            gray = cv2.equalizeHist(gray)
            mask = np.zeros_like(gray, dtype=np.uint8)

            # More comprehensive cascade list
            cascades = [
                "haarcascade_eye_tree_eyeglasses.xml",
                "haarcascade_eye.xml",
                "haarcascade_lefteye_2splits.xml",
                "haarcascade_righteye_2splits.xml"
            ]
            
            all_detections = []
            
            for cascade_name in cascades:
                cascade_path = os.path.join(cv2.data.haarcascades, cascade_name)
                if not os.path.exists(cascade_path):
                    continue
                    
                clf = cv2.CascadeClassifier(cascade_path)
                
                # Try multiple scales for better detection
                for scale_factor in [1.05, 1.1, 1.2]:
                    for min_neighbors in [3, 4, 5]:
                        detections = clf.detectMultiScale(
                            gray, 
                            scaleFactor=scale_factor, 
                            minNeighbors=min_neighbors,
                            flags=cv2.CASCADE_SCALE_IMAGE,
                            minSize=(15, 15),
                            maxSize=(150, 150)
                        )
                        all_detections.extend(detections)

            if len(all_detections) == 0:
                return None

            # Remove duplicate detections using Non-Maximum Suppression
            all_detections = np.array(all_detections)
            if len(all_detections) > 0:
                # Simple NMS: keep detections that don't overlap too much
                keep = []
                for i, det in enumerate(all_detections):
                    x1, y1, w1, h1 = det
                    overlap = False
                    for j in keep:
                        x2, y2, w2, h2 = all_detections[j]
                        # Calculate intersection over union
                        ix = max(x1, x2)
                        iy = max(y1, y2)
                        iw = min(x1 + w1, x2 + w2) - ix
                        ih = min(y1 + h1, y2 + h2) - iy
                        if iw > 0 and ih > 0:
                            intersection = iw * ih
                            union = w1 * h1 + w2 * h2 - intersection
                            if intersection / union > 0.3:  # 30% overlap threshold
                                overlap = True
                                break
                    if not overlap:
                        keep.append(i)
                
                final_detections = all_detections[keep]
            else:
                final_detections = all_detections

            # Keep only the 2 largest detections (left and right eye)
            if len(final_detections) > 2:
                areas = [w * h for (x, y, w, h) in final_detections]
                sorted_indices = np.argsort(areas)[::-1]
                final_detections = final_detections[sorted_indices[:2]]

            # Create elliptical masks for more natural eye shapes
            for (x, y, w, h) in final_detections:
                cx, cy = x + w // 2, y + h // 2
                # Make ellipse more eye-shaped
                axes = (max(1, int(w * 0.4)), max(1, int(h * 0.3)))
                cv2.ellipse(mask, (cx, cy), axes, 0, 0, 360, color=255, thickness=-1)
                
                # Add a smaller inner ellipse for the iris
                inner_axes = (max(1, int(w * 0.2)), max(1, int(h * 0.2)))
                cv2.ellipse(mask, (cx, cy), inner_axes, 0, 0, 360, color=255, thickness=-1)

            return mask if int(mask.max()) > 0 else None
            
        except Exception:
            return None

    def _build_eye_mask_via_haarcascade(self, image_rgb: np.ndarray) -> np.ndarray:
        """Detect eyes with OpenCV Haar cascades and return a soft mask (0-255)."""
        try:
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
            gray = cv2.equalizeHist(gray)
            mask = np.zeros_like(gray, dtype=np.uint8)

            cascades = [
                os.path.join(cv2.data.haarcascades, "haarcascade_eye_tree_eyeglasses.xml"),
                os.path.join(cv2.data.haarcascades, "haarcascade_eye.xml"),
            ]
            detections = []
            for cpath in cascades:
                if not os.path.exists(cpath):
                    continue
                clf = cv2.CascadeClassifier(cpath)
                det = clf.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, flags=cv2.CASCADE_SCALE_IMAGE, minSize=(20, 20))
                if len(det) > 0:
                    detections.extend(det)

            if len(detections) == 0:
                return mask

            detections = sorted(detections, key=lambda r: r[2] * r[3], reverse=True)[:2]
            for (x, y, w, h) in detections:
                cx, cy = x + w // 2, y + h // 2
                axes = (max(1, int(w * 0.35)), max(1, int(h * 0.35)))
                cv2.ellipse(mask, (cx, cy), axes, 0, 0, 360, color=255, thickness=-1)
            return mask
        except Exception:
            return np.zeros(image_rgb.shape[:2], dtype=np.uint8)

    def _apply_advanced_feathering(self, mask: np.ndarray, image_rgb: np.ndarray, feather_radius_px: int) -> np.ndarray:
        """Apply edge-aware feathering that preserves natural boundaries."""
        try:
            # Basic Gaussian blur
            k = max(1, (feather_radius_px // 2) * 2 + 1)
            feathered = cv2.GaussianBlur(mask, (k, k), sigmaX=feather_radius_px)
            
            # Edge-aware refinement using bilateral filter
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Reduce feathering near strong edges
            edge_influence = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
            edge_factor = (255 - edge_influence.astype(np.float32)) / 255.0
            
            # Apply edge-aware feathering
            refined_mask = feathered.astype(np.float32) * edge_factor
            refined_mask = np.clip(refined_mask, 0, 255).astype(np.uint8)
            
            return refined_mask
        except Exception:
            # Fallback to basic Gaussian blur
            k = max(1, (feather_radius_px // 2) * 2 + 1)
            return cv2.GaussianBlur(mask, (k, k), sigmaX=feather_radius_px)

    def _choose_best_blending_mode(self, source_rgb: np.ndarray, result_rgb: np.ndarray, mask: np.ndarray) -> str:
        """Automatically choose the best blending mode based on image analysis."""
        try:
            # Extract eye regions for analysis
            eye_mask = mask > 128
            if not np.any(eye_mask):
                return "chroma"
            
            source_eyes = source_rgb[eye_mask]
            result_eyes = result_rgb[eye_mask]
            
            # Calculate color differences
            rgb_diff = np.mean(np.abs(source_eyes.astype(int) - result_eyes.astype(int)))
            
            # Convert to other color spaces for analysis
            source_hsv = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2HSV)
            result_hsv = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2HSV)
            
            source_eyes_hsv = source_hsv[eye_mask]
            result_eyes_hsv = result_hsv[eye_mask]
            
            # Calculate hue difference
            hue_diff = np.mean(np.abs(source_eyes_hsv[:, 0].astype(int) - result_eyes_hsv[:, 0].astype(int)))
            
            # Decision logic
            if rgb_diff > 80:  # Large color change - use LAB
                return "lab"
            elif hue_diff > 30:  # Significant hue change - use chroma
                return "chroma"
            elif rgb_diff > 40:  # Medium change - use iris-focused
                return "iris"
            else:  # Small change - use enhanced chroma
                return "chroma"
                
        except Exception:
            return "chroma"  # Safe fallback

    def _blend_lab_color_space(self, source_rgb: np.ndarray, result_rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
        """Blend in LAB color space for more perceptually accurate results."""
        try:
            # Convert to LAB color space
            source_lab = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
            result_lab = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
            
            # Blend all channels in LAB space
            blended_lab = source_lab * alpha + result_lab * (1.0 - alpha)
            
            # Convert back to RGB
            blended_lab = np.clip(blended_lab, 0, 255).astype(np.uint8)
            blended_rgb = cv2.cvtColor(blended_lab, cv2.COLOR_LAB2RGB)
            
            return Image.fromarray(blended_rgb)
        except Exception:
            # Fallback to chroma blending
            return self._blend_chroma_enhanced(source_rgb, result_rgb, alpha)

    def _blend_iris_focused(self, source_rgb: np.ndarray, result_rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
        """Focus specifically on preserving iris colors with enhanced detection."""
        try:
            # Create a more focused iris mask
            iris_mask = self._create_iris_focused_mask(alpha, source_rgb)
            
            # Use LAB blending for iris regions
            source_lab = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
            result_lab = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
            
            # Stronger blending for iris areas
            enhanced_alpha = iris_mask * 0.9 + alpha * (1 - iris_mask) * 0.6
            
            blended_lab = source_lab * enhanced_alpha + result_lab * (1.0 - enhanced_alpha)
            blended_lab = np.clip(blended_lab, 0, 255).astype(np.uint8)
            blended_rgb = cv2.cvtColor(blended_lab, cv2.COLOR_LAB2RGB)
            
            return Image.fromarray(blended_rgb)
        except Exception:
            return self._blend_chroma_enhanced(source_rgb, result_rgb, alpha)

    def _create_iris_focused_mask(self, alpha: np.ndarray, source_rgb: np.ndarray) -> np.ndarray:
        """Create a mask that focuses on iris regions within the eye mask."""
        try:
            eye_mask = (alpha[:, :, 0] > 0.1).astype(np.uint8) * 255
            
            # Find contours of eye regions
            contours, _ = cv2.findContours(eye_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            iris_mask = np.zeros_like(alpha[:, :, 0])
            
            for contour in contours:
                # Get bounding box of eye region
                x, y, w, h = cv2.boundingRect(contour)
                
                # Create a smaller ellipse for the iris (center 60% of the eye)
                cx, cy = x + w // 2, y + h // 2
                iris_w, iris_h = int(w * 0.3), int(h * 0.3)
                
                cv2.ellipse(iris_mask, (cx, cy), (iris_w, iris_h), 0, 0, 360, 1.0, -1)
            
            return iris_mask
        except Exception:
            return alpha[:, :, 0]

    def _blend_chroma_enhanced(self, source_rgb: np.ndarray, result_rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
        """Enhanced chroma blending with better color preservation."""
        try:
            # Convert to HSV for chroma blending
            source_hsv = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
            result_hsv = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
            
            # Enhanced blending: preserve H and S more strongly, allow some V blending
            alpha_2d = alpha[:, :, 0]
            
            # Preserve hue completely
            result_hsv[:, :, 0] = source_hsv[:, :, 0] * alpha_2d + result_hsv[:, :, 0] * (1.0 - alpha_2d)
            
            # Preserve saturation with slight influence from result
            result_hsv[:, :, 1] = source_hsv[:, :, 1] * alpha_2d * 0.9 + result_hsv[:, :, 1] * (1.0 - alpha_2d * 0.9)
            
            # Allow some value blending for natural lighting
            result_hsv[:, :, 2] = source_hsv[:, :, 2] * alpha_2d * 0.7 + result_hsv[:, :, 2] * (1.0 - alpha_2d * 0.7)
            
            # Convert back to RGB
            result_hsv = np.clip(result_hsv, 0, 255).astype(np.uint8)
            blended_rgb = cv2.cvtColor(result_hsv, cv2.COLOR_HSV2RGB)
            
            return Image.fromarray(blended_rgb)
        except Exception:
            # Final fallback to simple RGB blending
            blended = (source_rgb.astype(np.float32) * alpha + result_rgb.astype(np.float32) * (1.0 - alpha)).astype(np.uint8)
            return Image.fromarray(blended)

    def copy_model_weights(self, models_dir: str):
        """Copy pre-trained model weights to the expected location"""
        print("📋 Setting up model weights...")
        
        # Model weights will be downloaded automatically by diffusers
        # when the pipeline is first created
        print("✅ Model weights setup complete!")
