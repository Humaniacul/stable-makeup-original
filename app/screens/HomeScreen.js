import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import SimpleFaceCamera from '../components/SimpleFaceCamera';
import flyBackendService from '../services/flyBackendService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useUser();
  const { showToast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are required for the best experience.',
        [{ text: 'OK' }]
      );
    }
  };

  const openCamera = () => {
    // Check if user is authenticated before opening camera
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to use makeup features. Your photos are processed securely in the cloud.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setShowCamera(true);
  };

  const handlePhotoTaken = async (photoData) => {
    setShowCamera(false);
    
    console.log('📸 Photo taken, navigating to prompt input:', {
      uri: photoData.uri,
      hasUri: !!photoData.uri,
      dataKeys: Object.keys(photoData)
    });

    // Check if user is authenticated before proceeding
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to use makeup features. Your photos are processed securely in the cloud.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Navigate to prompt input screen with photo data
    navigation.navigate('PromptInput', { photoData });
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ Gallery image selected, navigating to prompt input:', {
          uri: result.assets[0].uri,
          hasUri: !!result.assets[0].uri
        });

        // Navigate to prompt input screen with photo data
        navigation.navigate('PromptInput', { photoData: result.assets[0] });
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.fullName || 'Beautiful'} ✨</Text>
            <Text style={styles.subtitle}>Ready for your makeup analysis?</Text>
          </View>
          <View style={styles.headerButtons}>
            {/* Test Button - for testing MediaPipe */}
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => navigation.navigate('Test')}
            >
              <Ionicons name="flask" size={20} color="#FF6B9D" />
            </TouchableOpacity>
            
            {/* Backend Test Button */}
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => navigation.navigate('TestBackend')}
            >
              <Ionicons name="server" size={20} color="#FF6B9D" />
            </TouchableOpacity>
            
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultProfile}>
                <Ionicons name="person" size={24} color="#b0b0b0" />
              </View>
            )}
          </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>AI Makeup Analysis</Text>
            <Text style={styles.heroSubtitle}>
              Get instant facial landmark detection and personalized makeup recommendations
            </Text>
          </View>

          {/* Main Action Button */}
          <TouchableOpacity style={styles.mainButton} onPress={openCamera}>
            <View style={styles.buttonContent}>
              <Ionicons name="camera" size={32} color="#fff" />
              <Text style={styles.mainButtonText}>Start Face Analysis</Text>
              <Text style={styles.mainButtonSubtext}>Take a photo for instant results</Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Action */}
          <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
            <Ionicons name="images" size={24} color="#FF6B9D" />
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What you'll get:</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FF6B9D" />
                <Text style={styles.featureText}>Facial landmark detection</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FF6B9D" />
                <Text style={styles.featureText}>Face shape analysis</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FF6B9D" />
                <Text style={styles.featureText}>Personalized makeup tips</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      {showCamera && (
        <Modal visible={showCamera} animationType="slide">
          <SimpleFaceCamera
            onPhotoTaken={handlePhotoTaken}
            onClose={() => setShowCamera(false)}
          />
        </Modal>
      )}

      {/* Loading Overlay */}
      {isAnalyzing && (
        <Modal transparent={true} visible={isAnalyzing}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B9D" />
              <Text style={styles.loadingText}>Analyzing with MediaPipe...</Text>
              <Text style={styles.loadingSubtext}>Getting your facial landmarks</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 4,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B9D',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultProfile: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3d3d3d',
  },
  mainContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  mainButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonContent: {
    alignItems: 'center',
  },
  mainButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  mainButtonSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#b0b0b0',
    marginLeft: 12,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 4,
  },
});

export default HomeScreen; 