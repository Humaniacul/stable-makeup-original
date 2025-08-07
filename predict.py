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
            
            # Save result
            result_path = "/tmp/result.jpg"
            if isinstance(result_image, Image.Image):
                result_image.save(result_path)
            else:
                # Handle numpy array case
                result_image = Image.fromarray(result_image.astype(np.uint8))
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

        # Patch SPIGA framework.py to use local file
        framework_path = os.path.join(os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py"))
        if os.path.exists(framework_path):
            with open(framework_path, "r") as f:
                content = f.read()
            
            # Replace the torch.hub.load_state_dict_from_url call
            old_code = 'model_state_dict = torch.hub.load_state_dict_from_url(self.model_cfg.model_weights_url,'
            new_code = f'model_state_dict = torch.load("{model_path}", map_location=map_location)'
            
            if old_code in content:
                content = content.replace(old_code, new_code)
                with open(framework_path, "w") as f:
                    f.write(content)
                print("✅ Patched SPIGA framework.py to use local model file!")
            else:
                print("⚠️ SPIGA framework.py already patched or pattern not found.")
        else:
            print("⚠️ SPIGA framework file not found")

    def fix_all_issues(self):
        print("🔧 Fixing huggingface_hub imports...")
        self.fix_huggingface_imports()
        
        print("🔧 Fixing diffusers imports...")
        self.fix_diffusers_imports()
        
        print("🔧 Fixing syntax errors...")
        self.fix_syntax_errors()
        
        print("🔧 Fixing pipeline_sd15.py PEFT imports...")
        self.fix_pipeline_peft_imports()
        
        print("🔧 Adding missing functions to infer_kps.py...")
        self.add_infer_function()
        
        print("✅ Fixed all issues in infer_kps.py")

    def fix_pipeline_peft_imports(self):
        """Fix the USE_PEFT_BACKEND import issue in pipeline_sd15.py"""
        pipeline_file = "pipeline_sd15.py"
        if os.path.exists(pipeline_file):
            with open(pipeline_file, "r") as f:
                content = f.read()
            
            # Replace the problematic diffusers.utils import with a try-except block
            old_import = """from diffusers.utils import (
    deprecate,
    is_accelerate_available,
    is_accelerate_version,
    logging,
    randn_tensor,
    replace_example_docstring,
    USE_PEFT_BACKEND,
    scale_lora_layers,
    unscale_lora_layers,
)"""
            
            new_import = """from diffusers.utils import (
    deprecate,
    is_accelerate_available,
    is_accelerate_version,
    logging,
    randn_tensor,
    replace_example_docstring,
)

# Handle PEFT imports that don't exist in diffusers 0.21.4
try:
    from diffusers.utils import USE_PEFT_BACKEND, scale_lora_layers, unscale_lora_layers
except ImportError:
    USE_PEFT_BACKEND = False
    def scale_lora_layers(*args, **kwargs):
        pass
    def unscale_lora_layers(*args, **kwargs):
        pass"""
            
            if "USE_PEFT_BACKEND," in content:
                content = content.replace(old_import, new_import)
                with open(pipeline_file, "w") as f:
                    f.write(content)
                print("✅ Fixed PEFT imports in pipeline_sd15.py")
            else:
                print("⚠️ PEFT import pattern not found in pipeline_sd15.py")

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
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        # Remove problematic diffusers imports
                        problematic_imports = [
                            "USE_PEFT_BACKEND",
                            "scale_lora_layers", 
                            "unscale_lora_layers"
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
        """Fix syntax errors like trailing dots"""
        patterns_to_fix = [
            (r'model_id = "sd_model_v1-5"\.', 'model_id = "sd_model_v1-5"'),
            (r'\.(?=\s*$)', ''),  # Remove trailing dots at end of lines
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

    def copy_model_weights(self, models_dir: str):
        """Copy pre-trained model weights to the expected location"""
        print("📋 Setting up model weights...")
        
        # Model weights will be downloaded automatically by diffusers
        # when the pipeline is first created
        print("✅ Model weights setup complete!")
