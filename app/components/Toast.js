import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  Dimensions, 
  StyleSheet,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const Toast = ({ 
  visible, 
  message, 
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  onHide 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: 'checkmark-circle',
          iconColor: '#ffffff'
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          icon: 'close-circle',
          iconColor: '#ffffff'
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          icon: 'warning',
          iconColor: '#ffffff'
        };
      case 'info':
        return {
          backgroundColor: '#3B82F6',
          icon: 'information-circle',
          iconColor: '#ffffff'
        };
      default:
        return {
          backgroundColor: '#10B981',
          icon: 'checkmark-circle',
          iconColor: '#ffffff'
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
        onPress={hideToast}
        activeOpacity={0.9}
      >
        <View style={styles.content}>
          <Ionicons 
            name={config.icon} 
            size={24} 
            color={config.iconColor} 
            style={styles.icon}
          />
          <Text style={styles.message}>{message}</Text>
        </View>
        
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={config.iconColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 999,
  },
  toast: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default Toast; 