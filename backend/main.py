from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import time
import os

app = FastAPI(title="Beautify AI Backend")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
REPLICATE_BASE_URL = "https://api.replicate.com/v1"
STABLE_MAKEUP_MODEL = "humaniacul/stable-makeup-ai:latest"  # Will be updated after deployment

# Request models
class MakeupRequest(BaseModel):
    source_image_base64: str = None
    source_image_url: str = None
    reference_image_base64: str = None
    reference_image_url: str = None
    makeup_intensity: float = 1.0

@app.get("/")
async def root():
    return {"message": "Beautify AI Backend is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "beautify-backend"}

@app.post("/makeup-transfer")
async def transfer_makeup(request: MakeupRequest):
    """
    Transfer makeup from reference image to source image using Stable-Makeup model
    """
    if not REPLICATE_API_TOKEN:
        raise HTTPException(status_code=500, detail="Replicate API token not configured")
    
    try:
        # Prepare the input for Stable-Makeup model
        input_data = {
            "makeup_intensity": request.makeup_intensity,
        }
        
        # Add source image (base64 or URL)
        if request.source_image_base64:
            input_data["source_image"] = f"data:image/png;base64,{request.source_image_base64}"
        elif request.source_image_url:
            input_data["source_image"] = request.source_image_url
        else:
            raise HTTPException(status_code=400, detail="Source image is required")
        
        # Add reference image (base64 or URL)  
        if request.reference_image_base64:
            input_data["reference_image"] = f"data:image/png;base64,{request.reference_image_base64}"
        elif request.reference_image_url:
            input_data["reference_image"] = request.reference_image_url
        else:
            raise HTTPException(status_code=400, detail="Reference image is required")

        # Create prediction
        headers = {
            "Authorization": f"Token {REPLICATE_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        prediction_data = {
            "version": STABLE_MAKEUP_MODEL,
            "input": input_data
        }
        
        response = requests.post(
            f"{REPLICATE_BASE_URL}/predictions",
            headers=headers,
            json=prediction_data
        )
        
        if response.status_code != 201:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Replicate API error: {response.text}"
            )
        
        prediction = response.json()
        prediction_id = prediction["id"]
        
        # Poll for completion
        max_attempts = 60  # 5 minutes max
        for attempt in range(max_attempts):
            response = requests.get(
                f"{REPLICATE_BASE_URL}/predictions/{prediction_id}",
                headers=headers
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to get prediction status: {response.text}"
                )
            
            result = response.json()
            status = result["status"]
            
            if status == "succeeded":
                return {
                    "success": True,
                    "result_url": result["output"],
                    "processing_time": result.get("metrics", {}).get("predict_time")
                }
            elif status == "failed":
                raise HTTPException(
                    status_code=500,
                    detail=f"Makeup transfer failed: {result.get('error', 'Unknown error')}"
                )
            elif status in ["starting", "processing"]:
                time.sleep(5)  # Wait 5 seconds before next check
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unexpected status: {status}"
                )
        
        raise HTTPException(status_code=408, detail="Request timeout")
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/test")
async def test_connection():
    """Test Replicate API connection"""
    if not REPLICATE_API_TOKEN:
        return {"error": "Replicate API token not configured"}
    
    try:
        headers = {"Authorization": f"Token {REPLICATE_API_TOKEN}"}
        response = requests.get(f"{REPLICATE_BASE_URL}/models", headers=headers)
        
        return {
            "replicate_status": response.status_code,
            "message": "Backend and Replicate API connection successful" if response.status_code == 200 else "Connection failed"
        }
    except Exception as e:
        return {"error": f"Connection test failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 