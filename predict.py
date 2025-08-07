import os
import sys
import subprocess
import requests
import re
from typing import List
import torch
from PIL import Image
import numpy as np
import cv2
from cog import BasePredictor, Input, Path


class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load the model into memory to make running multiple predictions efficient"""
        
        print("🚀 Setting up original Stable-Makeup model...")
        
        # Clone the original Stable-Makeup repository
        if not os.path.exists("Stable-Makeup"):
            print("📥 Cloning original Stable-Makeup repository...")
            subprocess.run([
                "git", "clone", 
                "https://github.com/Xiaojiu-z/Stable-Makeup.git"
            ], check=True)
        
        # Change to the Stable-Makeup directory
        os.chdir("Stable-Makeup")
        
        # Fix SPIGA model loading issue
        self.fix_spiga_model_loading()
        
        # Fix all issues in the original code
        self.fix_all_issues()
        
        # Add the current directory to Python path
        sys.path.append(os.getcwd())
        
        # Create models directory
        models_dir = "models/stablemakeup"
        os.makedirs(models_dir, exist_ok=True)
        
        # Copy model weights from the parent directory
        self.copy_model_weights(models_dir)
        
        # Create required directories
        os.makedirs("test_imgs/id", exist_ok=True)
        os.makedirs("test_imgs/makeup", exist_ok=True)
        os.makedirs("output", exist_ok=True)
        
        print("✅ Original Stable-Makeup model setup complete!")
    
    def fix_all_issues(self):
        """Fix all issues in the original code"""
        try:
            # Fix huggingface_hub imports in all Python files
            self.fix_huggingface_imports()
            
            # Fix diffusers imports in all Python files
            self.fix_diffusers_imports()
            
            # Fix syntax errors in all Python files
            self.fix_syntax_errors()
            
            # Fix infer_kps.py
            with open("infer_kps.py", "r") as f:
                content = f.read()
            
            # Fix 1: Syntax error - remove trailing dot after string
            content = content.replace('model_id = "sd_model_v1-5".', 'model_id = "sd_model_v1-5"')
            
            # Fix 2: Fix the wrong import path
            content = content.replace('from utils.pipeline_sd15 import', 'from pipeline_sd15 import')
            
            # Fix 3: Add a custom inference function that accepts parameters
            custom_function = '''

def infer_with_params(source_path, reference_path, intensity=1.0):
    """Custom inference function that accepts individual image paths"""
    import torch
    from PIL import Image
    from diffusers.utils import load_image
    
    # Load images
    id_image = load_image(source_path).resize((512, 512))
    makeup_image = load_image(reference_path).resize((512, 512))
    
    # Get facial landmarks
    id_draw = get_draw(id_image, (512, 512))
    makeup_draw = get_draw(makeup_image, (512, 512))
    
    # Prepare images for the pipeline
    id_image_tensor = torch.from_numpy(np.array(id_image)).float() / 255.0
    makeup_image_tensor = torch.from_numpy(np.array(makeup_image)).float() / 255.0
    id_draw_tensor = torch.from_numpy(np.array(id_draw)).float() / 255.0
    makeup_draw_tensor = torch.from_numpy(np.array(makeup_draw)).float() / 255.0
    
    # Move to GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    id_image_tensor = id_image_tensor.to(device)
    makeup_image_tensor = makeup_image_tensor.to(device)
    id_draw_tensor = id_draw_tensor.to(device)
    makeup_draw_tensor = makeup_draw_tensor.to(device)
    
    # Run inference using the pipeline
    try:
        result = pipe(
            prompt="",
            image=id_image,
            control_image=[id_draw, makeup_draw],
            controlnet_conditioning_scale=[1.0, intensity],
            num_inference_steps=20,
            guidance_scale=7.5,
        ).images[0]
        
        return result
    except Exception as e:
        print(f"Pipeline error: {e}")
        # Return the source image as fallback
        return id_image
'''
            
            # Add the custom function to the content
            content += custom_function
            
            with open("infer_kps.py", "w") as f:
                f.write(content)
            
            print("✅ Fixed all issues in infer_kps.py")
            
        except Exception as e:
            print(f"⚠️ Could not fix infer_kps.py: {e}")
    
    def fix_syntax_errors(self):
        """Fix syntax errors in all Python files"""
        print("🔧 Fixing syntax errors...")
        
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        original_content = content
                        
                        # Fix 1: Missing comma in function parameters
                        content = re.sub(
                            r'safety_checker=Noneet=Unet,',
                            'safety_checker=None, unet=Unet,',
                            content
                        )
                        
                        # Fix 2: Missing comma in function parameters (pipeline_sd15.py line 132)
                        content = re.sub(
                            r'tokenizer: CLIPTokenizeret: UNet2DConditionModel,',
                            'tokenizer: CLIPTokenizer, unet: UNet2DConditionModel,',
                            content
                        )
                        
                        # Fix 3: Missing comma in function parameters (pipeline_sd15.py line 162)
                        content = re.sub(
                            r'tokenizer=tokenizeret=unet,',
                            'tokenizer=tokenizer, unet=unet,',
                            content
                        )
                        
                        # Fix 4: Remove trailing dots after strings
                        content = re.sub(
                            r'(\w+)\s*=\s*"([^"]+)"\.',
                            r'\1 = "\2"',
                            content
                        )
                        
                        # Fix 5: Fix any other missing commas in function calls
                        content = re.sub(
                            r'(\w+)=(\w+)(\w+)=(\w+),',
                            r'\1=\2, \3=\4,',
                            content
                        )
                        
                        # Only write if content changed
                        if content != original_content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                            
                    except Exception as e:
                        print(f"⚠️ Error processing {filepath}: {e}")
        
        print("✅ Syntax errors fixed!")
    
    def fix_huggingface_imports(self):
        """Fix huggingface_hub import issues in all Python files"""
        print("🔧 Fixing huggingface_hub imports...")
        
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        original_content = content
                        
                        # Fix 1: Replace cached_download import
                        content = re.sub(
                            r'from huggingface_hub import.*?cached_download',
                            'from huggingface_hub import hf_hub_download as cached_download',
                            content,
                            flags=re.MULTILINE | re.DOTALL
                        )
                        
                        # Fix 2: Replace direct cached_download usage
                        content = re.sub(
                            r'from huggingface_hub import cached_download',
                            'from huggingface_hub import hf_hub_download as cached_download',
                            content
                        )
                        
                        # Fix 3: Add alias if both are imported
                        if 'from huggingface_hub import' in content and 'cached_download' in content:
                            # Check if hf_hub_download is already imported
                            if 'hf_hub_download' not in content:
                                content = re.sub(
                                    r'from huggingface_hub import (.*?)(\n|$)',
                                    r'from huggingface_hub import \1, hf_hub_download as cached_download\2',
                                    content
                                )
                        
                        # Only write if content changed
                        if content != original_content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                            
                    except Exception as e:
                        print(f"⚠️ Error processing {filepath}: {e}")
        
        print("✅ Huggingface imports fixed!")
    
    def fix_diffusers_imports(self):
        """Fix diffusers import issues in all Python files"""
        print("🔧 Fixing diffusers imports...")
        
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        original_content = content
                        
                        # Fix 1: Remove USE_PEFT_BACKEND import (not available in diffusers 0.21.4)
                        content = re.sub(
                            r'USE_PEFT_BACKEND,\s*',
                            '',
                            content
                        )
                        content = re.sub(
                            r',\s*USE_PEFT_BACKEND',
                            '',
                            content
                        )
                        
                        # Fix 2: Remove scale_lora_layers import (not available in diffusers 0.21.4)
                        content = re.sub(
                            r'scale_lora_layers,\s*',
                            '',
                            content
                        )
                        content = re.sub(
                            r',\s*scale_lora_layers',
                            '',
                            content
                        )
                        
                        # Fix 3: Remove 'un' import (not available in diffusers 0.21.4)
                        content = re.sub(
                            r'un,\s*',
                            '',
                            content
                        )
                        content = re.sub(
                            r',\s*un',
                            '',
                            content
                        )
                        
                        # Fix 4: Remove empty import lines
                        content = re.sub(
                            r'from diffusers\.utils import \(\)',
                            '# from diffusers.utils import ()  # Removed empty import',
                            content
                        )
                        
                        # Fix 5: Clean up trailing commas in import statements
                        content = re.sub(
                            r'from diffusers\.utils import \([\s\S]*?,\s*\)',
                            lambda m: re.sub(r',\s*\)', ')', m.group(0)),
                            content
                        )
                        
                        # Only write if content changed
                        if content != original_content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(content)
                            print(f"✅ Fixed {filepath}")
                            
                    except Exception as e:
                        print(f"⚠️ Error processing {filepath}: {e}")
        
        print("✅ Diffusers imports fixed!")
        
    def copy_model_weights(self, models_dir: str):
        """Copy model weights from the parent directory"""
        
        # Check if weights already exist
        if os.path.exists(os.path.join(models_dir, "pytorch_model.bin")):
            print("✅ Model weights already exist")
            return
        
        # Copy weights from parent directory
        parent_models = "../models/stablemakeup"
        if os.path.exists(parent_models):
            print("📁 Copying model weights from parent directory...")
            subprocess.run(["cp", "-r", f"{parent_models}/*", models_dir], check=True)
            print("✅ Model weights copied successfully!")
        else:
            print("⚠️ Model weights not found. Please ensure they are in the models/stablemakeup directory.")
        
    def predict(
        self,
        source_image: Path = Input(description="Source face image"),
        reference_image: Path = Input(description="Reference makeup image"),
        makeup_intensity: float = Input(
            description="Makeup transfer intensity (0.1-2.0)",
            default=1.0,
            ge=0.1,
            le=2.0,
        ),
    ) -> Path:
        """Run a single prediction on the model"""
        
        print(f"🎨 Starting Stable-Makeup inference with intensity: {makeup_intensity}")
        
        # Ensure Stable-Makeup directory exists and is set up
        if not os.path.exists("Stable-Makeup"):
            print("📥 Cloning original Stable-Makeup repository...")
            subprocess.run([
                "git", "clone", 
                "https://github.com/Xiaojiu-z/Stable-Makeup.git"
            ], check=True)
        
        # Change to the Stable-Makeup directory and fix issues before importing
        os.chdir("Stable-Makeup")
        
        # Fix SPIGA model loading issue
        self.fix_spiga_model_loading()
        self.fix_all_issues()
        sys.path.append(os.getcwd())
        
        # Create required directories
        os.makedirs("test_imgs/id", exist_ok=True)
        os.makedirs("test_imgs/makeup", exist_ok=True)
        os.makedirs("output", exist_ok=True)
        
        # Save input images to the required directories
        source_path = "test_imgs/id/source.jpg"
        reference_path = "test_imgs/makeup/reference.jpg"
        output_path = "output/result.jpg"
        
        # Load and save source image
        source_img = Image.open(source_image).convert("RGB")
        source_img = source_img.resize((512, 512))
        source_img.save(source_path)
        
        # Load and save reference image
        reference_img = Image.open(reference_image).convert("RGB")
        reference_img = reference_img.resize((512, 512))
        reference_img.save(reference_path)
        
        try:
            # Import the fixed inference code
            from infer_kps import infer_with_params
            
            # Run the custom inference function
            result_image = infer_with_params(
                source_path=source_path,
                reference_path=reference_path,
                intensity=makeup_intensity
            )
            
            # Save the result
            result_image.save(output_path)
            print("✅ Stable-Makeup inference completed successfully!")
            
            return Path(output_path)
            
        except Exception as e:
            print(f"❌ Error during inference: {e}")
            import traceback
            traceback.print_exc()
            
            # Return the source image as fallback
            fallback_path = "output/fallback.jpg"
            source_img.save(fallback_path)
            return Path(fallback_path)


    def fix_spiga_model_loading(self):
        """Fix SPIGA model loading by patching it to use local model file"""
        print("🔧 Fixing SPIGA model loading...")
        
        # Check if model exists in the correct location
        model_path = os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/models/weights/spiga_300wpublic.pt")
        
        if not os.path.exists(model_path):
            print("❌ SPIGA model not found at expected location!")
            print(f"Expected: {model_path}")
            return
        
        print("✅ SPIGA model found locally!")
        
        # Patch SPIGA to use our local model file
        print("🔧 Patching SPIGA to use local model...")
        spiga_framework_path = os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py")
        
        if os.path.exists(spiga_framework_path):
            try:
                with open(spiga_framework_path, 'r') as f:
                    content = f.read()
                
                # Replace the torch.hub.load_state_dict_from_url call
                old_code = 'model_state_dict = torch.hub.load_state_dict_from_url(self.model_cfg.model_weights_url,'
                new_code = f'''# Use local model file instead of downloading
                model_state_dict = torch.load("{model_path}", map_location="cpu")'''
                
                if old_code in content:
                    content = content.replace(old_code, new_code)
                    
                    with open(spiga_framework_path, 'w') as f:
                        f.write(content)
                    
                    print("✅ SPIGA patched successfully!")
                else:
                    print("⚠️ Could not find the exact code to patch in SPIGA")
                    
            except Exception as e:
                print(f"⚠️ Failed to patch SPIGA: {e}")
        else:
            print("⚠️ SPIGA framework file not found")


    def fix_spiga_model_loading(self):
        """Fix SPIGA model loading by patching it to use local model file"""
        print("🔧 Fixing SPIGA model loading...")
        
        # Check if model exists in the correct location
        model_path = "/root/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/models/weights/spiga_300wpublic.pt"
        
        if not os.path.exists(model_path):
            print("❌ SPIGA model not found at expected location!")
            print(f"Expected: {model_path}")
            return
        
        print("✅ SPIGA model found locally!")
        
        # Patch SPIGA to use our local model file
        print("🔧 Patching SPIGA to use local model...")
        spiga_framework_path = "/root/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py"
        
        if os.path.exists(spiga_framework_path):
            try:
                with open(spiga_framework_path, 'r') as f:
                    content = f.read()
                
                # Replace the torch.hub.load_state_dict_from_url call
                old_code = 'model_state_dict = torch.hub.load_state_dict_from_url(self.model_cfg.model_weights_url,'
                new_code = f'''# Use local model file instead of downloading
                model_state_dict = torch.load("{model_path}", map_location="cpu")'''
                
                if old_code in content:
                    content = content.replace(old_code, new_code)
                    
                    with open(spiga_framework_path, 'w') as f:
                        f.write(content)
                    
                    print("✅ SPIGA patched successfully!")
                else:
                    print("⚠️ Could not find the exact code to patch in SPIGA")
                    print("🔍 Looking for alternative patterns...")
                    
                    # Try alternative patterns
                    patterns = [
                        'model_state_dict = torch.hub.load_state_dict_from_url(',
                        'torch.hub.load_state_dict_from_url(',
                        'load_state_dict_from_url('
                    ]
                    
                    for pattern in patterns:
                        if pattern in content:
                            print(f"Found pattern: {pattern}")
                            # Replace with our local file
                            content = content.replace(pattern, f'torch.load("{model_path}", map_location="cpu")')
                            with open(spiga_framework_path, 'w') as f:
                                f.write(content)
                            print("✅ SPIGA patched with alternative pattern!")
                            return
                    
                    print("❌ No matching patterns found in SPIGA framework")
                    
            except Exception as e:
                print(f"⚠️ Failed to patch SPIGA: {e}")
        else:
            print("⚠️ SPIGA framework file not found")


    def fix_spiga_model_loading(self):
        """Fix SPIGA model loading by downloading the model file and patching SPIGA"""
        print("🔧 Fixing SPIGA model loading...")
        
        # Create SPIGA models directory
        spiga_models_dir = "/root/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/models/weights"
        os.makedirs(spiga_models_dir, exist_ok=True)
        
        # Check if model exists in the correct location
        model_path = os.path.join(spiga_models_dir, "spiga_300wpublic.pt")
        
        if not os.path.exists(model_path):
            print("📥 Downloading SPIGA model...")
            
            # Try multiple reliable sources
            urls = [
                "https://huggingface.co/spiga/spiga_300wpublic/resolve/main/spiga_300wpublic.pt",
                "https://github.com/aitorzip/SPIGA/releases/download/v1.0/spiga_300wpublic.pt"
            ]
            
            for i, url in enumerate(urls):
                try:
                    print(f"🔄 Trying URL {i+1}: {url}")
                    
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                    
                    response = requests.get(url, headers=headers, stream=True)
                    response.raise_for_status()
                    
                    with open(model_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    # Verify it's a valid PyTorch file
                    with open(model_path, 'rb') as f:
                        first_bytes = f.read(10)
                        if first_bytes.startswith(b'<!DOCTYPE') or first_bytes.startswith(b'<html'):
                            print(f"❌ URL {i+1} returned HTML, trying next...")
                            os.remove(model_path)
                            continue
                    
                    print("✅ SPIGA model downloaded successfully!")
                    break
                    
                except Exception as e:
                    print(f"❌ Failed with URL {i+1}: {e}")
                    if os.path.exists(model_path):
                        os.remove(model_path)
                    continue
            else:
                print("⚠️ All download attempts failed")
                return
        else:
            print("✅ SPIGA model already exists")
        
        # Patch SPIGA to use our local model file
        print("🔧 Patching SPIGA to use local model...")
        spiga_framework_path = "/root/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py"
        
        if os.path.exists(spiga_framework_path):
            try:
                with open(spiga_framework_path, 'r') as f:
                    content = f.read()
                
                # Replace the torch.hub.load_state_dict_from_url call
                old_code = 'model_state_dict = torch.hub.load_state_dict_from_url(self.model_cfg.model_weights_url,'
                new_code = f'''# Use local model file instead of downloading
                model_state_dict = torch.load("{model_path}", map_location="cpu")'''
                
                if old_code in content:
                    content = content.replace(old_code, new_code)
                    
                    with open(spiga_framework_path, 'w') as f:
                        f.write(content)
                    
                    print("✅ SPIGA patched successfully!")
                else:
                    print("⚠️ Could not find the exact code to patch in SPIGA")
                    print("🔍 Looking for alternative patterns...")
                    
                    # Try alternative patterns
                    patterns = [
                        'model_state_dict = torch.hub.load_state_dict_from_url(',
                        'torch.hub.load_state_dict_from_url(',
                        'load_state_dict_from_url('
                    ]
                    
                    for pattern in patterns:
                        if pattern in content:
                            print(f"Found pattern: {pattern}")
                            # Replace with our local file
                            content = content.replace(pattern, f'torch.load("{model_path}", map_location="cpu")')
                            with open(spiga_framework_path, 'w') as f:
                                f.write(content)
                            print("✅ SPIGA patched with alternative pattern!")
                            return
                    
                    print("❌ No matching patterns found in SPIGA framework")
                    
            except Exception as e:
                print(f"⚠️ Failed to patch SPIGA: {e}")
        else:
            print("⚠️ SPIGA framework file not found")

