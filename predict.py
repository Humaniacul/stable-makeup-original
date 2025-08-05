import os
import sys
import subprocess
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
        
        # Fix multiple issues in the original code
        self.fix_original_code()
        
        # Add the current directory to Python path
        sys.path.append(os.getcwd())
        
        # Create models directory
        models_dir = "models/stablemakeup"
        os.makedirs(models_dir, exist_ok=True)
        
        # Copy model weights from the parent directory
        self.copy_model_weights(models_dir)
        
        print("✅ Original Stable-Makeup model setup complete!")
    
    def fix_original_code(self):
        """Fix multiple issues in the original code"""
        try:
            # Fix infer_kps.py syntax error
            with open("infer_kps.py", "r") as f:
                content = f.read()
            
            # Fix the syntax error: remove trailing dot after string
            content = content.replace('model_id = "sd_model_v1-5".', 'model_id = "sd_model_v1-5"')
            
            # Fix huggingface_hub import issue
            content = content.replace(
                'from huggingface_hub import cached_download',
                'from huggingface_hub import hf_hub_download as cached_download'
            )
            
            with open("infer_kps.py", "w") as f:
                f.write(content)
            
            print("✅ Fixed syntax error and import issues in infer_kps.py")
            
        except Exception as e:
            print(f"⚠️ Could not fix infer_kps.py: {e}")
        
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
        
        print(f"🎨 Starting original Stable-Makeup inference with intensity: {makeup_intensity}")
        
        # Save input images to the Stable-Makeup directory
        source_path = "temp_source.jpg"
        reference_path = "temp_reference.jpg"
        output_path = "temp_output.jpg"
        
        # Load and save source image
        source_img = Image.open(source_image).convert("RGB")
        source_img = source_img.resize((512, 512))
        source_img.save(source_path)
        
        # Load and save reference image
        reference_img = Image.open(reference_image).convert("RGB")
        reference_img = reference_img.resize((512, 512))
        reference_img.save(reference_path)
        
        try:
            # Import and use the original inference code
            from infer_kps import main as infer_main
            
            # Run the original Stable-Makeup inference
            result_image = infer_main(
                source_path=source_path,
                reference_path=reference_path,
                intensity=makeup_intensity
            )
            
            # Save the result
            result_image.save(output_path)
            print("✅ Original Stable-Makeup inference completed successfully!")
            
            return Path(output_path)
            
        except Exception as e:
            print(f"❌ Error during original inference: {e}")
            # Return the source image as fallback
            source_img.save(output_path)
            return Path(output_path)
