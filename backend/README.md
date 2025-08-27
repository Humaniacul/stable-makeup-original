# FastAPI MediaPipe Face Landmark Detection Backend

This is a FastAPI backend that provides real MediaPipe face landmark detection for static images. It processes uploaded images and returns 468 3D facial landmarks using MediaPipe's FaceMesh solution.

## Features

- ✅ **Real MediaPipe FaceMesh** - Uses Google's MediaPipe library directly
- ✅ **Static Image Processing** - Processes uploaded images, not live video
- ✅ **468 3D Landmarks** - Returns full face mesh with x, y, z coordinates
- ✅ **Single Face Detection** - Optimized for one face per image
- ✅ **Fast & Clean** - Minimal dependencies, optimized for speed
- ✅ **Error Handling** - Returns HTTP 400 if no face is detected
- ✅ **CORS Enabled** - Ready for React Native integration

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Development Mode

```bash
python main.py
```

The server will start on `http://localhost:8000`

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST `/detect-face-landmarks`

Detects facial landmarks from an uploaded image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Image file with field name `file`

**Response (Success - 200):**
```json
{
  "success": true,
  "landmarks": [
    {
      "index": 0,
      "x": 0.5,
      "y": 0.3,
      "z": 0.01
    },
    // ... 467 more landmarks
  ],
  "total_landmarks": 468,
  "image_width": 640,
  "image_height": 480,
  "detection_method": "MediaPipe_FaceMesh",
  "message": "Successfully detected 468 facial landmarks"
}
```

**Response (No Face - 400):**
```json
{
  "detail": "No face detected in the image. Please ensure your face is clearly visible."
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "mediapipe_version": "0.10.8",
  "service": "Face Landmark Detection API"
}
```

### GET `/`

API information and usage instructions.

## Testing the API

### Using curl

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test face detection
curl -X POST \
  -F "file=@/path/to/your/image.jpg" \
  http://localhost:8000/detect-face-landmarks
```

### Using Python

```python
import requests

# Test with an image file
with open('selfie.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8000/detect-face-landmarks', files=files)
    
if response.status_code == 200:
    data = response.json()
    print(f"Detected {data['total_landmarks']} landmarks")
else:
    print(f"Error: {response.json()['detail']}")
```

## React Native Integration

Update the `BACKEND_URL` in your React Native component:

```javascript
// For local development
const BACKEND_URL = 'http://localhost:8000';

// For device testing (replace with your computer's IP)
const BACKEND_URL = 'http://192.168.1.100:8000';

// For production
const BACKEND_URL = 'https://your-domain.com';
```

## Landmark Format

The API returns 468 landmarks in MediaPipe's standard format:

- **x, y**: Normalized coordinates (0.0 to 1.0)
- **z**: Relative depth (smaller values = closer to camera)
- **index**: Landmark index (0 to 467)

## Performance Notes

- **Processing Time**: ~100-300ms per image (depends on image size)
- **Memory Usage**: ~50MB baseline + image processing
- **Supported Formats**: JPEG, PNG, WebP, BMP
- **Recommended Image Size**: 640x480 to 1920x1080

## Troubleshooting

### Common Issues

1. **"No face detected"**
   - Ensure face is clearly visible and well-lit
   - Face should be facing the camera (not profile)
   - Try different lighting conditions

2. **"Network request failed"**
   - Check if the server is running
   - Verify the correct IP address/port
   - Check firewall settings

3. **Import errors**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python version compatibility

### Logs

The server provides detailed logging. Check the console output for:
- Image processing information
- MediaPipe detection results
- Error details

## Production Deployment

For production deployment, consider:

1. **Environment Variables:**
   ```bash
   export BACKEND_HOST=0.0.0.0
   export BACKEND_PORT=8000
   ```

2. **CORS Configuration:**
   Update `allow_origins` in `main.py` to your specific domains

3. **SSL/HTTPS:**
   Use a reverse proxy (nginx) or deploy to a platform with SSL support

4. **Scaling:**
   Use multiple workers: `uvicorn main:app --workers 4`

## Dependencies

- **FastAPI**: Web framework
- **MediaPipe**: Face landmark detection
- **OpenCV**: Image processing
- **Pillow**: Image format support
- **Uvicorn**: ASGI server

## License

This project is part of the Beautify app and follows the same license terms. 