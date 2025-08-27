import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      visible: true
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration + animation time
    setTimeout(() => {
      removeToast(id);
    }, duration + 500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const hideToast = (id) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, visible: false } : toast
      )
    );
    
    // Remove from array after animation
    setTimeout(() => {
      removeToast(id);
    }, 300);
  };

  // Convenience methods
  const showSuccess = (message, duration) => showToast(message, 'success', duration);
  const showError = (message, duration) => showToast(message, 'error', duration);
  const showWarning = (message, duration) => showToast(message, 'warning', duration);
  const showInfo = (message, duration) => showToast(message, 'info', duration);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Render all toasts */}
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onHide={() => hideToast(toast.id)}
          style={{ top: (Platform.OS === 'ios' ? 50 : 30) + (index * 80) }} // Stack toasts
        />
      ))}
    </ToastContext.Provider>
  );
}; 