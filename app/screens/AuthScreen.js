import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signIn, signUp, resendVerification, sendOTP } from '../services/authService';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const AuthScreen = ({ navigation }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  const { signIn: contextSignIn } = useUser();
  const { showSuccess, showError } = useToast();

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    if (!formData.email.trim()) {
      showError('Please enter your email');
      return false;
    }

    if (!formData.email.includes('@')) {
      showError('Please enter a valid email address');
      return false;
    }

    if (!formData.password) {
      showError('Please enter your password');
      return false;
    }

    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      return false;
    }

    if (isSignUp) {
      if (!formData.fullName.trim()) {
        showError('Please enter your full name');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        showError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  /**
   * Handle sign in
   */
  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        showSuccess('Welcome back! 🎉');
        // Context will handle the user state automatically
      } else {
        // Handle email not confirmed error specially
        if (result.code === 'email_not_confirmed') {
          setEmailToVerify(formData.email);
          setShowVerificationPrompt(true);
          Alert.alert(
            'Email Verification Required',
            result.error,
            [
              { 
                text: 'Enter Code', 
                onPress: () => {
                  navigation.navigate('Verification', {
                    email: formData.email,
                    userData: {}
                  });
                }
              },
              { text: 'Resend Email', onPress: handleResendVerification },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else {
          showError(result.error);
        }
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle sign up with email/password
   */
  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Use traditional email/password signup
      const result = await signUp(formData.email, formData.password, {
        full_name: formData.fullName
      });
      
      if (result.success) {
        if (result.needsVerification) {
          if (result.useOTP) {
            // Navigate to OTP verification screen
            Alert.alert(
              'Account Created Successfully!',
              result.message || 'Please check your email for a 6-digit verification code.',
              [
                { 
                  text: 'OK', 
                  onPress: () => {
                    navigation.navigate('Verification', {
                      email: formData.email,
                      userData: {
                        full_name: formData.fullName
                      }
                    });
                  }
                }
              ]
            );
          } else {
            // Email link verification
            setEmailToVerify(formData.email);
            Alert.alert(
              'Account Created Successfully!',
              result.message || 'Please check your email to verify your account before signing in.',
              [
                { text: 'Resend Email', onPress: handleResendVerification },
                { text: 'OK', onPress: () => setIsSignUp(false) }
              ]
            );
          }
        } else {
          Alert.alert(
            'Account Created Successfully!',
            result.message || 'You can now sign in with your credentials.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          );
        }
      } else {
        // Handle specific error cases
        if (result.error.includes('already registered')) {
          Alert.alert(
            'Account Already Exists',
            'An account with this email already exists. Please sign in instead.',
            [{ text: 'Sign In', onPress: () => setIsSignUp(false) }]
          );
        } else {
          showError(result.error);
        }
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle resend verification (both email link and OTP)
   */
  const handleResendVerification = async () => {
    if (!emailToVerify) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }

    Alert.alert(
      'Resend Verification',
      'How would you like to receive your verification?',
      [
        { 
          text: 'Email Code', 
          onPress: () => resendOTP() 
        },
        { 
          text: 'Email Link', 
          onPress: () => resendEmailLink() 
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ]
    );
  };

  /**
   * Resend OTP code
   */
  const resendOTP = async () => {
    setIsLoading(true);
    try {
      const result = await sendOTP(emailToVerify, 'signup');
      
      if (result.success) {
        Alert.alert(
          'Code Sent!', 
          'A new 6-digit verification code has been sent to your email.',
          [
            { 
              text: 'Enter Code', 
              onPress: () => {
                navigation.navigate('Verification', {
                  email: emailToVerify,
                  userData: {}
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend email link
   */
  const resendEmailLink = async () => {
    setIsLoading(true);
    try {
      const result = await resendVerification(emailToVerify);
      
      if (result.success) {
        Alert.alert('Email Sent!', result.message);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Join Beautify and discover your perfect makeup style'
                : 'Sign in to continue your beauty journey'
              }
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name (Sign Up Only) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#666"
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor="#666"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password (Sign Up Only) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#666"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Auth Mode */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    color: '#b0b0b0',
    fontSize: 14,
    marginRight: 4,
  },
  toggleLink: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuthScreen; 