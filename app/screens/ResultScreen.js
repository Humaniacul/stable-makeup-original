import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity
} from 'react-native';



/**
 * Result Screen Component
 * Displays AI makeup analysis results including style, products, and instructions
 */
const ResultScreen = ({ route, navigation }) => {
  const { makeupData } = route.params || {};
  
  // Debug logging to see what data we received
  console.log('🎭 ResultScreen received data:', {
    hasParams: !!route.params,
    paramKeys: route.params ? Object.keys(route.params) : [],
    hasMakeupData: !!makeupData,
    makeupDataKeys: makeupData ? Object.keys(makeupData) : [],
    makeupDataStructure: JSON.stringify(makeupData, null, 2)
  });
  
  // Safety check for missing data
  if (!makeupData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>No makeup data available</Text>
        <TouchableOpacity 
          style={styles.tryAgainButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.tryAgainButtonText}>Go Back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Navigate back to home screen for new analysis
   */
  const handleTryAgain = () => {
    navigation.navigate('Home');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with confidence score and MediaPipe status */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Makeup Analysis</Text>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>
            Confidence: {makeupData.confidence || 0}%
          </Text>
        </View>
        
        {/* AI Processing Status Indicator */}
        <View style={styles.mediaPipeStatus}>
          <Text style={styles.mediaPipeStatusText}>
            {makeupData.backend === 'fly.io + ChatGPT + StableDiffusion' ? '🎯 Full AI Pipeline' : 
             makeupData.backend === 'fly.io + ChatGPT' ? '🎯 Real AI Analysis' : 
             makeupData.mediaPipeData ? '🎯 MediaPipe Active' : '⚠️ Using Mock Data'}
          </Text>
          {(makeupData.totalLandmarks || makeupData.mediaPipeData) && (
            <Text style={styles.landmarkCount}>
              📍 {makeupData.totalLandmarks || makeupData.mediaPipeData?.total_landmarks || 0}/468 landmarks
            </Text>
          )}
          {makeupData.stableDiffusion?.applied && (
            <Text style={styles.landmarkCount}>
              ✨ Makeup applied with {makeupData.stableDiffusion.model}
            </Text>
          )}
          {makeupData.backend && (
            <Text style={styles.backendInfo}>
              🖥️ Backend: {makeupData.backend}
            </Text>
          )}
        </View>
      </View>

      {/* Original and Processed Images */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Your Results</Text>
        
        <View style={styles.imageGrid}>
          {/* Original Image */}
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Original</Text>
        {makeupData.originalImage ? (
        <Image 
          source={{ uri: makeupData.originalImage }} 
                style={styles.gridImage} 
        />
        ) : (
              <View style={[styles.gridImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷</Text>
                <Text style={styles.placeholderSubtext}>Original not available</Text>
              </View>
            )}
          </View>

          {/* Processed Image with Makeup */}
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>
              {makeupData.hasMakeupApplied ? '✨ With Makeup' : '🎨 Generated'}
            </Text>
            {makeupData.processedImage && typeof makeupData.processedImage === 'string' ? (
              <Image 
                source={{ uri: makeupData.processedImage }} 
                style={styles.gridImage} 
              />
            ) : makeupData.stableDiffusion?.applied ? (
              <View style={[styles.gridImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>🎨</Text>
                <Text style={styles.placeholderSubtext}>Processing...</Text>
              </View>
            ) : (
              <View style={[styles.gridImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>✨</Text>
                <Text style={styles.placeholderSubtext}>Makeup not applied</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stable Diffusion Status */}
        {makeupData.stableDiffusion?.applied && (
          <View style={styles.processingInfo}>
            <Text style={styles.processingInfoText}>
              ✅ Makeup applied using {makeupData.stableDiffusion.model}
            </Text>
            <Text style={styles.processingInfoSubtext}>
              Processing time: {(makeupData.stableDiffusion.processingTime / 1000).toFixed(1)}s
            </Text>
          </View>
        )}
      </View>

      {/* Recommended Style */}
      <View style={styles.styleSection}>
        <Text style={styles.sectionTitle}>Recommended Style</Text>
        <View style={styles.styleCard}>
          <Text style={styles.styleIcon}>✨</Text>
          <Text style={styles.styleName}>{makeupData.makeupStyle || 'Custom Style'}</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.sectionTitle}>Application Instructions</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsIcon}>📝</Text>
          <Text style={styles.instructionsText}>
            {makeupData.instructions || 'Follow the recommended style for best results.'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.tryAgainButton}
          onPress={handleTryAgain}
        >
          <Text style={styles.tryAgainButtonText}>📷 Try Another Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {
            // TODO: Implement sharing functionality
            alert('Sharing feature coming soon! 📱');
          }}
        >
          <Text style={styles.shareButtonText}>📤 Share Results</Text>
        </TouchableOpacity>
      </View>

      {/* Real AI Analysis Debug Section (Development Only) */}
      {__DEV__ && (makeupData.backend === 'fly.io + ChatGPT' || makeupData.mediaPipeData) && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔬 AI Analysis Debug Info</Text>
          
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Face Detection:</Text>
            <Text style={styles.debugValue}>
              ✅ {makeupData.totalLandmarks || makeupData.mediaPipeData?.total_landmarks || 0}/468 landmarks detected
            </Text>
            
            {makeupData.facialAnalysis && (
              <>
                <Text style={styles.debugLabel}>Facial Analysis:</Text>
            <Text style={styles.debugValue}>
                  👤 Face Shape: {makeupData.facialAnalysis.face_structure?.face_shape || 'Unknown'}
            </Text>
            <Text style={styles.debugValue}>
                  👁️ Eye Shape: {makeupData.facialAnalysis.eye_shape?.shape || 'Unknown'}
            </Text>
            <Text style={styles.debugValue}>
                  💋 Lip Shape: {makeupData.facialAnalysis.lip_shape?.shape || 'Unknown'}
            </Text>
              </>
            )}
            
            <Text style={styles.debugLabel}>AI Enhancement:</Text>
            {makeupData.enhancedPrompt && (
            <Text style={styles.debugValue}>
                🤖 ChatGPT Enhanced: ✅
            </Text>
            )}
            <Text style={styles.debugValue}>
              🎯 Confidence: {makeupData.confidence || 0}%
            </Text>
            
            {makeupData.backend && (
              <>
                <Text style={styles.debugLabel}>Backend:</Text>
                <Text style={[styles.debugValue, { fontWeight: 'bold', color: '#4CAF50' }]}>
                  🖥️ {makeupData.backend}
                </Text>
              </>
            )}
            
            {makeupData.processingTime && (
              <Text style={styles.debugValue}>
                ⏱️ Processed at: {new Date(makeupData.processingTime).toLocaleTimeString()}
              </Text>
            )}
            
            <Text style={styles.debugLabel}>Data Source:</Text>
            <Text style={[styles.debugValue, { fontWeight: 'bold', color: '#4CAF50' }]}>
              {makeupData.backend === 'fly.io + ChatGPT' ? '🎯 Real AI Analysis (MediaPipe + ChatGPT)' : 
               makeupData.mediaPipeData ? '🎯 Real MediaPipe Data (Not Mock)' : '⚠️ Mock Data'}
            </Text>
          </View>
        </View>
      )}

      {/* Mock Data Warning */}
      {__DEV__ && !makeupData.backend && !makeupData.mediaPipeData && (
        <View style={styles.warningSection}>
          <Text style={styles.warningTitle}>⚠️ Development Notice</Text>
          <Text style={styles.warningText}>
            You're seeing mock data. MediaPipe may not be working properly or you're using the SimpleFaceCamera fallback.
          </Text>
          <Text style={styles.warningSubtext}>
            Check the camera component and MediaPipe integration.
          </Text>
        </View>
      )}
      
      {/* Success Indicator for Real Analysis */}
      {__DEV__ && makeupData.backend === 'fly.io + ChatGPT' && (
        <View style={styles.successSection}>
          <Text style={styles.successTitle}>🎉 Real AI Analysis Complete!</Text>
          <Text style={styles.successText}>
            This result was generated using real MediaPipe facial analysis and ChatGPT enhancement.
          </Text>
          <Text style={styles.successSubtext}>
            • {makeupData.totalLandmarks} facial landmarks detected
            • Face shape analysis: {makeupData.facialAnalysis?.face_structure?.face_shape || 'N/A'}
            • AI-enhanced makeup recommendations
          </Text>
        </View>
      )}

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Always start with a clean, moisturized face</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Use primer to help makeup last longer</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Blend well for a natural, seamless look</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Practice makes perfect - don't give up!</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 10,
  },
  confidenceContainer: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confidenceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  imageSection: {
    marginBottom: 25,
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FF6B9D',
  },
  styleSection: {
    marginBottom: 25,
  },
  styleCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  styleIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  styleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  instructionsSection: {
    marginBottom: 25,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsIcon: {
    fontSize: 20,
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },

  actionSection: {
    marginBottom: 25,
  },
  tryAgainButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // New styles for safety checks
  errorText: {
    fontSize: 18,
    color: '#FF6B9D',
    textAlign: 'center',
    marginBottom: 20,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: '#ccc',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#999',
  },

  // MediaPipe Status Styles
  mediaPipeStatus: {
    marginTop: 10,
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  mediaPipeStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  landmarkCount: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
  },
  backendInfo: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: 'bold',
  },
  // Debug Section Styles
  debugSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 15,
  },
  debugCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  debugValue: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
    paddingLeft: 10,
  },
  // Warning Section Styles
  warningSection: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
  },
  successSection: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#A5D6A7',
    lineHeight: 18,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 12,
    color: '#81C784',
    lineHeight: 16,
  },
  // New styles for image grid and processing info
  imageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  imageContainer: {
    width: '48%', // Adjust as needed for 2 columns
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    padding: 10,
    backgroundColor: '#FF6B9D',
    color: '#fff',
    textAlign: 'center',
  },
  gridImage: {
    width: '100%',
    height: 200, // Adjust height as needed
  },
  processingInfo: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
  },
  processingInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  processingInfoSubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default ResultScreen; 