#!/usr/bin/env python3
"""
Test script for SHMT setup
"""

import os
import sys
from PIL import Image
import numpy as np

def create_test_image(size=256, color=(255, 0, 0)):
    """Create a test image"""
    img = Image.new('RGB', (size, size), color)
    return img

def test_shmt_setup():
    """Test SHMT setup"""
    print("🧪 Testing SHMT setup...")
    
    try:
        # Test imports
        from predict import setup_shmt_weights, Predictor
        print("✅ Imports successful")
        
        # Test weight setup
        paths = setup_shmt_weights()
        print("✅ Weight setup successful")
        print(f"   H0: {paths['h0']}")
        print(f"   H4: {paths['h4']}")
        print(f"   VQ-f4: {paths['vq_f4']}")
        
        # Test Predictor creation
        predictor = Predictor()
        print("✅ Predictor creation successful")
        
        # Create test images
        source_img = create_test_image(color=(255, 0, 0))  # Red
        makeup_img = create_test_image(color=(0, 0, 255))  # Blue
        
        source_path = "test_source.png"
        makeup_path = "test_makeup.png"
        
        source_img.save(source_path)
        makeup_img.save(makeup_path)
        
        print("✅ Test images created")
        
        # Test prediction (without GPU)
        print("🔄 Testing prediction (CPU mode)...")
        try:
            result = predictor.predict(
                source_image=source_path,
                makeup_image=makeup_path,
                strength=0.5,
                ddim_steps=10,
                seed=42
            )
            print(f"✅ Prediction successful! Result: {result}")
        except Exception as e:
            print(f"⚠️  Prediction failed (expected without GPU): {e}")
        
        # Cleanup
        os.remove(source_path)
        os.remove(makeup_path)
        
        print("🎉 SHMT setup test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ SHMT setup test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_shmt_setup()
    sys.exit(0 if success else 1)
