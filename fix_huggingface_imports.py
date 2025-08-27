#!/usr/bin/env python3
"""
Script to fix huggingface_hub import issues in all Python files
"""

import os
import re

def fix_huggingface_imports(directory="."):
    """Fix huggingface_hub import issues in all Python files"""
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                print(f"Checking {filepath}...")
                
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
                    else:
                        print(f"   No changes needed for {filepath}")
                        
                except Exception as e:
                    print(f"⚠️ Error processing {filepath}: {e}")

if __name__ == "__main__":
    fix_huggingface_imports()
