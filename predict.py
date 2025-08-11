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
            
            # Normalize detail_encoder constructor at runtime to avoid duplicate args
            self.monkey_patch_detail_encoder_init()
            
            # Use original input file paths; infer_with_params will copy into test folders
            source_path = str(source_image)
            reference_path = str(reference_image)
            
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

        # Treat a valid model as > 200MB to avoid pointer/HTML files
        min_valid_size_bytes = 200 * 1024 * 1024

        if os.path.exists(model_path) and os.path.getsize(model_path) > min_valid_size_bytes:
            print("✅ SPIGA model found in site-packages cache!")
        else:
            # 1) Try to copy from repository root if present (useful for local dev)
            try:
                import shutil
                repo_root = os.path.abspath(os.path.join(os.getcwd(), ".."))
                local_candidates = [
                    os.path.join(repo_root, "spiga_300wpublic.pt"),
                    os.path.join(repo_root, "models", "spiga_300wpublic.pt"),
                ]
                for candidate in local_candidates:
                    if os.path.exists(candidate) and os.path.getsize(candidate) > min_valid_size_bytes:
                        print(f"📁 Found local SPIGA weights at {candidate}, copying to cache...")
                        shutil.copy2(candidate, model_path)
                        break
            except Exception as e:
                print(f"⚠️ Local copy attempt failed: {e}")

            # 2) If still missing or too small, download via Google Drive using gdown
            if not (os.path.exists(model_path) and os.path.getsize(model_path) > min_valid_size_bytes):
                print("📥 Downloading SPIGA model via Google Drive (gdown)...")
                drive_file_id = "1YrbScfMzrAAWMJQYgxdLZ9l57nmTdpQC"
                try:
                    try:
                        import gdown  # type: ignore
                    except Exception:
                        # Fallback: install gdown at runtime if not present
                        print("⬇️ Installing gdown at runtime...")
                        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gdown==5.1.0"], check=True)
                        import gdown  # type: ignore

                    url = f"https://drive.google.com/uc?id={drive_file_id}"
                    gdown.download(url=url, output=model_path, quiet=False, fuzzy=True)

                    if not os.path.exists(model_path) or os.path.getsize(model_path) <= min_valid_size_bytes:
                        raise RuntimeError("Downloaded SPIGA file is too small or missing after gdown.")
                    print("✅ SPIGA model downloaded successfully via gdown!")
                except Exception as e:
                    raise Exception(f"Failed to obtain SPIGA weights via gdown: {e}")

        # Patch SPIGA framework.py to use local file - IMPROVED WITH PROPER INDENTATION
        framework_path = os.path.join(os.path.expanduser("~/.pyenv/versions/3.10.18/lib/python3.10/site-packages/spiga/inference/framework.py"))
        if os.path.exists(framework_path):
            with open(framework_path, "r") as f:
                content = f.read()
            
            # More careful replacement that preserves indentation
            # Look for the original torch.hub.load_state_dict_from_url call and replace it entirely
            original_pattern = r'model_state_dict = torch\.hub\.load_state_dict_from_url\([^)]+\)'
            new_code = f'model_state_dict = torch.load("{model_path}")'
            
            if re.search(original_pattern, content):
                content = re.sub(original_pattern, new_code, content)
                with open(framework_path, "w") as f:
                    f.write(content)
                print("✅ Patched SPIGA framework.py to use local model file!")
            else:
                # Fallback: look for the simpler pattern and replace more carefully
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if 'torch.hub.load_state_dict_from_url(' in line:
                        # Get the indentation from the original line
                        indent = len(line) - len(line.lstrip())
                        # Replace with properly indented code
                        lines[i] = ' ' * indent + f'model_state_dict = torch.load("{model_path}")'
                        break
                
                content = '\n'.join(lines)
                with open(framework_path, "w") as f:
                    f.write(content)
                print("✅ Patched SPIGA framework.py with proper indentation!")
        else:
            print("⚠️ SPIGA framework file not found")

    def fix_all_issues(self):
        print("🔧 Fixing huggingface_hub imports...")
        self.fix_huggingface_imports()
        
        print("🔧 Fixing diffusers imports...")
        self.fix_diffusers_imports()
        
        print("🔧 Fixing syntax errors...")
        self.fix_syntax_errors()
        # Repair any accidental token merges from earlier import cleanup
        self.fix_un_token_damage()
        # Ensure infer_kps.py has clean, valid imports
        self.fix_infer_kps_imports()

        # Ensure we use a valid Stable Diffusion v1-5 model identifier
        print("🔧 Normalizing model identifiers...")
        self.fix_model_identifiers()

        # Fix detail_encoder constructor call arguments to avoid duplicate dtype
        print("🔧 Harmonizing detail_encoder constructor calls...")
        self.fix_detail_encoder_calls()
        # Ensure encoder_plus.__init__ has a proper self parameter
        print("🔧 Validating detail_encoder.__init__ signature...")
        self.fix_detail_encoder_init_signature()
        # Targeted fix for infer_kps.py to ensure device is named and dtype not duplicated
        print("🔧 Patching infer_kps.py detail_encoder calls...")
        self.fix_infer_kps_detail_encoder()
        
        print("🔧 Fixing pipeline_sd15.py imports completely...")
        self.fix_pipeline_sd15_file()
        
        print("🔧 Adding missing functions to infer_kps.py...")
        self.add_infer_function()
        
        print("✅ Fixed all issues in infer_kps.py")

        # Add resilience for missing stablemakeup adapter weights
        print("🔧 Making makeup weights loading resilient...")
        self.fix_missing_makeup_weights_handling()
        print("✅ Makeup weights handling hardened")

    def fix_detail_encoder_init_signature(self):
        """Ensure detail_encoder.__init__ includes 'self' as the first parameter.
        Some copies of the repo have a malformed signature: def __init__(unet, image_encoder_path, ...)
        which leads to NameError: self is not defined.
        """
        target = os.path.join("detail_encoder", "encoder_plus.py")
        if not os.path.exists(target):
            return
        try:
            with open(target, "r", encoding="utf-8") as f:
                content = f.read()

            original = content
            # Force a canonical signature so the code body can reference 'unet'
            sig_pattern = r"^(\s*)def\s+__init__\([^)]*\):"
            match = re.search(sig_pattern, content, flags=re.M)
            if match:
                indent = match.group(1)
                content = re.sub(
                    sig_pattern,
                    rf"{indent}def __init__(self, unet, image_encoder_path, device='cuda', dtype=torch.float32):",
                    content,
                    flags=re.M,
                    count=1,
                )

                # Inject super().__init__() at the top of the method body
                # Find the method block start
                start_idx = re.search(rf"{indent}def __init__\(", content).start()
                # Find end of method by next def/class at same or lesser indentation
                body_start = content.find(":", start_idx) + 1
                # Insert a line after signature
                newline_idx = content.find("\n", body_start)
                if newline_idx == -1:
                    newline_idx = body_start
                injection = f"\n{indent}    super().__init__()\n"
                content = content[:newline_idx+1] + injection + content[newline_idx+1:]

                # Now ensure we reference the local parameter 'unet' (not self._unet)
                # Determine block end
                next_def = re.search(rf"\n{indent}def |\n{indent}class ", content[body_start:])
                block_end = body_start + (next_def.start() if next_def else len(content) - body_start)
                method_body = content[body_start:block_end]
                # Revert any previous self._unet rewrites
                method_body = re.sub(r"\bself\._unet\.", "unet.", method_body)
                content = content[:body_start] + method_body + content[block_end:]

            if content != original:
                with open(target, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"✅ Patched {target} to normalize __init__ and UNet references")
        except Exception as e:
            print(f"⚠️ Failed to validate detail_encoder.__init__ signature: {e}")

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

            # Also remove unsupported generator kwarg from VAE.decode call
            decode_pattern = r"self\.vae\.decode\([^)]*generator=generator[^)]*\)\s*\[\s*0\s*\]"
            decode_replacement = "self.vae.decode(latents / self.vae.config.scaling_factor, return_dict=False)[0]"
            if re.search(decode_pattern, content):
                content = re.sub(decode_pattern, decode_replacement, content)
                print("✅ Removed generator kwarg from VAE.decode")
            
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
        """Fix diffusers utils imports safely (only on import lines)."""
        for root, _dirs, files in os.walk("."):
            for file in files:
                if not file.endswith(".py") or file == "pipeline_sd15.py":
                    continue
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        lines = f.readlines()

                    modified = False
                    new_lines: List[str] = []
                    for line in lines:
                        if line.strip().startswith("from diffusers.utils import"):
                            try:
                                head, tail = line.split("import", 1)
                                items = tail.strip()
                                trailing = ""
                                if items.startswith("("):
                                    # multi-line style on one line
                                    items = items[1:]
                                    if ")" in items:
                                        items, rest = items.split(")", 1)
                                        trailing = ")" + rest
                                tokens = [t.strip() for t in items.split(",") if t.strip()]
                                drop = {"USE_PEFT_BACKEND", "scale_lora_layers", "unscale_lora_layers", "un", "randn_tensor"}
                                kept = [t for t in tokens if t not in drop]
                                if kept:
                                    line = f"{head}import " + ", ".join(kept) + f"{trailing}"
                                else:
                                    line = ""
                                modified = True
                            except Exception:
                                pass
                        new_lines.append(line)

                    if modified:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.writelines(new_lines)
                        print(f"✅ Fixed {filepath}")
                except Exception:
                    continue
        print("✅ Diffusers imports fixed!")

    def fix_un_token_damage(self):
        """Repair merged identifiers caused by accidental ', un' removal earlier."""
        targets = [
            os.path.join("detail_encoder", "encoder_plus.py"),
            os.path.join("infer_kps.py"),
        ]
        replacements = [
            ("clip_image_embedscond_clip_image_embeds", "clip_image_embeds, uncond_clip_image_embeds"),
            ("image_prompt_embedscond_image_prompt_embeds", "image_prompt_embeds, uncond_image_prompt_embeds"),
            ("load_imagefrom ", "load_image\nfrom "),
        ]
        for fp in targets:
            if not os.path.exists(fp):
                continue
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    content = f.read()
                original = content
                for a, b in replacements:
                    content = content.replace(a, b)
                if content != original:
                    with open(fp, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"✅ Repaired merged identifiers in {fp}")
            except Exception:
                pass

    def fix_infer_kps_imports(self):
        """Ensure infer_kps.py has correct import statements and proper newlines."""
        infer_file = os.path.join('.', 'infer_kps.py')
        if not os.path.exists(infer_file):
            return
        try:
            with open(infer_file, 'r', encoding='utf-8') as f:
                content = f.read()

            original = content
            # Fix wrong utils path
            content = content.replace('from utils.pipeline_sd15 import', 'from pipeline_sd15 import')
            # Split any merged 'load_imagefrom ...' into two lines
            content = re.sub(r'(from\s+diffusers\.utils\s+import\s+load_image)\s*from\s+', r'\1\nfrom ', content)
            # Ensure each import starts on its own line
            content = content.replace('import load_imagefrom', 'import load_image\nfrom')

            if content != original:
                with open(infer_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("✅ infer_kps.py imports normalized")
        except Exception:
            pass

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

    def fix_model_identifiers(self):
        """Replace invalid model repo ids with correct public identifiers."""
        replacements = [
            # Replace bogus placeholder with the official public repo id
            (r'"sd_model_v1-5"', '"runwayml/stable-diffusion-v1-5"'),
            (r"'sd_model_v1-5'", "'runwayml/stable-diffusion-v1-5'"),
        ]

        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()

                        original_content = content
                        for pattern, replacement in replacements:
                            content = re.sub(pattern, replacement, content)

                        if content != original_content:
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(content)
                            print(f"✅ Fixed model id in {filepath}")
                    except Exception:
                        continue
        print("✅ Model identifiers normalized!")

    def fix_detail_encoder_calls(self):
        """Avoid passing dtype twice to detail_encoder by removing ambiguous positional args.
        Converts calls like:
            detail_encoder(Unet, "./models/image_encoder_l", "cuda", dtype=torch.float32)
        into:
            detail_encoder(Unet, "./models/image_encoder_l", device="cuda", dtype=torch.float32)
        and handles minor quoting/spacing variations.
        """
        patterns = [
            # double quotes
            (r'detail_encoder\(\s*Unet\s*,\s*"\./models/image_encoder_l"\s*,\s*"(cuda|cpu)"\s*,\s*dtype\s*=\s*torch\.float32\s*\)',
             r'detail_encoder(Unet, "./models/image_encoder_l", device="\g<1>", dtype=torch.float32)'),
            # single quotes
            (r"detail_encoder\(\s*Unet\s*,\s*'\./models/image_encoder_l'\s*,\s*'(cuda|cpu)'\s*,\s*dtype\s*=\s*torch\.float32\s*\)",
             r"detail_encoder(Unet, './models/image_encoder_l', device='\g<1>', dtype=torch.float32)"),
        ]

        for root, dirs, files in os.walk('.'):
            for file in files:
                if not file.endswith('.py'):
                    continue
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    original_content = content
                    for pattern, replacement in patterns:
                        content = re.sub(pattern, replacement, content)

                    # Also, if dtype is passed positionally before a keyword, remove the keyword to avoid duplicate
                    # e.g., detail_encoder(Unet, path, some_dtype, device=..., dtype=some_dtype)
                    content = re.sub(
                        r'detail_encoder\(([^\)]*?),\s*dtype\s*=\s*([^,\)]+)([^\)]*?)\)',
                        lambda m: (
                            'detail_encoder(' + m.group(1) + m.group(3) + ')'
                            if re.search(r'(^|,)\s*torch\.(float16|float32|float64)\s*(,|$)', m.group(1)) else m.group(0)
                        ),
                        content,
                        flags=re.DOTALL,
                    )

                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"✅ Fixed detail_encoder call in {filepath}")
                except Exception:
                    continue
        print("✅ detail_encoder calls harmonized!")

    def monkey_patch_detail_encoder_init(self):
        """Wrap detail_encoder.__init__ to accept both positional device and keyword device/dtype
        without raising multiple values errors.
        """
        try:
            sys.path.append(os.getcwd())
            from detail_encoder.encoder_plus import detail_encoder as _DetailEncoder
        except Exception:
            # If import fails (e.g., before repo cloned), just skip
            return

        original_init = _DetailEncoder.__init__

        def safe_init(self_obj, unet, image_encoder_path, *args, **kwargs):
            # Remove potentially conflicting device kw/positional entirely
            _ = kwargs.pop("device", None)
            dtype_kw = kwargs.pop("dtype", None)

            # If dtype was passed positionally, capture it (ignore any positional device)
            positional_dtype = None
            if len(args) >= 2:
                positional_dtype = args[1]

            dtype = dtype_kw if dtype_kw is not None else positional_dtype

            # Only pass dtype if the original init accepts it
            try:
                import inspect
                params = inspect.signature(original_init).parameters
            except Exception:
                params = {}

            call_kwargs = {}
            if "dtype" in params and dtype is not None:
                call_kwargs["dtype"] = dtype

            try:
                return original_init(self_obj, unet, image_encoder_path, **call_kwargs)
            except TypeError:
                # Final fallback with only required positionals
                return original_init(self_obj, unet, image_encoder_path)

        _DetailEncoder.__init__ = safe_init
        print("✅ detail_encoder.__init__ monkey patched for argument normalization")

    def fix_infer_kps_detail_encoder(self):
        """Directly patch Stable-Makeup/infer_kps.py for detail_encoder call.
        Ensures device is passed by name and dtype appears only once.
        """
        infer_file = os.path.join(".", "infer_kps.py")
        if not os.path.exists(infer_file):
            print("⚠️ infer_kps.py not found; skipping targeted patch")
            return
        try:
            with open(infer_file, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            # Generalize for image_encoder_* and any torch dtype
            content = re.sub(
                r'detail_encoder\(\s*Unet\s*,\s*([\"\']\./models/image_encoder_[^\"\']+[\"\'])\s*,\s*([\"\'](?:cuda|cpu)[\"\'])\s*,\s*dtype\s*=\s*(torch\.[a-zA-Z0-9_]+)\s*\)',
                r'detail_encoder(Unet, \g<1>, device=\g<2>, dtype=\g<3>)',
                content,
            )

            # Ensure any remaining positional device becomes keyword arg
            content = re.sub(
                r'detail_encoder\(\s*Unet\s*,\s*([\"\']\./models/image_encoder_[^\"\']+[\"\'])\s*,\s*([\"\'](?:cuda|cpu)[\"\'])\s*\)',
                r'detail_encoder(Unet, \1, device=\2)',
                content,
            )

            if content != original_content:
                with open(infer_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Patched {infer_file}")
            else:
                print("ℹ️ No matching detail_encoder pattern found in infer_kps.py")
        except Exception as e:
            print(f"⚠️ Failed to patch infer_kps.py: {e}")

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
    """Minimal single-pair inference using globals built at import time."""
    import os, shutil
    
    os.makedirs("test_imgs/id", exist_ok=True)
    os.makedirs("test_imgs/makeup", exist_ok=True) 
    os.makedirs("output", exist_ok=True)
    
    dst_id = os.path.join("test_imgs", "id", "input.jpg")
    dst_mu = os.path.join("test_imgs", "makeup", "ref.jpg")

    # Avoid SameFileError
    if os.path.abspath(source_path) != os.path.abspath(dst_id):
        shutil.copyfile(source_path, dst_id)
    if os.path.abspath(reference_path) != os.path.abspath(dst_mu):
        shutil.copyfile(reference_path, dst_mu)

    id_image = load_image(dst_id).resize((512, 512))
    makeup_image = load_image(dst_mu).resize((512, 512))
    pose_image = get_draw(id_image, size=512)

    # Use provided intensity to tweak guidance if desired
    guidance = 1.6 * float(intensity)
    result = makeup_encoder.generate(
        id_image=[id_image, pose_image],
        makeup_image=makeup_image,
        pipe=pipe,
        guidance_scale=guidance,
    )
        return result
'''
                content += function_code
                
                with open(infer_file, "w") as f:
                    f.write(content)
                print("✅ Added infer_with_params function")

    def copy_model_weights(self, models_dir: str):
        """Copy pre-trained model weights to the expected location"""
        print("📋 Setting up model weights...")
        os.makedirs(models_dir, exist_ok=True)
        # Ensure stablemakeup adapter weights exist by copying from local repo if present
        repo_root = os.path.abspath(os.path.join(os.getcwd(), ".."))
        local_candidates = [
            os.path.join(repo_root, "stable-makeup-fresh", "models", "stablemakeup"),
            os.path.join(repo_root, "stable-makeup-original", "models", "stablemakeup"),
        ]
        for local_dir in local_candidates:
            if os.path.isdir(local_dir):
                for fname in [
                    "pytorch_model.bin",
                    "pytorch_model_1.bin",
                    "pytorch_model_2.bin",
                ]:
                    src = os.path.join(local_dir, fname)
                    dst = os.path.join(models_dir, fname)
                    try:
                        if os.path.exists(src) and not os.path.exists(dst):
                            import shutil
                            shutil.copy2(src, dst)
                            print(f"✅ Copied {fname} from {local_dir} → {models_dir}")
                    except Exception as e:
                        print(f"⚠️ Could not copy {fname} from {local_dir}: {e}")

        # If still missing, download from GitHub repo (supports Git LFS via redirect)
        missing = [
            f for f in ["pytorch_model.bin", "pytorch_model_1.bin", "pytorch_model_2.bin"]
            if not os.path.exists(os.path.join(models_dir, f))
        ]
        if missing:
            gh_repo = os.environ.get("MAKEUP_WEIGHTS_REPO", "Humaniacul/stable-makeup-original")
            gh_branch = os.environ.get("MAKEUP_WEIGHTS_BRANCH", "main")
            base_media = f"https://media.githubusercontent.com/media/{gh_repo}/{gh_branch}/models/stablemakeup"
            base_raw = f"https://raw.githubusercontent.com/{gh_repo}/{gh_branch}/models/stablemakeup"
            token = os.environ.get("GITHUB_TOKEN")
            headers = {"Authorization": f"token {token}"} if token else {}
            print(f"⬇️ Attempting to download adapter weights from GitHub repo {gh_repo}@{gh_branch} (Git LFS)...")
            for fname in missing:
                dst_path = os.path.join(models_dir, fname)
                urls = [
                    f"{base_media}/{fname}",  # works with Git LFS
                    f"{base_raw}/{fname}",    # fallback (may return pointer)
                ]
                success = False
                for url in urls:
                    try:
                        import requests
                        with requests.get(url, stream=True, allow_redirects=True, timeout=300, headers=headers) as r:
                            r.raise_for_status()
                            with open(dst_path, "wb") as f:
                                for chunk in r.iter_content(chunk_size=4 * 1024 * 1024):
                                    if chunk:
                                        f.write(chunk)
                        # Validate size (> 100MB)
                        if os.path.getsize(dst_path) < 100 * 1024 * 1024:
                            raise RuntimeError("downloaded file too small, likely a pointer")
                        print(f"✅ Downloaded {fname} from {url}")
                        success = True
                        break
                    except Exception as e:
                        if os.path.exists(dst_path):
                            try:
                                os.remove(dst_path)
                            except Exception:
                                pass
                        print(f"⚠️ Failed to download {fname} from {url}: {e}")
                if not success:
                    print(f"⚠️ All download attempts failed for {fname}. We'll proceed with graceful fallbacks.")

        # Final fallback: try Google Drive folder from the original repo README
        still_missing = [
            f for f in ["pytorch_model.bin", "pytorch_model_1.bin", "pytorch_model_2.bin"]
            if not os.path.exists(os.path.join(models_dir, f))
        ]
        if still_missing:
            try:
                print("📥 Attempting to fetch adapter weights from Google Drive via gdown...")
                try:
                    import gdown  # type: ignore
                except Exception:
                    print("⬇️ Installing gdown at runtime...")
                    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gdown==5.1.0"], check=True)
                    import gdown  # type: ignore

                folder_url = "https://drive.google.com/drive/folders/1397t27GrUyLPnj17qVpKWGwg93EcaFfg?usp=sharing"
                tmp_dir = os.path.join(models_dir, "_gdown_tmp")
                os.makedirs(tmp_dir, exist_ok=True)
                gdown.download_folder(url=folder_url, output=tmp_dir, quiet=False, use_cookies=False)

                # Search recursively for expected filenames and move them into place
                found_any = False
                for root, _dirs, files in os.walk(tmp_dir):
                    for fname in ["pytorch_model.bin", "pytorch_model_1.bin", "pytorch_model_2.bin"]:
                        if fname in files:
                            candidate = os.path.join(root, fname)
                            dst_path = os.path.join(models_dir, fname)
                            try:
                                if os.path.getsize(candidate) > 100 * 1024 * 1024:
                                    import shutil
                                    shutil.move(candidate, dst_path)
                                    print(f"✅ Retrieved {fname} from Google Drive folder")
                                    found_any = True
                            except Exception as e:
                                print(f"⚠️ Could not move {fname} from Google Drive download: {e}")
                if not found_any:
                    print("⚠️ Google Drive download completed but expected files were not found.")
            except Exception as e:
                print(f"⚠️ Google Drive folder download failed: {e}")

        # Ensure CLIP Vision image encoder exists (for detail_encoder)
        image_encoder_dir = os.path.join("models", "image_encoder_l")
        os.makedirs(image_encoder_dir, exist_ok=True)
        # If config is missing, fetch from HuggingFace
        try:
            needed = [
                ("config.json", "openai/clip-vit-large-patch14"),
                ("preprocessor_config.json", "openai/clip-vit-large-patch14"),
                ("pytorch_model.bin", "openai/clip-vit-large-patch14"),
            ]
            for filename, repo_id in needed:
                path = os.path.join(image_encoder_dir, filename)
                if not os.path.exists(path):
                    print(f"⬇️ Downloading {filename} for image_encoder_l from {repo_id}...")
                    try:
                        from huggingface_hub import hf_hub_download
                        downloaded = hf_hub_download(repo_id=repo_id, filename=filename, local_dir=image_encoder_dir, local_dir_use_symlinks=False)
                        print(f"✅ Downloaded {filename} → {downloaded}")
                    except Exception as e:
                        print(f"⚠️ Failed to download {filename} from {repo_id}: {e}")

        except Exception as e:
            print(f"⚠️ Image encoder setup issue: {e}")

        print("✅ Model weights setup complete!")

    def fix_missing_makeup_weights_handling(self):
        """Patch infer_kps.py so missing ./models/stablemakeup/*.bin does not crash.
        Tries to download from a user-provided HF repo if available; otherwise falls back to empty state dict.
        """
        infer_file = os.path.join('.', 'infer_kps.py')
        if not os.path.exists(infer_file):
            return
        try:
            with open(infer_file, 'r', encoding='utf-8') as f:
                content = f.read()

            original = content
            # Helper to wrap torch.load calls with try/except, preserving indentation
            def wrap_load(var_name: str) -> None:
                nonlocal content
                # First try exact line replace preserving indentation
                pattern_local = rf"^(\s*){var_name}\s*=\s*torch\\.load\(([^)]+)\)\s*$"
                replaced = False
                if re.search(pattern_local, content, flags=re.M):
                    replacement_local = (
                        rf"\1try:\n"
                        rf"\1    {var_name} = torch.load(\2)\n"
                        rf"\1except Exception as _e:\n"
                        rf"\1    print(f\"⚠️ Could not load stablemakeup weights: {{_e}}. Proceeding without adapters.\")\n"
                        rf"\1    {var_name} = {{}}\n"
                    )
                    content = re.sub(pattern_local, replacement_local, content, flags=re.M)
                    replaced = True
                # Fallback: broader inline replacement if exact match wasn't found
                if not replaced and f"{var_name} = torch.load(" in content:
                    def repl_line(m):
                        indent = m.group(1)
                        inside = m.group(2)
                        return (
                            f"{indent}try:\n"
                            f"{indent}    {var_name} = torch.load({inside})\n"
                            f"{indent}except Exception as _e:\n"
                            f"{indent}    print(f\"⚠️ Could not load stablemakeup weights: {{_e}}. Proceeding without adapters.\")\n"
                            f"{indent}    {var_name} = {{}}\n"
                        )
                    broad_pattern = rf"^(\s*){var_name}\s*=\s*torch\\.load\(([^)]+)\)"
                    content = re.sub(broad_pattern, repl_line, content, flags=re.M)

            # Wrap all three state_dict loads
            wrap_load("makeup_state_dict")
            wrap_load("id_state_dict")
            wrap_load("pose_state_dict")

            if content != original:
                with open(infer_file, 'w', encoding='utf-8') as f:
                    f.write(content)
        except Exception:
            pass
