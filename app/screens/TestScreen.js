import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as makeupService from '../services/makeupService';
import flyBackendService from '../services/flyBackendService';
import chatgptService from '../services/chatgptService';
import stableDiffusionService from '../services/stableDiffusionService';

const TestScreen = ({ navigation }) => {
  const [testResults, setTestResults] = useState({
    backend: { status: 'untested', message: '', data: null },
    chatgpt: { status: 'untested', message: '', data: null },
    mediapipe: { status: 'untested', message: '', data: null },
    stableDiffusion: { status: 'untested', message: '', data: null },
    completePipeline: { status: 'untested', message: '', data: null },
    overall: { status: 'untested', message: '' }
  });
  
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testImage, setTestImage] = useState(null);
  const [fullAnalysisResult, setFullAnalysisResult] = useState(null);

  // Auto-run basic tests on component mount
  useEffect(() => {
    runBasicTests();
  }, []);

  const runBasicTests = async () => {
    setIsRunningTests(true);
    
    try {
      // Test services
      const results = await makeupService.testServices();
      setTestResults(prev => ({ ...prev, ...results }));
      
      console.log('🧪 Basic tests completed:', results);
    } catch (error) {
      console.error('🧪 Basic tests failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const pickTestImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setTestImage(result.assets[0]);
        setFullAnalysisResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takeTestPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setTestImage(result.assets[0]);
        setFullAnalysisResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const testMediaPipeWithImage = async () => {
    if (!testImage) {
      Alert.alert('No Image', 'Please select a test image first');
      return;
    }

    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing MediaPipe with image...');
      
      const result = await makeupService.testMediaPipeWithImage(testImage.uri);
      
      setTestResults(prev => ({
        ...prev,
        mediapipe: {
          status: result.success ? 'success' : 'error',
          message: result.message,
          data: result
        }
      }));
      
      console.log('🧪 MediaPipe test result:', result);
    } catch (error) {
      console.error('🧪 MediaPipe test failed:', error);
      setTestResults(prev => ({
        ...prev,
        mediapipe: {
          status: 'error',
          message: error.message,
          data: null
        }
      }));
    } finally {
      setIsRunningTests(false);
    }
  };

  const testStableDiffusion = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🎨 Testing Stable Diffusion service...');
      
      const result = await stableDiffusionService.testService();
      
      let status = 'error';
      let message = 'Service not configured';
      
      if (result.ready) {
        status = 'success';
        message = `✅ Replicate API connected - ${result.config.model}`;
      } else if (result.success) {
        if (!result.config.hasApiKey) {
          status = 'partial';
          message = '⚠️ Missing API key - Get from replicate.com';
        } else if (result.config.apiStatus === 'auth_failed') {
          status = 'error';
          message = '❌ Invalid API key - Check your token';
        } else {
          status = 'error';
          message = '❌ Connection failed - Check internet';
        }
      }
      
      setTestResults(prev => ({
        ...prev,
        stableDiffusion: {
          status,
          message,
          data: result
        }
      }));
      
      console.log('🎨 Stable Diffusion test result:', result);
    } catch (error) {
      console.error('🎨 Stable Diffusion test failed:', error);
      setTestResults(prev => ({
        ...prev,
        stableDiffusion: {
          status: 'error',
          message: error.message,
          data: null
        }
      }));
    } finally {
      setIsRunningTests(false);
    }
  };

  const runCompletePipeline = async () => {
    if (!testImage) {
      Alert.alert('No Image', 'Please select a test image first');
      return;
    }

    setIsRunningTests(true);
    
    try {
      console.log('🚀 Testing complete makeup pipeline...');
      
      const result = await makeupService.testCompletePipeline(
        testImage.uri, 
        'glamorous evening makeup for testing'
      );
      
      setTestResults(prev => ({
        ...prev,
        completePipeline: {
          status: result.readyForProduction ? 'success' : result.success ? 'partial' : 'error',
          message: result.readyForProduction ? 'Complete pipeline ready!' :
                   result.success ? 'Pipeline works but some services need setup' :
                   'Pipeline failed',
          data: result
        }
      }));
      
      setFullAnalysisResult(result.fullPipeline);
      
      console.log('🚀 Complete pipeline test result:', result);
    } catch (error) {
      console.error('🚀 Complete pipeline test failed:', error);
      Alert.alert('Pipeline Test Failed', error.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runFullAnalysis = async () => {
    if (!testImage) {
      Alert.alert('No Image', 'Please select a test image first');
      return;
    }

    setIsRunningTests(true);
    
    try {
      console.log('🧪 Running full AI makeup analysis...');
      
      const result = await makeupService.analyzeMakeup(
        testImage.uri, 
        'natural glowing makeup for testing',
        { applyMakeup: true } // Enable Stable Diffusion
      );
      
      setFullAnalysisResult(result);
      
      console.log('🧪 Full analysis result:', result);
    } catch (error) {
      console.error('🧪 Full analysis failed:', error);
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'partial': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'partial': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const StatusCard = ({ title, status, message, data }) => (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={[styles.statusIcon, { color: getStatusColor(status) }]}>
          {getStatusIcon(status)}
        </Text>
      </View>
      <Text style={[styles.statusMessage, { color: getStatusColor(status) }]}>
        {message}
      </Text>
      {data && (
        <Text style={styles.statusData}>
          {JSON.stringify(data, null, 2)}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧪 AI Services Test</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={runBasicTests}
          disabled={isRunningTests}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Status</Text>
          <StatusCard
            title="System Health"
            status={testResults.overall.status}
            message={testResults.overall.message}
          />
        </View>

        {/* Individual Service Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Tests</Text>
          
          <StatusCard
            title="Backend (fly.io)"
            status={testResults.backend.status}
            message={testResults.backend.message}
            data={testResults.backend.data}
          />
          
          <StatusCard
            title="ChatGPT"
            status={testResults.chatgpt.status}
            message={testResults.chatgpt.message}
          />
          
          <StatusCard
            title="MediaPipe"
            status={testResults.mediapipe.status}
            message={testResults.mediapipe.message}
            data={testResults.mediapipe.data}
          />
          
          <StatusCard
            title="Stable Diffusion"
            status={testResults.stableDiffusion.status}
            message={testResults.stableDiffusion.message}
            data={testResults.stableDiffusion.data}
          />
          
          <StatusCard
            title="Complete Pipeline"
            status={testResults.completePipeline.status}
            message={testResults.completePipeline.message}
            data={testResults.completePipeline.data}
          />
        </View>

        {/* Image Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Image Testing</Text>
          
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.actionButton} onPress={pickTestImage}>
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Pick Image</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={takeTestPhoto}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          {testImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: testImage.uri }} style={styles.testImage} />
              
              <View style={styles.testActions}>
                <TouchableOpacity 
                  style={[styles.testButton, styles.smallButton]} 
                  onPress={testMediaPipeWithImage}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testButtonText}>MediaPipe</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.testButton, styles.smallButton]} 
                  onPress={testStableDiffusion}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testButtonText}>Replicate</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.testActions}>
                <TouchableOpacity 
                  style={styles.testButton} 
                  onPress={runCompletePipeline}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testButtonText}>Complete Pipeline</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.testButton} 
                  onPress={runFullAnalysis}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testButtonText}>Full Analysis</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Full Analysis Results */}
        {fullAnalysisResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Full Analysis Result</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>
                Success: {fullAnalysisResult.success ? '✅' : '❌'}
              </Text>
              {fullAnalysisResult.success && fullAnalysisResult.data && (
                <>
                  <Text style={styles.resultText}>
                    Style: {fullAnalysisResult.data.makeupStyle}
                  </Text>
                  <Text style={styles.resultText}>
                    Landmarks: {fullAnalysisResult.data.totalLandmarks}
                  </Text>
                  <Text style={styles.resultText}>
                    Products: {fullAnalysisResult.data.products?.length || 0}
                  </Text>
                  <Text style={styles.resultText}>
                    Backend: {fullAnalysisResult.data.backend}
                  </Text>
                </>
              )}
              {fullAnalysisResult.error && (
                <Text style={styles.errorText}>
                  Error: {fullAnalysisResult.error}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Debug Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugText}>
              Environment: {__DEV__ ? 'Development' : 'Production'}
            </Text>
            <Text style={styles.debugText}>
              Force Real MediaPipe: True
            </Text>
            <Text style={styles.debugText}>
              Backend URL: https://beautify-ai-backend.fly.dev
            </Text>
            <Text style={styles.debugText}>
              ChatGPT Model: gpt-4o-mini
            </Text>
            <Text style={styles.debugText}>
              SD Provider: Replicate SD 3.5 Large
            </Text>
            <Text style={styles.debugText}>
              Pipeline: MediaPipe → ChatGPT → SD 3.5 Large
            </Text>
            <Text style={styles.debugText}>
              Cost: ~$0.012 per image generation
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2d2d2d',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusIcon: {
    fontSize: 20,
  },
  statusMessage: {
    fontSize: 14,
    marginBottom: 5,
  },
  statusData: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  imagePreview: {
    alignItems: 'center',
  },
  testImage: {
    width: 200,
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
  },
  testActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  testButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 5,
  },
  debugCard: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
  },
  debugText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 3,
    fontFamily: 'monospace',
  },
});

export default TestScreen; 