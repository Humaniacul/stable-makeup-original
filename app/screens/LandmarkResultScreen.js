import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Landmark Result Screen Component
 * Displays detailed facial landmark analysis with coordinates and visual overlay
 */
const LandmarkResultScreen = ({ route, navigation }) => {
  const { landmarkData, photoUri, makeupData } = route.params || {};
  const [selectedFeature, setSelectedFeature] = useState('overview');

  // Safety check for missing data
  if (!landmarkData || !landmarkData.feature_coordinates) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="error-outline" size={64} color="#FF6B9D" />
        <Text style={styles.errorText}>No landmark data available</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.actionButtonText}>Go Back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { feature_coordinates, total_landmarks, raw_landmarks, facial_measurements } = landmarkData;

  /**
   * Render feature selector tabs
   */
  const renderFeatureSelector = () => {
    const features = [
      { key: 'overview', label: '👁️ Overview', icon: 'visibility' },
      { key: 'eyes', label: '👁️ Eyes', icon: 'remove-red-eye' },
      { key: 'nose', label: '👃 Nose', icon: 'face' },
      { key: 'lips', label: '👄 Lips', icon: 'favorite' },
      { key: 'measurements', label: '📏 Measurements', icon: 'straighten' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featureSelector}>
        {features.map((feature) => (
          <TouchableOpacity
            key={feature.key}
            style={[
              styles.featureTab,
              selectedFeature === feature.key && styles.featureTabActive
            ]}
            onPress={() => setSelectedFeature(feature.key)}
          >
            <Icon 
              name={feature.icon} 
              size={16} 
              color={selectedFeature === feature.key ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.featureTabText,
              selectedFeature === feature.key && styles.featureTabTextActive
            ]}>
              {feature.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  /**
   * Render landmark coordinates for a specific feature
   */
  const renderLandmarkCoordinates = (landmarks, title) => {
    if (!landmarks || landmarks.length === 0) return null;

    return (
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {landmarks.map((point, index) => (
            <View key={index} style={styles.coordinatePoint}>
              <Text style={styles.coordinateIndex}>{index}</Text>
              <Text style={styles.coordinateValue}>
                X: {Math.round(point.x)}
              </Text>
              <Text style={styles.coordinateValue}>
                Y: {Math.round(point.y)}
              </Text>
              {point.z !== undefined && (
                <Text style={styles.coordinateValue}>
                  Z: {point.z.toFixed(2)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Render detailed feature analysis
   */
  const renderFeatureDetails = () => {
    switch (selectedFeature) {
      case 'overview':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>🎯 MediaPipe Analysis Summary</Text>
              <Text style={styles.summaryText}>
                ✅ {total_landmarks} facial landmarks detected
              </Text>
              <Text style={styles.summaryText}>
                👁️ Eyes: Left ({Math.round(feature_coordinates.left_eye.center.x)}, {Math.round(feature_coordinates.left_eye.center.y)}) | Right ({Math.round(feature_coordinates.right_eye.center.x)}, {Math.round(feature_coordinates.right_eye.center.y)})
              </Text>
              <Text style={styles.summaryText}>
                👃 Nose: ({Math.round(feature_coordinates.nose.tip.x)}, {Math.round(feature_coordinates.nose.tip.y)})
              </Text>
              <Text style={styles.summaryText}>
                👄 Lips: ({Math.round(feature_coordinates.lips.center.x)}, {Math.round(feature_coordinates.lips.center.y)})
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Alert.alert(
                  '📊 All Landmarks Logged',
                  `Check the console for all ${total_landmarks} landmark coordinates`,
                  [{ text: 'OK' }]
                );
                console.log('🎯 All 468 MediaPipe Landmarks:', raw_landmarks);
              }}
            >
              <Text style={styles.actionButtonText}>📊 Log All {total_landmarks} Landmarks</Text>
            </TouchableOpacity>
          </View>
        );

      case 'eyes':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>👁️ Eye Analysis</Text>
              <Text style={styles.featureDetail}>
                Left Eye Center: ({Math.round(feature_coordinates.left_eye.center.x)}, {Math.round(feature_coordinates.left_eye.center.y)})
              </Text>
              <Text style={styles.featureDetail}>
                Right Eye Center: ({Math.round(feature_coordinates.right_eye.center.x)}, {Math.round(feature_coordinates.right_eye.center.y)})
              </Text>
              <Text style={styles.featureDetail}>
                Eye Distance: {facial_measurements?.eye_distance || 'N/A'}px
              </Text>
            </View>
            {renderLandmarkCoordinates(feature_coordinates.left_eye.landmarks, 'Left Eye Landmarks')}
            {renderLandmarkCoordinates(feature_coordinates.right_eye.landmarks, 'Right Eye Landmarks')}
          </View>
        );

      case 'nose':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>👃 Nose Analysis</Text>
              <Text style={styles.featureDetail}>
                Nose Tip: ({Math.round(feature_coordinates.nose.tip.x)}, {Math.round(feature_coordinates.nose.tip.y)})
              </Text>
              <Text style={styles.featureDetail}>
                Nose Bridge: ({Math.round(feature_coordinates.nose.bridge.x)}, {Math.round(feature_coordinates.nose.bridge.y)})
              </Text>
              <Text style={styles.featureDetail}>
                Nose Width: {facial_measurements?.nose_width || 'N/A'}px
              </Text>
            </View>
            {renderLandmarkCoordinates(feature_coordinates.nose.landmarks, 'Nose Landmarks')}
          </View>
        );

      case 'lips':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>👄 Lip Analysis</Text>
              <Text style={styles.featureDetail}>
                Lip Center: ({Math.round(feature_coordinates.lips.center.x)}, {Math.round(feature_coordinates.lips.center.y)})
              </Text>
              <Text style={styles.featureDetail}>
                Left Corner: ({Math.round(feature_coordinates.lips.corners[0].x)}, {Math.round(feature_coordinates.lips.corners[0].y)})
              </Text>
              <Text style={styles.featureDetail}>
                Right Corner: ({Math.round(feature_coordinates.lips.corners[1].x)}, {Math.round(feature_coordinates.lips.corners[1].y)})
              </Text>
              <Text style={styles.featureDetail}>
                Lip Width: {facial_measurements?.lip_width || 'N/A'}px
              </Text>
            </View>
            {renderLandmarkCoordinates(feature_coordinates.lips.upper_lip, 'Upper Lip Landmarks')}
            {renderLandmarkCoordinates(feature_coordinates.lips.lower_lip, 'Lower Lip Landmarks')}
          </View>
        );

      case 'measurements':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>📏 Facial Measurements</Text>
              {facial_measurements && Object.entries(facial_measurements).map(([key, value]) => (
                <Text key={key} style={styles.featureDetail}>
                  {key.replace('_', ' ').toUpperCase()}: {value}px
                </Text>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facial Landmarks</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            Alert.alert('Share Feature', 'Sharing landmark data coming soon!');
          }}
        >
          <Icon name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Photo Preview */}
      {photoUri && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoOverlayText}>
              📍 {total_landmarks} landmarks detected
            </Text>
          </View>
        </View>
      )}

      {/* Feature Selector */}
      {renderFeatureSelector()}

      {/* Feature Details */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderFeatureDetails()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => {
            navigation.navigate('Result', {
              makeupData: makeupData,
              photoUri: photoUri,
              landmarkData: landmarkData,
              analysisType: 'mediapipe_photo_analysis',
              isMediaPipeData: true
            });
          }}
        >
          <Text style={styles.actionButtonText}>🎨 View Makeup Results</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.actionButtonText}>📷 Take New Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 8,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  photo: {
    width: screenWidth - 32,
    height: 200,
    borderRadius: 8,
    margin: 16,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  photoOverlayText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  featureSelector: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  featureTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
  },
  featureTabActive: {
    backgroundColor: '#FF6B9D',
  },
  featureTabText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  featureTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  featureCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  featureCardTitle: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDetail: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  coordinatesContainer: {
    marginBottom: 16,
  },
  coordinatesTitle: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coordinatePoint: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  coordinateIndex: {
    color: '#FF6B9D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coordinateValue: {
    color: '#fff',
    fontSize: 10,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default LandmarkResultScreen; 