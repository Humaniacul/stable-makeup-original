import { supabase } from '../config/supabase';

/**
 * Authentication Service for Beautify AI App
 * Handles user registration, login, and session management
 */

/**
 * Sign up a new user with OTP verification
 */
export const signUp = async (email, password, userData = {}) => {
  try {
    console.log('🚀 Attempting to sign up user:', email);
    
    // First, create the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name || '',
          avatar_url: userData.avatar_url || null,
        }
      }
    });

    if (error) {
      console.error('❌ Sign up error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
      }
      
      throw error;
    }

    console.log('✅ Sign up successful:', data.user?.id);

    // Check if email confirmation is enabled
    if (!data.session) {
      // Email confirmation is enabled, send OTP code
      console.log('📧 Sending verification code...');
      const otpResult = await sendOTP(email, 'signup');
      
      if (!otpResult.success) {
        console.warn('⚠️ Failed to send OTP, but user account created');
      }
      
      return { 
        success: true, 
        data: data.user,
        needsVerification: true,
        useOTP: true, // Indicates to use OTP verification screen
        message: 'Account created! Please check your email for a 6-digit verification code.'
      };
    } else {
      // Email confirmation is disabled, user can sign in immediately
      await ensureUserProfile(data.user);
      return { 
        success: true, 
        data: data.user,
        needsVerification: false,
        message: 'Account created successfully! You can now sign in.'
      };
    }
  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.message.includes('already registered')) {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
    } else if (error.message.includes('invalid email')) {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.message.includes('password')) {
      errorMessage = 'Password must be at least 6 characters long.';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (email, password) => {
  try {
    console.log('🔑 Attempting to sign in user:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }

    console.log('✅ Sign in successful:', data.user?.id);
    
    // Create user profile if it doesn't exist (for verified users)
    await ensureUserProfile(data.user);
    
    return { success: true, data: data.user };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please verify your email address first. Check your email for a verification link, or request a new one below.';
    } else if (error.message.includes('Too many requests')) {
      errorMessage = 'Too many login attempts. Please wait a moment and try again.';
    }
    
    return { success: false, error: errorMessage, code: error.code };
  }
};

/**
 * Resend email verification
 */
export const resendVerification = async (email) => {
  try {
    console.log('📧 Resending verification email to:', email);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: 'beautify://welcome'
      }
    });

    if (error) {
      console.error('❌ Resend verification error:', error);
      throw error;
    }

    console.log('✅ Verification email sent successfully');
    return { 
      success: true, 
      message: 'Verification email sent! Please check your email and click the verification link.' 
    };
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    return { 
      success: false, 
      error: 'Failed to send verification email. Please try again.' 
    };
  }
};

/**
 * Check if user email is verified
 */
export const checkEmailVerification = async (email) => {
  try {
    // This is a workaround since we can't directly check email verification status
    // We'll try to sign in with a dummy password to see the error
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy_password_for_check'
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return { verified: false, needsVerification: true };
      } else if (error.message.includes('Invalid login credentials')) {
        return { verified: true, needsVerification: false };
      }
    }

    return { verified: false, needsVerification: true };
  } catch (error) {
    return { verified: false, needsVerification: true };
  }
};

/**
 * Ensure user profile exists in database
 */
const ensureUserProfile = async (user) => {
  try {
    console.log('👤 Checking user profile for:', user.id);
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user profile:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingProfile) {
      console.log('✅ User profile already exists');
      return { success: true, data: existingProfile };
    }

    // Create new profile
    console.log('➕ Creating new user profile...');
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
          points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user profile:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ User profile created successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error ensuring user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user session
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    return { success: true, data: user };
  } catch (error) {
    console.error('Get current user error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    return { success: true, data: session };
  } catch (error) {
    console.error('Get session error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'beautify://reset-password',
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP (verification code) to email
 */
export const sendOTP = async (email, type = 'signup') => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: type === 'signup',
      }
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Send OTP error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify OTP (verification code)
 */
export const verifyOTP = async (email, token, type = 'email') => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) throw error;

    // Ensure user profile exists after verification
    if (data.user) {
      await ensureUserProfile(data.user);
    }

    return { success: true, data: data.user, session: data.session };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign up a new user with OTP verification
 */
export const signUpWithOTP = async (email, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'temp_password_for_otp', // Required but not used for OTP flow
      options: {
        data: {
          full_name: userData.full_name || '',
          avatar_url: userData.avatar_url || null,
        }
      }
    });

    if (error) throw error;

    // Send OTP after signup
    const otpResult = await sendOTP(email, 'signup');
    
    if (!otpResult.success) {
      throw new Error('Failed to send verification code');
    }

    return { 
      success: true, 
      data: data.user,
      needsVerification: true
    };
  } catch (error) {
    console.error('Sign up with OTP error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resend OTP code
 */
export const resendOTP = async (email) => {
  try {
    const result = await sendOTP(email, 'recovery');
    return result;
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates) => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const sessionResult = await getCurrentSession();
  return sessionResult.success && sessionResult.data !== null;
}; 