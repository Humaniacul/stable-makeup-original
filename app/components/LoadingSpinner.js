import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

/**
 * LoadingSpinner Component
 * A reusable loading indicator with optional text
 */
const LoadingSpinner = ({ 
  size = 'large', 
  color = '#FF6B9D', 
  text = 'Loading...', 
  showText = true 
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {showText && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoadingSpinner; 