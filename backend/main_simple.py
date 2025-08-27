from fastapi import FastAPI
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Beautify AI Backend - Minimal Test",
    description="Testing basic functionality",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "message": "Beautify AI Backend - Minimal Test",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Fly.io"""
    return {
        "status": "healthy",
        "service": "beautify-ai-backend-minimal"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 