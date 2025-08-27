#!/usr/bin/env python3
"""
Deploy Stable-Makeup model to Replicate
"""

import os
import replicate
import subprocess
import time

def deploy_model():
    print("🚀 Deploying Stable-Makeup model to Replicate...")
    
    # Set API token
    os.environ["REPLICATE_API_TOKEN"] = "r8_DRpnlDQlHbJBHKiAYvQzeYnY70ZDwpD2VP6Uo"
    
    try:
        # Create the model using Replicate API
        model = replicate.models.create(
            owner="Humaniacul",
            name="stable-makeup-original",
            description="Original Stable-Makeup model for makeup transfer (SIGGRAPH 2025)",
            visibility="public",
            github_url="https://github.com/Humaniacul/stable-makeup-original"
        )
        
        print(f"✅ Model created successfully!")
        print(f"🔗 Model URL: https://replicate.com/Humaniacul/stable-makeup-original")
        
        # Start the build
        print("🔨 Starting model build...")
        version = replicate.models.versions.create(
            owner="Humaniacul",
            name="stable-makeup-original",
            cog_version="0.8.6",
            python_version="3.10",
            cuda_version="11.8"
        )
        
        print(f"✅ Version created: {version.id}")
        print("⏳ Model is now building on Replicate...")
        print("🔗 Check progress at: https://replicate.com/Humaniacul/stable-makeup-original")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deploying model: {e}")
        return False

if __name__ == "__main__":
    deploy_model() 