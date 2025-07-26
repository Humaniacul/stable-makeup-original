import { Camera } from 'react-native-vision-camera';
import { MediaPipe } from 'react-native-mediapipe';
import { MediaPipeLandmarkProcessor } from './mediaPipeLandmarks';

class FaceDetectionService {
  constructor() {
    this.isInitialized = false;
    this.landmarkProcessor = new MediaPipeLandmarkProcessor();
    this.detectionOptions = {
      // MediaPipe configuration for maximum facial landmarks (468 points)
      performanceMode: 'accurate', // Use accurate mode for more landmarks
      landmarkMode: 'all', // Detect all available landmarks (468 points)
      contourMode: 'all', // Include face contours for precise boundaries
      classificationMode: 'all', // Include facial expressions and emotions
      minDetectionConfidence: 0.7, // Higher confidence for makeup application
      minTrackingConfidence: 0.7, // Consistent tracking across frames
      maxNumFaces: 1, // Focus on single face for makeup application
      refineLandmarks: true, // Enable iris and lip refinement
      enableFaceGeometry: true, // 3D face geometry for depth information
    };
  }

  /**
   * Initialize the face detection service
   */
  async initialize() {
    try {
      // Request camera permissions
      const permission = await Camera.requestCameraPermission();
      
      if (permission === 'denied') {
        throw new Error('Camera permission denied');
      }

      this.isInitialized = true;
      console.log('Face Detection Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Face Detection Service:', error);
      throw error;
    }
  }

  /**
   * Check if camera permission is granted
   */
  async checkCameraPermission() {
    const status = await Camera.getCameraPermissionStatus();
    return status === 'granted';
  }

  /**
   * Request camera permission if not granted
   */
  async requestCameraPermission() {
    const status = await Camera.getCameraPermissionStatus();
    
    if (status === 'not-determined') {
      return await Camera.requestCameraPermission();
    }
    
    return status;
  }

  /**
   * Process face detection frame and extract landmarks
   */
  processFrame = (frame) => {
    'worklet';
    
    try {
      // Note: Real MediaPipe processing happens in the backend via fly.io
      // This worklet is for camera frame processing only
      // The actual face detection and landmark processing is done server-side
      
      return null; // Camera frames are processed server-side
    } catch (error) {
      // Don't log in worklet context - causes issues
      return null;
    }
  };

  /**
   * Worklet-safe version of face landmark processing
   */
  processFaceLandmarksWorklet(face) {
    'worklet';
    
    if (!face || !face.landmarks) {
      return null;
    }

    // Simple processing without external dependencies for worklet context
    return {
      // Basic face info
      confidence: face.confidence || 0,
      bounds: face.bounds || {},
      
      // Raw landmarks
      raw_landmarks: face.landmarks,
      
      // Facial expressions and emotions
      expressions: {
        smiling: face.smilingProbability || 0,
        left_eye_open: face.leftEyeOpenProbability || 0,
        right_eye_open: face.rightEyeOpenProbability || 0,
      },
      
      // Head pose estimation
      head_pose: {
        pitch: face.headEulerAngleX || 0,
        yaw: face.headEulerAngleY || 0,
        roll: face.headEulerAngleZ || 0,
      },
      
      // Basic quality assessment (worklet-safe)
      is_ready_for_makeup: this.isSuitableForMakeupWorklet(face),
      
      // Timestamp for tracking
      timestamp: Date.now(),
    };
  }

  /**
   * Worklet-safe makeup suitability check
   */
  isSuitableForMakeupWorklet(face) {
    'worklet';
    
    if (!face) return false;

    const confidence = face.confidence > 0.7;
    const faceAngle = Math.abs(face.headEulerAngleY || 0) < 30 && Math.abs(face.headEulerAngleX || 0) < 20;
    const eyesOpen = (face.leftEyeOpenProbability || 0) > 0.5 && (face.rightEyeOpenProbability || 0) > 0.5;
    const sufficientLandmarks = face.landmarks && face.landmarks.length > 400;

    return confidence && faceAngle && eyesOpen && sufficientLandmarks;
  }

  /**
   * Process detected face landmarks using MediaPipe comprehensive analysis
   */
  processFaceLandmarks(face) {
    if (!face || !face.landmarks) {
      return null;
    }

    const landmarks = face.landmarks;
    
    // Use MediaPipe landmark processor for comprehensive analysis
    const processedLandmarks = this.landmarkProcessor.processLandmarks(landmarks);
    
    if (!processedLandmarks) {
      console.warn('MediaPipe processing failed, using fallback');
      return this.processFaceLandmarksFallback(face);
    }

    // Enhanced face data with MediaPipe processing
    return {
      // Basic face info
      confidence: face.confidence || 0,
      bounds: face.bounds || {},
      
      // MediaPipe processed facial features (468 landmarks organized)
      facial_features: processedLandmarks.facial_features,
      makeup_zones: processedLandmarks.makeup_zones,
      face_geometry: processedLandmarks.face_geometry,
      
      // Quality metrics for makeup application
      quality: processedLandmarks.quality_metrics,
      
      // Facial expressions and emotions
      expressions: {
        smiling: face.smilingProbability || 0,
        left_eye_open: face.leftEyeOpenProbability || 0,
        right_eye_open: face.rightEyeOpenProbability || 0,
      },
      
      // Head pose estimation
      head_pose: {
        pitch: face.headEulerAngleX || 0,
        yaw: face.headEulerAngleY || 0,
        roll: face.headEulerAngleZ || 0,
      },
      
      // Raw and processed data
      raw_landmarks: landmarks, // All 468 raw landmarks
      processed_landmarks: processedLandmarks,
      
      // ControlNet export data for AI processing
      controlnet_data: this.landmarkProcessor.exportForControlNet(processedLandmarks),
      
      // Makeup application readiness
      is_ready_for_makeup: processedLandmarks.quality_metrics?.is_suitable_for_makeup || false,
      
      // Timestamp for tracking
      timestamp: Date.now(),
    };
  }

  /**
   * Fallback processing if MediaPipe comprehensive analysis fails
   */
  processFaceLandmarksFallback(face) {
    console.log('Using fallback landmark processing');
    
    const landmarks = {
      // Basic face info
      confidence: face.confidence || 0,
      bounds: face.bounds || {},
      
      // Basic facial features with their landmarks
      face_oval: this.extractLandmarkGroup(face.landmarks, 'FACE_OVAL'),
      left_eyebrow: this.extractLandmarkGroup(face.landmarks, 'LEFT_EYEBROW'),
      right_eyebrow: this.extractLandmarkGroup(face.landmarks, 'RIGHT_EYEBROW'),
      left_eye: this.extractLandmarkGroup(face.landmarks, 'LEFT_EYE'),
      right_eye: this.extractLandmarkGroup(face.landmarks, 'RIGHT_EYE'),
      nose_bridge: this.extractLandmarkGroup(face.landmarks, 'NOSE_BRIDGE'),
      nose_tip: this.extractLandmarkGroup(face.landmarks, 'NOSE_TIP'),
      upper_lip: this.extractLandmarkGroup(face.landmarks, 'UPPER_LIP'),
      lower_lip: this.extractLandmarkGroup(face.landmarks, 'LOWER_LIP'),
      lips: this.extractLandmarkGroup(face.landmarks, 'LIPS'),
      
      // MediaPipe specific landmark groups
      face_mesh: face.landmarks || [], // All landmarks
      
      // Facial expressions and emotions
      expressions: {
        smiling: face.smilingProbability || 0,
        left_eye_open: face.leftEyeOpenProbability || 0,
        right_eye_open: face.rightEyeOpenProbability || 0,
      },
      
      // Head pose estimation
      head_pose: {
        pitch: face.headEulerAngleX || 0,
        yaw: face.headEulerAngleY || 0,
        roll: face.headEulerAngleZ || 0,
      },
      
      // Basic quality assessment
      is_ready_for_makeup: this.isSuitableForMakeup({
        confidence: face.confidence || 0,
        face_mesh: face.landmarks || [],
        expressions: {
          left_eye_open: face.leftEyeOpenProbability || 0,
          right_eye_open: face.rightEyeOpenProbability || 0,
        },
        head_pose: {
          pitch: face.headEulerAngleX || 0,
          yaw: face.headEulerAngleY || 0,
          roll: face.headEulerAngleZ || 0,
        }
      }),
      
      // Timestamp for tracking
      timestamp: Date.now(),
    };

    return landmarks;
  }

  /**
   * Extract specific landmark groups from the face landmarks array
   */
  extractLandmarkGroup(landmarks, groupName) {
    if (!landmarks || !Array.isArray(landmarks)) {
      return [];
    }

    // MediaPipe landmark indices for different facial features
    const landmarkGroups = {
      FACE_OVAL: Array.from({length: 17}, (_, i) => i), // Face contour
      LEFT_EYEBROW: Array.from({length: 5}, (_, i) => 17 + i), // Left eyebrow
      RIGHT_EYEBROW: Array.from({length: 5}, (_, i) => 22 + i), // Right eyebrow
      LEFT_EYE: Array.from({length: 6}, (_, i) => 36 + i), // Left eye
      RIGHT_EYE: Array.from({length: 6}, (_, i) => 42 + i), // Right eye
      NOSE_BRIDGE: Array.from({length: 4}, (_, i) => 27 + i), // Nose bridge
      NOSE_TIP: Array.from({length: 5}, (_, i) => 31 + i), // Nose tip
      UPPER_LIP: Array.from({length: 7}, (_, i) => 48 + i), // Upper lip
      LOWER_LIP: Array.from({length: 5}, (_, i) => 55 + i), // Lower lip
      LIPS: Array.from({length: 20}, (_, i) => 48 + i), // All lip landmarks
    };

    const indices = landmarkGroups[groupName] || [];
    return indices.map(index => landmarks[index]).filter(point => point);
  }

  /**
   * Convert landmarks to a format suitable for AI processing (ControlNet + Stable Diffusion)
   */
  formatLandmarksForAI(landmarks) {
    if (!landmarks) return null;

    // If we have MediaPipe processed data, use it
    if (landmarks.controlnet_data) {
      return {
        // ControlNet-ready face mesh data
        face_mesh: landmarks.controlnet_data.face_mesh,
        makeup_masks: landmarks.controlnet_data.makeup_masks,
        geometry: landmarks.controlnet_data.geometry,
        quality: landmarks.controlnet_data.quality,
        
        // Additional metadata for AI processing
        metadata: {
          confidence: landmarks.confidence,
          head_pose: landmarks.head_pose,
          expressions: landmarks.expressions,
          bounds: landmarks.bounds,
          timestamp: landmarks.timestamp,
          is_ready_for_makeup: landmarks.is_ready_for_makeup,
        },
        
        // Normalized coordinates for consistent processing
        normalized_landmarks: this.normalizeLandmarks(landmarks.raw_landmarks, landmarks.bounds),
        
        // Makeup zones with precise landmark mapping
        makeup_zones: landmarks.makeup_zones || this.extractFallbackMakeupZones(landmarks),
      };
    }

    // Fallback for basic landmark data
    return {
      // Normalized coordinates (0-1 range)
      normalized_landmarks: this.normalizeLandmarks(landmarks.face_mesh, landmarks.bounds),
      
      // Key facial features for makeup application
      makeup_zones: {
        eyes: {
          left: landmarks.left_eye,
          right: landmarks.right_eye,
          eyebrows: {
            left: landmarks.left_eyebrow,
            right: landmarks.right_eyebrow,
          }
        },
        lips: landmarks.lips,
        face: landmarks.face_oval,
        nose: [...(landmarks.nose_bridge || []), ...(landmarks.nose_tip || [])],
      },
      
      // Face orientation and expressions
      metadata: {
        confidence: landmarks.confidence,
        head_pose: landmarks.head_pose,
        expressions: landmarks.expressions,
        bounds: landmarks.bounds,
        timestamp: landmarks.timestamp,
        is_ready_for_makeup: landmarks.is_ready_for_makeup,
      }
    };
  }

  /**
   * Extract makeup zones from fallback landmark data
   */
  extractFallbackMakeupZones(landmarks) {
    return {
      foundation: landmarks.face_oval || [],
      eyeshadow: [...(landmarks.left_eye || []), ...(landmarks.right_eye || [])],
      eyeliner: [...(landmarks.left_eye || []), ...(landmarks.right_eye || [])],
      eyebrows: [...(landmarks.left_eyebrow || []), ...(landmarks.right_eyebrow || [])],
      lipstick: landmarks.lips || [],
      blush: [], // Would need cheek landmarks
      contour: landmarks.face_oval || [],
      highlight: [...(landmarks.nose_bridge || []), ...(landmarks.nose_tip || [])],
    };
  }

  /**
   * Normalize landmark coordinates to 0-1 range
   */
  normalizeLandmarks(landmarks, bounds) {
    if (!landmarks || !bounds || !bounds.width || !bounds.height) {
      return [];
    }

    return landmarks.map(point => ({
      x: (point.x - bounds.x) / bounds.width,
      y: (point.y - bounds.y) / bounds.height,
      z: point.z || 0, // Depth information if available
    }));
  }

  /**
   * Get landmark statistics for quality assessment
   */
  getLandmarkStats(landmarks) {
    if (!landmarks) {
      return null;
    }

    // Handle both worklet and full processed landmarks
    const rawLandmarks = landmarks.raw_landmarks || landmarks.face_mesh || [];
    const headPose = landmarks.head_pose || { yaw: 0, pitch: 0 };

    return {
      total_landmarks: rawLandmarks.length,
      confidence: landmarks.confidence || 0,
      face_size: this.calculateFaceSize(landmarks.bounds),
      face_angle: Math.abs(headPose.yaw) + Math.abs(headPose.pitch),
      is_suitable_for_makeup: landmarks.is_ready_for_makeup || false,
    };
  }

  /**
   * Calculate face size from bounds
   */
  calculateFaceSize(bounds) {
    if (!bounds || !bounds.width || !bounds.height) {
      return 0;
    }
    return bounds.width * bounds.height;
  }

  /**
   * Determine if the detected face is suitable for makeup application
   */
  isSuitableForMakeup(landmarks) {
    if (!landmarks) return false;

    const stats = {
      confidence: landmarks.confidence > 0.7,
      face_angle: Math.abs(landmarks.head_pose.yaw) < 30 && Math.abs(landmarks.head_pose.pitch) < 20,
      eyes_open: landmarks.expressions.left_eye_open > 0.5 && landmarks.expressions.right_eye_open > 0.5,
      sufficient_landmarks: landmarks.face_mesh.length > 400,
    };

    // All conditions must be met for suitable makeup application
    return Object.values(stats).every(condition => condition);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isInitialized = false;
    console.log('Face Detection Service cleaned up');
  }
}

export default new FaceDetectionService(); 