# Facial Landmark Detection Setup Guide

## Overview

This guide explains how to set up and use the MediaPipe-based facial landmark detection system in the AI Makeup Assistant app. The system detects 460+ facial keypoints in real-time for precise makeup analysis and recommendations.

## Features

- **Real-time Face Detection**: Uses MediaPipe to detect faces with 460+ landmarks
- **High-Performance Processing**: Optimized for smooth real-time performance
- **Comprehensive Analysis**: Detects eyes, nose, lips, eyebrows, and face contours
- **Quality Assessment**: Automatically determines if face is suitable for makeup analysis
- **Advanced Metrics**: Provides confidence scores, face orientation, and expressions

## Architecture

### Core Components

1. **FaceDetectionService** (`app/services/faceDetectionService.js`)
   - Handles MediaPipe integration
   - Processes camera frames
   - Extracts and organizes facial landmarks
   - Formats data for AI processing

2. **FacialLandmarkCamera** (`app/components/FacialLandmarkCamera.js`)
   - Provides camera interface
   - Real-time landmark visualization
   - User interaction handling
   - Photo capture functionality

3. **HomeScreen Integration** (`app/screens/HomeScreen.js`)
   - Launches facial landmark detection
   - Handles detection results
   - Analyzes face shape and features

## Setup Instructions

### Prerequisites

Since this feature uses native modules, you need to use Expo Development Build instead of Expo Go.

### 1. Install Dependencies

All required dependencies are already installed:
```bash
npm install react-native-vision-camera react-native-worklets-core
npm install vision-camera-face-detector
npx expo install expo-dev-client
```

### 2. Build Development Client

To test the facial landmark detection, you need to create a development build:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo account
eas login

# Build development client for Android
eas build --profile development --platform android

# Build development client for iOS
eas build --profile development --platform ios
```

### 3. Install Development Build

After the build completes, install the development build APK/IPA on your device.

### 4. Run the Development Server

```bash
# Start the development server
npm run dev-build

# Or for specific platforms
npm run dev-build:android
npm run dev-build:ios
```

## Usage

### 1. Launch Facial Analysis

- Open the app in your development build
- Tap the center "Scan" button in the bottom navigation
- Or tap "Analyze Face" in the AI Makeup section

### 2. Position Your Face

- Hold the device at arm's length
- Ensure good lighting
- Keep your face centered and looking forward
- The app will show real-time feedback:
  - "Looking for face..." - No face detected
  - "Position your face properly" - Face detected but not suitable
  - "Perfect! X landmarks detected" - Ready for analysis

### 3. Capture and Analyze

- When the face is properly positioned, tap the capture button
- The app will analyze the 460+ facial landmarks
- Results include:
  - Face shape determination
  - Eye shape analysis
  - Lip shape analysis
  - Makeup zone mapping

## Technical Details

### Facial Landmarks

The system detects 460+ facial landmarks including:

- **Face Contour**: 17 points defining face shape
- **Eyebrows**: 10 points (5 per eyebrow)
- **Eyes**: 12 points (6 per eye)
- **Nose**: 9 points (bridge and tip)
- **Lips**: 20 points (upper and lower)
- **Additional Points**: 400+ additional mesh points for precise analysis

### Performance Optimization

- **Worklets**: Frame processing runs on the UI thread for smooth performance
- **Confidence Filtering**: Only processes high-confidence detections
- **Smart Capture**: Automatically captures when face is optimally positioned
- **Efficient Processing**: Minimal computational overhead

### Data Format

The system outputs landmarks in a standardized format:

```javascript
{
  normalized_landmarks: [
    { x: 0.5, y: 0.3, z: 0.1 }, // Normalized coordinates (0-1)
    // ... 460+ more points
  ],
  makeup_zones: {
    eyes: {
      left: [...], // Left eye landmarks
      right: [...], // Right eye landmarks
      eyebrows: {
        left: [...], // Left eyebrow landmarks
        right: [...] // Right eyebrow landmarks
      }
    },
    lips: [...], // Lip landmarks
    face: [...], // Face contour landmarks
    nose: [...] // Nose landmarks
  },
  metadata: {
    confidence: 0.95, // Detection confidence (0-1)
    head_pose: {
      pitch: 5, // Head tilt up/down
      yaw: -2, // Head turn left/right
      roll: 1 // Head rotation
    },
    expressions: {
      smiling: 0.8, // Smile probability
      left_eye_open: 0.9, // Left eye open probability
      right_eye_open: 0.9 // Right eye open probability
    },
    total_landmarks: 468, // Number of detected landmarks
    is_suitable_for_makeup: true // Whether face is suitable for analysis
  }
}
```

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Ensure camera permissions are granted in device settings
   - Check app.config.js for correct permission descriptions

2. **Face Not Detected**
   - Improve lighting conditions
   - Ensure face is clearly visible
   - Check device camera functionality

3. **Low Performance**
   - Close other apps to free memory
   - Ensure device meets minimum requirements
   - Check for app updates

4. **Build Errors**
   - Ensure you're using a development build, not Expo Go
   - Verify all native dependencies are properly installed
   - Clear cache and rebuild if necessary

### Debug Information

In development mode, the camera shows debug information:
- Number of landmarks detected
- Confidence percentage
- Face size metrics
- Suitability status

## Integration with AI Analysis

The facial landmarks are automatically integrated with the AI makeup analysis system:

1. **Face Shape Detection**: Determines oval, round, square, heart, or long face shapes
2. **Feature Analysis**: Analyzes eye shape, lip shape, and facial proportions
3. **Makeup Recommendations**: Uses landmark data to suggest optimal makeup styles
4. **Product Suggestions**: Recommends products based on detected facial features

## Future Enhancements

Planned improvements include:
- **Skin tone analysis** using additional color detection
- **Age estimation** for age-appropriate makeup recommendations
- **Emotion detection** for mood-based makeup suggestions
- **3D face modeling** for virtual try-on experiences
- **Multiple face detection** for group selfies

## Support

For technical support or questions:
1. Check the console logs for error messages
2. Verify your development build is up to date
3. Ensure proper permissions are granted
4. Test on different devices if issues persist

## Performance Notes

- **Recommended Devices**: Modern smartphones with good cameras
- **Lighting**: Natural lighting provides best results
- **Distance**: Hold device 18-24 inches from face
- **Orientation**: Portrait mode recommended
- **Stability**: Keep device steady during analysis

The facial landmark detection system provides a powerful foundation for advanced AI makeup analysis, offering precise facial feature detection with high performance and reliability. 