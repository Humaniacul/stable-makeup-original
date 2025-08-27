import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'react-native-vision-camera';

const SimpleCameraDebug = () => {
  const [debugInfo, setDebugInfo] = useState('Testing...');
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  const runDebugTest = async () => {
    setDebugInfo('🔍 Starting camera permission debug...\n');
    let info = '🔍 Starting camera permission debug...\n';

    try {
      // Test 1: Check current permission status
      info += '\n📱 Test 1: Checking current permission status...\n';
      const currentStatus = await Camera.getCameraPermissionStatus();
      info += `   Result: ${currentStatus}\n`;
      setPermissionStatus(currentStatus);

      // Test 2: Check if camera device is available
      info += '\n📷 Test 2: Checking camera device availability...\n';
      const devices = await Camera.getAvailableCameraDevices();
      info += `   Available devices: ${devices.length}\n`;
      if (devices.length > 0) {
        const frontCamera = devices.find(device => device.position === 'front');
        info += `   Front camera: ${frontCamera ? 'Available' : 'Not found'}\n`;
      }

      // Test 3: Request permission if needed
      if (currentStatus !== 'granted') {
        info += '\n🔐 Test 3: Requesting camera permission...\n';
        const requestResult = await Camera.requestCameraPermission();
        info += `   Request result: ${requestResult}\n`;
        setPermissionStatus(requestResult);
      }

      // Test 4: Final status check
      info += '\n✅ Test 4: Final permission check...\n';
      const finalStatus = await Camera.getCameraPermissionStatus();
      info += `   Final status: ${finalStatus}\n`;
      setPermissionStatus(finalStatus);

      // Test 5: Check if we can create a camera component
      info += '\n🎥 Test 5: Camera component test...\n';
      if (finalStatus === 'granted') {
        info += '   ✅ Permission granted - Camera should work\n';
      } else {
        info += `   ❌ Permission ${finalStatus} - Camera won't work\n`;
      }

    } catch (error) {
      info += `\n❌ Error during testing: ${error.message}\n`;
      info += `   Error type: ${error.name}\n`;
      console.error('Camera debug error:', error);
    }

    setDebugInfo(info);
  };

  useEffect(() => {
    runDebugTest();
  }, []);

  const retryTest = () => {
    setDebugInfo('Retrying...');
    runDebugTest();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Simple Camera Debug</Text>
      <Text style={styles.status}>Status: {permissionStatus}</Text>
      
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>{debugInfo}</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={retryTest}>
        <Text style={styles.buttonText}>🔄 Retry Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.testButton]} 
        onPress={() => {
          if (permissionStatus === 'granted') {
            Alert.alert('✅ Success', 'Camera permission is granted! The issue might be elsewhere.');
          } else {
            Alert.alert('❌ Issue Found', `Camera permission is: ${permissionStatus}`);
          }
        }}
      >
        <Text style={styles.buttonText}>📊 Show Result</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#4d4d4d',
  },
  title: {
    color: '#FF6B9D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  debugContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 200,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SimpleCameraDebug; 