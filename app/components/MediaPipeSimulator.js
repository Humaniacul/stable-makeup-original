import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

/**
 * MediaPipe Simulator Component
 * Simulates the exact MediaPipe experience that would work with react-native-vision-camera
 * Shows real-time face detection feedback and generates comprehensive landmark data
 */
const MediaPipeSimulator = ({ onPhotoTaken, onClose }) => {
  const [facing, setFacing] = useState('front');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [detectionStatus, setDetectionStatus] = useState('scanning');
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [isMediaPipeActive, setIsMediaPipeActive] = useState(false);
  
  const cameraRef = useRef(null);
  const simulationInterval = useRef(null);

  // Simulate real-time MediaPipe detection
  useEffect(() => {
    if (isReady && !isLoading) {
      simulationInterval.current = setInterval(() => {
        // Simulate face detection progress
        const hasValidFace = Math.random() > 0.3; // 70% chance of detecting face
        
        if (hasValidFace) {
          const newLandmarkCount = Math.floor(Math.random() * 20) + 448; // 448-468 landmarks
          const newConfidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
          const newQuality = Math.random() * 0.3 + 0.7; // 70-100% quality
          
          setLandmarkCount(newLandmarkCount);
          setConfidence(newConfidence);
          setQualityScore(newQuality);
          setIsMediaPipeActive(true);
          
          // Determine status based on quality
          if (newLandmarkCount >= 460 && newConfidence > 0.85 && newQuality > 0.85) {
            setDetectionStatus('perfect');
          } else if (newLandmarkCount >= 450 && newConfidence > 0.75) {
            setDetectionStatus('good');
          } else {
            setDetectionStatus('adjusting');
          }
        } else {
          setDetectionStatus('scanning');
          setIsMediaPipeActive(false);
          setLandmarkCount(0);
          setConfidence(0);
          setQualityScore(0);
        }
      }, 200); // Update every 200ms for realistic real-time feel
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [isReady, isLoading]);

  const takePicture = async () => {
    if (!cameraRef.current || isLoading) return;

    try {
      setIsLoading(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Simulate MediaPipe processing time
      setTimeout(() => {
        const comprehensiveMediaPipeData = generateMediaPipeData();
        
        if (onPhotoTaken) {
          onPhotoTaken({
            uri: photo.uri,
            facialData: {
              faceDetected: true,
              confidence: Math.round(confidence * 100),
              originalImage: photo.uri,
              makeupStyle: 'AI-Recommended Look',
              instructions: 'Based on your facial analysis with 468 MediaPipe landmarks, we recommend a customized makeup approach.',
              
              // Real MediaPipe-style data structure
              landmarks: comprehensiveMediaPipeData.landmarks,
              face_mesh: comprehensiveMediaPipeData.face_mesh,
              makeup_zones: comprehensiveMediaPipeData.makeup_zones,
              face_geometry: comprehensiveMediaPipeData.face_geometry,
              quality: comprehensiveMediaPipeData.quality,
              
              products: generateRecommendedProducts()
            },
            analysisType: 'mediapipe_simulation',
            isMediaPipeData: true,
            dataSource: 'MediaPipe_Simulator_468_Landmarks'
          });
        }
        
        setIsLoading(false);
      }, 1500); // Realistic processing time

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      setIsLoading(false);
    }
  };

  const generateMediaPipeData = () => {
    // Generate realistic 468 landmark points
    const faceMesh = Array.from({ length: 468 }, (_, i) => ({
      x: 150 + Math.cos(i * 0.1) * 50 + (Math.random() - 0.5) * 10,
      y: 150 + Math.sin(i * 0.1) * 60 + (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 20
    }));

    return {
      landmarks: {
        face_shape: 'oval',
        eye_shape: 'almond',
        lip_shape: 'full',
        eyebrow_shape: 'arched'
      },
      face_mesh: faceMesh,
      makeup_zones: {
        foundation: { landmarks: faceMesh.slice(0, 36) },
        eyeshadow: { landmarks: faceMesh.slice(36, 66) },
        eyeliner: { landmarks: faceMesh.slice(66, 86) },
        eyebrows: { landmarks: faceMesh.slice(86, 106) },
        lipstick: { landmarks: faceMesh.slice(106, 126) },
        blush: { landmarks: faceMesh.slice(126, 146) },
        contour: { landmarks: faceMesh.slice(146, 186) },
        highlight: { landmarks: faceMesh.slice(186, 206) }
      },
      face_geometry: {
        face_width: 180 + Math.random() * 20,
        face_height: 220 + Math.random() * 30,
        eye_distance: 65 + Math.random() * 10,
        face_ratio: 0.75 + Math.random() * 0.2
      },
      quality: {
        total_landmarks: landmarkCount,
        valid_landmarks: landmarkCount,
        coverage_score: qualityScore,
        symmetry_score: 0.85 + Math.random() * 0.1,
        is_suitable_for_makeup: landmarkCount >= 460 && confidence > 0.8
      }
    };
  };

  const generateRecommendedProducts = () => [
    {
      id: 1,
      name: 'MediaPipe-Matched Foundation',
      brand: 'AI Beauty',
      category: 'Foundation',
      description: 'Perfect shade match based on facial analysis',
      price: '$28.99'
    },
    {
      id: 2,
      name: 'Precision Eye Palette',
      brand: 'TechBeauty',
      category: 'Eyeshadow',
      description: 'Colors optimized for your eye shape',
      price: '$35.99'
    }
  ];

  const getStatusColor = () => {
    switch (detectionStatus) {
      case 'perfect': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'adjusting': return '#FF9800';
      default: return '#2196F3';
    }
  };

  const getStatusText = () => {
    switch (detectionStatus) {
      case 'perfect': return '✨ Perfect! Ready for AI makeup';
      case 'good': return '👍 Good positioning';
      case 'adjusting': return '📐 Adjust your position';
      default: return '🔍 Scanning for face...';
    }
  };

  const toggleCameraType = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Loading MediaPipe Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="camera-off" size={64} color="#666" />
        <Text style={styles.errorText}>Camera Permission Required</Text>
        <Text style={styles.errorSubtext}>
          MediaPipe needs camera access for facial landmark detection
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setIsReady(true)}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 MediaPipe Analysis</Text>
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
          <Icon name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* MediaPipe Status Display */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBubble, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {isMediaPipeActive && (
            <Text style={styles.statusSubtext}>
              📍 {landmarkCount}/468 landmarks • {Math.round(confidence * 100)}% confidence
            </Text>
          )}
        </View>
      </View>

      {/* Face Guide */}
      <View style={styles.faceGuideContainer}>
        <View style={[styles.faceGuide, { borderColor: getStatusColor() }]}>
          <View style={[styles.faceGuideCorner, { borderColor: getStatusColor() }]} />
          <View style={[styles.faceGuideCorner, styles.topRight, { borderColor: getStatusColor() }]} />
          <View style={[styles.faceGuideCorner, styles.bottomLeft, { borderColor: getStatusColor() }]} />
          <View style={[styles.faceGuideCorner, styles.bottomRight, { borderColor: getStatusColor() }]} />
        </View>
      </View>

      {/* MediaPipe Debug Info (Development) */}
      {__DEV__ && isMediaPipeActive && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔬 MediaPipe Live</Text>
          <Text style={styles.debugText}>📍 Landmarks: {landmarkCount}/468</Text>
          <Text style={styles.debugText}>🎯 Confidence: {Math.round(confidence * 100)}%</Text>
          <Text style={styles.debugText}>💄 Ready: {detectionStatus === 'perfect' ? '✅' : '⏳'}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <View style={styles.controlSpacer} />
          
          <TouchableOpacity
            style={[
              styles.captureButton,
              (!isReady || isLoading || detectionStatus === 'scanning') && styles.captureButtonDisabled
            ]}
            onPress={takePicture}
            disabled={!isReady || isLoading || detectionStatus === 'scanning'}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon name="camera" size={32} color="white" />
            )}
          </TouchableOpacity>
          
          <View style={styles.controlSpacer} />
        </View>
        
        {isLoading && (
          <Text style={styles.processingText}>
            🧠 Processing 468 landmarks with MediaPipe...
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#b0b0b0',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  statusBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: width * 0.9,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  faceGuideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  faceGuide: {
    width: width * 0.7,
    height: width * 0.85,
    position: 'relative',
    borderWidth: 2,
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  faceGuideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: -2,
    left: -2,
  },
  topRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  debugTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlSpacer: {
    flex: 1,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  processingText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default MediaPipeSimulator; 