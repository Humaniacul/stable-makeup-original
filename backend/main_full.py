from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import mediapipe as mp
import cv2
import numpy as np
import base64
import io
from PIL import Image
import uvicorn
import os
from typing import List, Dict, Any
import logging
import requests
import time
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Replicate API configuration (use env var; don't hardcode secrets)
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
REPLICATE_BASE_URL = os.environ.get("REPLICATE_BASE_URL", "https://api.replicate.com/v1")

# Supabase configuration (use env vars)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Initialize Supabase client with correct options
supabase: Client = create_client(
    SUPABASE_URL, 
    SUPABASE_KEY,
    options={
        "auto_refresh_token": True,
        "persist_session": False
    }
)

# Pydantic models for requests
class MakeupRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    prompt: str
    negative_prompt: str = "blurry, distorted, low quality"
    guidance_scale: float = 3.5
    num_inference_steps: int = 20
    strength: float = 0.8

app = FastAPI(
    title="Beautify AI Makeup Analysis API",
    description="MediaPipe-powered face detection and makeup analysis service",
    version="1.0.0"
)

# Configure CORS for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

# Global MediaPipe instances for better performance
face_detection = mp_face_detection.FaceDetection(
    model_selection=1,  # Full-range model for better accuracy
    min_detection_confidence=0.5
)

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

@app.get("/")
async def root():
    return {
        "message": "Beautify AI Makeup Analysis API",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "detect_face": "/detect-face",
            "analyze_makeup": "/analyze-makeup"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Fly.io"""
    return {
        "status": "healthy",
        "service": "beautify-ai-backend",
        "mediapipe_available": True
    }

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',', 1)[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return cv_image
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

def encode_image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string"""
    try:
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_image)
        
        # Convert to base64
        buffer = io.BytesIO()
        pil_image.save(buffer, format='JPEG', quality=85)
        base64_string = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/jpeg;base64,{base64_string}"
    except Exception as e:
        logger.error(f"Error encoding image: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

async def upload_base64_to_supabase(base64_data: str) -> str:
    """Upload base64 image to Supabase and return HTTP URL"""
    try:
        logger.info("📤 Uploading base64 to Supabase...")
        
        # Remove data URL prefix if present
        if base64_data.startswith('data:image'):
            base64_data = base64_data.split(',', 1)[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_data)
        
        # Generate filename
        timestamp = int(time.time())
        filename = f"makeup_generation_{timestamp}.jpg"
        
        # Upload to Supabase
        result = supabase.storage.from_("makeup-images").upload(
            filename, 
            image_bytes,
            file_options={"content-type": "image/jpeg"}
        )
        
        if result.data:
            # Build HTTP URL directly
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/makeup-images/{filename}"
            logger.info(f"✅ Upload successful: {public_url}")
            return public_url
        else:
            logger.error(f"❌ Upload failed: {result}")
            raise Exception("Supabase upload failed")
            
    except Exception as e:
        logger.error(f"❌ Supabase upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """Detect faces in uploaded image using MediaPipe"""
    try:
        # Read and process the uploaded file
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        results = face_detection.process(rgb_image)
        
        face_data = []
        annotated_image = cv_image.copy()
        
        if results.detections:
            for detection in results.detections:
                # Get bounding box
                bbox = detection.location_data.relative_bounding_box
                h, w, _ = cv_image.shape
                
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
                # Draw bounding box
                cv2.rectangle(annotated_image, (x, y), (x + width, y + height), (0, 255, 0), 2)
                
                # Add confidence score
                confidence = detection.score[0]
                cv2.putText(annotated_image, f'Face: {confidence:.2f}', 
                           (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                face_data.append({
                    "confidence": float(confidence),
                    "bounding_box": {
                        "x": x,
                        "y": y,
                        "width": width,
                        "height": height
                    }
                })
        
        # Encode result image
        result_image_base64 = encode_image_to_base64(annotated_image)
        
        return {
            "success": True,
            "faces_detected": len(face_data),
            "faces": face_data,
            "annotated_image": result_image_base64
        }
        
    except Exception as e:
        logger.error(f"Face detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

@app.post("/analyze-makeup")
async def analyze_makeup(file: UploadFile = File(...)):
    """Analyze facial features for makeup recommendations using MediaPipe Face Mesh"""
    try:
        # Read and process the uploaded file
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Get face mesh
        results = face_mesh.process(rgb_image)
        
        if not results.multi_face_landmarks:
            return {
                "success": False,
                "error": "No face detected in image"
            }
        
        # Process the first face
        face_landmarks = results.multi_face_landmarks[0]
        h, w, _ = cv_image.shape
        
        # Extract key facial features
        landmarks = []
        for landmark in face_landmarks.landmark:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            landmarks.append({"x": x, "y": y, "z": landmark.z})
        
        # Analyze facial features for makeup recommendations
        analysis = analyze_facial_features(landmarks, w, h)
        
        # Draw face mesh on image
        annotated_image = cv_image.copy()
        mp_drawing.draw_landmarks(
            annotated_image,
            face_landmarks,
            mp_face_mesh.FACEMESH_CONTOURS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=1)
        )
        
        # Encode result image
        result_image_base64 = encode_image_to_base64(annotated_image)
        
        return {
            "success": True,
            "facial_analysis": analysis,
            "total_landmarks": len(landmarks),
            "annotated_image": result_image_base64
        }
        
    except Exception as e:
        logger.error(f"Makeup analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Makeup analysis failed: {str(e)}")

@app.post("/generate-makeup")
async def generate_makeup(request: MakeupRequest):
    """Generate makeup using Stable Diffusion via Replicate API (Backend Proxy)"""
    try:
        logger.info(f"🎨 Starting makeup generation for: {request.prompt}")
        
        # Handle both base64 and URL inputs
        image_url = None
        
        if request.image_base64:
            logger.info("📤 Processing base64 image...")
            # Upload base64 to Supabase to get HTTP URL for Replicate
            image_url = await upload_base64_to_supabase(request.image_base64)
            logger.info(f"✅ Base64 uploaded to Supabase: {image_url}")
        elif request.image_url:
            logger.info("📤 Processing image URL...")
            # Validate URL
            if not (request.image_url.startswith('http://') or request.image_url.startswith('https://')):
                raise HTTPException(status_code=400, detail="Invalid image URL")
            image_url = request.image_url
            logger.info(f"✅ Using provided URL: {image_url}")
        else:
            raise HTTPException(status_code=400, detail="Either image_base64 or image_url must be provided")
        
        logger.info(f"✅ Final image URL for Replicate: {image_url}")
        
        # Prepare Replicate request
        headers = {
            "Authorization": f"Token {REPLICATE_API_TOKEN}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            "input": {
                "prompt": request.prompt,
                "image": image_url,
                "negative_prompt": request.negative_prompt,
                "guidance_scale": request.guidance_scale,
                "num_inference_steps": request.num_inference_steps,
                "strength": request.strength,
                "width": 1024,
                "height": 1024,
                "output_format": "png",
                "seed": int(time.time())
            }
        }
        
        logger.info("📡 Calling Replicate API...")
        
        # Make request to Replicate
        response = requests.post(
            f"{REPLICATE_BASE_URL}/predictions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code != 201:
            logger.error(f"❌ Replicate API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"Replicate API error: {response.status_code}")
        
        prediction = response.json()
        prediction_id = prediction["id"]
        
        logger.info(f"⏳ Prediction started: {prediction_id}")
        
        # Poll for completion
        max_attempts = 120  # 10 minutes
        poll_interval = 5   # 5 seconds
        
        for attempt in range(max_attempts):
            logger.info(f"⏳ Polling attempt {attempt + 1}/{max_attempts}")
            
            poll_response = requests.get(
                f"{REPLICATE_BASE_URL}/predictions/{prediction_id}",
                headers=headers,
                timeout=30
            )
            
            if poll_response.status_code != 200:
                logger.error(f"❌ Poll error: {poll_response.status_code}")
                continue
            
            result = poll_response.json()
            status = result["status"]
            
            logger.info(f"📊 Status: {status}")
            
            if status == "succeeded":
                output = result["output"]
                result_image_url = output[0] if isinstance(output, list) else output
                
                logger.info("✅ Makeup generation completed successfully")
                
                return {
                    "success": True,
                    "image_url": result_image_url,
                    "prediction_id": prediction_id,
                    "processing_time": attempt * poll_interval,
                    "prompt": request.prompt
                }
            
            elif status == "failed":
                error_msg = result.get("error", "Unknown error")
                logger.error(f"❌ Prediction failed: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Generation failed: {error_msg}")
            
            elif status == "canceled":
                logger.error("❌ Prediction was canceled")
                raise HTTPException(status_code=500, detail="Generation was canceled")
            
            # Wait before next poll
            time.sleep(poll_interval)
        
        # Timeout
        logger.error("❌ Generation timed out")
        raise HTTPException(status_code=504, detail="Generation timed out after 10 minutes")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Network error: {e}")
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/test-makeup")
async def test_makeup_generation():
    """Test endpoint for makeup generation"""
    try:
        # Test with a simple request
        test_url = "https://httpbin.org/get"
        response = requests.get(test_url, timeout=10)
        
        replicate_test = requests.get(
            f"{REPLICATE_BASE_URL}/models",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            timeout=15
        )
        
        return {
            "backend_status": "healthy",
            "internet_connection": response.status_code == 200,
            "replicate_api": replicate_test.status_code == 200,
            "message": "Backend can handle makeup generation requests"
        }
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return {
            "backend_status": "error",
            "error": str(e)
        }

def analyze_facial_features(landmarks: List[Dict], width: int, height: int) -> Dict[str, Any]:
    """Analyze facial features and provide makeup recommendations"""
    try:
        # Key landmark indices for facial features
        # Eyes: 33, 7, 163, 144 (left), 362, 382, 398, 384 (right)
        # Eyebrows: 70, 63, 105, 66 (left), 296, 334, 293, 300 (right)
        # Lips: 61, 84, 17, 314, 405, 320, 308, 324
        # Nose: 19, 20, 8, 151
        
        left_eye_landmarks = [landmarks[i] for i in [33, 7, 163, 144]]
        right_eye_landmarks = [landmarks[i] for i in [362, 382, 398, 384]]
        lip_landmarks = [landmarks[i] for i in [61, 84, 17, 314, 405, 320, 308, 324]]
        
        # Calculate eye dimensions
        left_eye_width = abs(left_eye_landmarks[0]['x'] - left_eye_landmarks[2]['x'])
        left_eye_height = abs(left_eye_landmarks[1]['y'] - left_eye_landmarks[3]['y'])
        
        right_eye_width = abs(right_eye_landmarks[0]['x'] - right_eye_landmarks[2]['x'])
        right_eye_height = abs(right_eye_landmarks[1]['y'] - right_eye_landmarks[3]['y'])
        
        # Calculate lip dimensions
        lip_width = max(lip_landmarks, key=lambda p: p['x'])['x'] - min(lip_landmarks, key=lambda p: p['x'])['x']
        lip_height = max(lip_landmarks, key=lambda p: p['y'])['y'] - min(lip_landmarks, key=lambda p: p['y'])['y']
        
        # Generate makeup recommendations
        recommendations = {
            "eye_shape": analyze_eye_shape(left_eye_width, left_eye_height, right_eye_width, right_eye_height),
            "lip_shape": analyze_lip_shape(lip_width, lip_height),
            "face_structure": analyze_face_structure(landmarks, width, height),
            "makeup_suggestions": generate_makeup_suggestions(landmarks)
        }
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Feature analysis error: {e}")
        return {"error": "Failed to analyze facial features"}

def analyze_eye_shape(left_width: int, left_height: int, right_width: int, right_height: int) -> Dict[str, Any]:
    """Analyze eye shape and provide recommendations"""
    avg_width = (left_width + right_width) / 2
    avg_height = (left_height + right_height) / 2
    aspect_ratio = avg_width / avg_height if avg_height > 0 else 0
    
    if aspect_ratio > 3.5:
        shape = "almond"
        suggestions = ["Winged eyeliner", "Natural eyeshadow", "Lengthening mascara"]
    elif aspect_ratio > 3.0:
        shape = "oval"
        suggestions = ["Bold eyeshadow", "Dramatic eyeliner", "Volumizing mascara"]
    else:
        shape = "round"
        suggestions = ["Extended eyeliner", "Smokey eye", "Curling mascara"]
    
    return {
        "shape": shape,
        "aspect_ratio": round(aspect_ratio, 2),
        "suggestions": suggestions
    }

def analyze_lip_shape(width: int, height: int) -> Dict[str, Any]:
    """Analyze lip shape and provide recommendations"""
    aspect_ratio = width / height if height > 0 else 0
    
    if aspect_ratio > 4.0:
        shape = "wide"
        suggestions = ["Bold lip color", "Defined lip liner", "Matte finish"]
    elif aspect_ratio > 3.0:
        shape = "balanced"
        suggestions = ["Any lip style", "Glossy finish", "Natural colors"]
    else:
        shape = "full"
        suggestions = ["Nude colors", "Light gloss", "Subtle liner"]
    
    return {
        "shape": shape,
        "aspect_ratio": round(aspect_ratio, 2),
        "suggestions": suggestions
    }

def analyze_face_structure(landmarks: List[Dict], width: int, height: int) -> Dict[str, Any]:
    """Analyze overall face structure"""
    # Calculate face width vs height ratio
    face_ratio = width / height
    
    if face_ratio > 0.8:
        face_shape = "round"
        contouring = ["Cheek contouring", "Forehead shading"]
    elif face_ratio > 0.7:
        face_shape = "oval"
        contouring = ["Light contouring", "Natural highlighting"]
    else:
        face_shape = "elongated"
        contouring = ["Horizontal contouring", "Cheek highlighting"]
    
    return {
        "face_shape": face_shape,
        "ratio": round(face_ratio, 2),
        "contouring_suggestions": contouring
    }

def generate_makeup_suggestions(landmarks: List[Dict]) -> List[str]:
    """Generate general makeup suggestions"""
    return [
        "Use primer for long-lasting makeup",
        "Apply foundation with a damp beauty sponge",
        "Set makeup with translucent powder",
        "Use complementary colors for your eye color",
        "Finish with setting spray for durability"
    ]

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 