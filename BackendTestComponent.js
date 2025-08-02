import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { generateMakeup } from './app/services/stableDiffusionService';

export default function BackendTestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  const testBackendConnection = async () => {
    try {
      setIsLoading(true);
      setTestResult('Testing backend connection...');
      
      const response = await fetch('https://beautify-ai-backend.fly.dev/');
      const data = await response.json();
      
      setTestResult(`Backend connection successful! Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setTestResult(`Backend connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMakeupGeneration = async () => {
    try {
      setIsLoading(true);
      setTestResult('Testing makeup generation...');
      
      const testPrompt = "Apply red lipstick and winged eyeliner";
      const testImageData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
      
      const result = await generateMakeup(testImageData, testPrompt);
      
      setTestResult(`Makeup generation successful! Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setTestResult(`Makeup generation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Backend Connection Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Test Backend Connection"
          onPress={testBackendConnection}
          disabled={isLoading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Test Makeup Generation"
          onPress={testMakeupGeneration}
          disabled={isLoading}
        />
      </View>
      
      {isLoading && (
        <Text style={styles.loadingText}>Loading...</Text>
      )}
      
      {testResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Test Result:</Text>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'monospace',
  },
}); 