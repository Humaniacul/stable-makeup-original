import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import flyBackendService from '../services/flyBackendService';
import chatgptService from '../services/chatgptService';
import * as makeupService from '../services/makeupService';

const { width } = Dimensions.get('window');

const PromptInputScreen = ({ navigation, route }) => {
  const { photoData } = route.params;
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Predefined style suggestions
  const stylePresets = [
    {
      id: 1,
      title: 'Natural Glow',
      description: 'Soft, natural makeup with dewy finish',
      prompt: 'natural glowing makeup with subtle highlighting, soft pink lips, and minimal eye makeup'
    },
    {
      id: 2,
      title: 'Glamorous Evening',
      description: 'Bold, dramatic look for special occasions',
      prompt: 'glamorous evening makeup with smoky eyes, bold winged eyeliner, contoured cheeks, and glossy lips'
    },
    {
      id: 3,
      title: 'Latina Glam',
      description: 'Warm, bold makeup with bronze tones',
      prompt: 'latina glam makeup with bold eyeliner, warm bronze tones, contoured cheeks, and glossy nude lips'
    },
    {
      id: 4,
      title: 'Bridal Elegance',
      description: 'Classic, timeless bridal makeup',
      prompt: 'elegant bridal makeup with soft smoky eyes, natural contouring, rosy cheeks, and nude pink lips'
    },
    {
      id: 5,
      title: 'Korean Beauty',
      description: 'Fresh, youthful K-beauty inspired look',
      prompt: 'korean beauty makeup with gradient lips, straight brows, subtle eyeshadow, and glass skin finish'
    },
    {
      id: 6,
      title: 'Vintage Glam',
      description: 'Classic Hollywood glamour',
      prompt: 'vintage hollywood makeup with winged eyeliner, red lips, defined brows, and matte finish'
    }
  ];

  const handlePresetSelect = (preset) => {
    setPrompt(preset.prompt);
  };

  const handleContinue = async () => {
    if (!prompt.trim()) {
      Alert.alert('Prompt Required', 'Please describe your desired makeup style or select a preset.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🎭 Starting real AI makeup analysis...');
      console.log('📸 Photo URI:', photoData.uri);
      console.log('💬 User prompt:', prompt);

      // Use the new makeup service that handles everything automatically
      const makeupResult = await makeupService.analyzeMakeup(photoData.uri, prompt);
      
      if (!makeupResult.success) {
        throw new Error(`Makeup analysis failed: ${makeupResult.error}`);
      }

      console.log('✅ Real AI makeup analysis complete!');
      console.log('📊 Results:', {
        hasData: !!makeupResult.data,
        style: makeupResult.data?.makeupStyle,
        landmarks: makeupResult.data?.totalLandmarks,
        products: makeupResult.data?.products?.length,
        backend: makeupResult.data?.backend
      });

      // Navigate to results with the complete data from the new service
      navigation.navigate('Result', { makeupData: makeupResult.data });
      
    } catch (error) {
      console.error('💥 Real AI makeup analysis error:', error);
      
      // Handle authentication errors specifically
      if (error.message.includes('Authentication') || error.message.includes('sign in')) {
        Alert.alert(
          'Authentication Required',
          error.message,
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
      Alert.alert('Analysis Failed', `Could not process your request: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Describe Your Look</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Preview */}
        <View style={styles.photoPreview}>
          <Image source={{ uri: photoData.uri }} style={styles.previewImage} />
        </View>

        {/* Prompt Input Section */}
        <View style={styles.promptSection}>
          <Text style={styles.sectionTitle}>What makeup style would you like?</Text>
          <Text style={styles.sectionSubtitle}>
            Describe your desired look or choose from our popular styles below
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="e.g., natural glowing makeup for a date night..."
            placeholderTextColor="#666"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Style Presets */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>Popular Styles</Text>
          <View style={styles.presetGrid}>
            {stylePresets.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetCard,
                  prompt === preset.prompt && styles.presetCardSelected
                ]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text style={styles.presetTitle}>{preset.title}</Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !prompt.trim() && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!prompt.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.continueButtonText, { marginLeft: 8 }]}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B9D',
  },
  promptSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#444',
  },
  presetsSection: {
    marginBottom: 30,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  presetCard: {
    width: (width - 50) / 2,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  presetCardSelected: {
    borderColor: '#FF6B9D',
    backgroundColor: '#3a2a3a',
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default PromptInputScreen; 