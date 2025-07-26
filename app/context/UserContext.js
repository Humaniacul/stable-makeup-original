import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/databaseService';
import { getCurrentUser, getCurrentSession, onAuthStateChange, signOut as authSignOut } from '../services/authService';

/**
 * User Context for Beautify AI App
 * Manages user authentication state and profile data with optimized session caching
 */

const UserContext = createContext({});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState(null);

  // Cache keys for AsyncStorage
  const CACHE_KEYS = {
    USER_SESSION: 'beautify_user_session',
    USER_PROFILE: 'beautify_user_profile',
    LAST_AUTH_CHECK: 'beautify_last_auth_check'
  };

  // Initialize authentication state with caching
  useEffect(() => {
    initializeAuthWithCache();
    
    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
        await cacheSession(session);
        setIsAuthenticated(true);
      } else {
        await clearAuthCache();
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Initialize authentication with caching for faster startup
   */
  const initializeAuthWithCache = async () => {
    try {
      console.log('🚀 Initializing auth with cache optimization...');
      
      // Check if we have a recent cached session (within last 5 minutes)
      const lastAuthCheck = await AsyncStorage.getItem(CACHE_KEYS.LAST_AUTH_CHECK);
      const cachedSession = await AsyncStorage.getItem(CACHE_KEYS.USER_SESSION);
      const cachedProfile = await AsyncStorage.getItem(CACHE_KEYS.USER_PROFILE);
      
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      // If we have a recent cache, use it immediately for faster startup
      if (lastAuthCheck && cachedSession && cachedProfile && 
          parseInt(lastAuthCheck) > fiveMinutesAgo) {
        console.log('⚡ Using cached session for instant login');
        
        try {
          const parsedSession = JSON.parse(cachedSession);
          const parsedProfile = JSON.parse(cachedProfile);
          
          setSession(parsedSession);
          setUser(parsedProfile);
          setIsAuthenticated(true);
          setIsLoading(false);
          
          // Verify session in background and update if needed
          verifySessionInBackground();
          return;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse cached data, falling back to fresh auth');
          await clearAuthCache();
        }
      }
      
      // No valid cache, do fresh authentication check
      console.log('🔍 No valid cache, checking fresh session...');
      await initializeFreshAuth();
      
    } catch (error) {
      console.error('❌ Error initializing auth with cache:', error);
      await initializeFreshAuth();
    }
  };

  /**
   * Initialize fresh authentication (fallback)
   */
  const initializeFreshAuth = async () => {
    try {
      const sessionResult = await getCurrentSession();
      if (sessionResult.success && sessionResult.data) {
        setSession(sessionResult.data);
        await loadUserProfile(sessionResult.data.user.id);
        await cacheSession(sessionResult.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('❌ Error initializing fresh auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify cached session in background
   */
  const verifySessionInBackground = async () => {
    try {
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success || !sessionResult.data) {
        // Session is invalid, clear cache and sign out
        console.log('🔒 Cached session invalid, signing out');
        await signOut();
      } else {
        // Update cache timestamp
        await AsyncStorage.setItem(CACHE_KEYS.LAST_AUTH_CHECK, Date.now().toString());
      }
    } catch (error) {
      console.warn('⚠️ Background session verification failed:', error);
    }
  };

  /**
   * Cache session for faster future startups
   */
  const cacheSession = async (sessionData) => {
    try {
      await AsyncStorage.multiSet([
        [CACHE_KEYS.USER_SESSION, JSON.stringify(sessionData)],
        [CACHE_KEYS.LAST_AUTH_CHECK, Date.now().toString()]
      ]);
      console.log('💾 Session cached successfully');
    } catch (error) {
      console.warn('⚠️ Failed to cache session:', error);
    }
  };

  /**
   * Cache user profile
   */
  const cacheUserProfile = async (profileData) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profileData));
      console.log('💾 User profile cached');
    } catch (error) {
      console.warn('⚠️ Failed to cache user profile:', error);
    }
  };

  /**
   * Clear authentication cache
   */
  const clearAuthCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.USER_SESSION,
        CACHE_KEYS.USER_PROFILE,
        CACHE_KEYS.LAST_AUTH_CHECK
      ]);
      console.log('🗑️ Auth cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear auth cache:', error);
    }
  };

  /**
   * Load user profile from database with caching
   */
  const loadUserProfile = async (userId) => {
    try {
      const result = await getUserProfile(userId);
      if (result.success) {
        setUser(result.data);
        await cacheUserProfile(result.data);
      } else {
        // If profile doesn't exist, create it from auth user
        const userResult = await getCurrentUser();
        if (userResult.success && userResult.data) {
          const authUser = userResult.data;
          const newProfile = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || 'User',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            points: 0,
            created_at: authUser.created_at,
            updated_at: new Date().toISOString(),
          };
          setUser(newProfile);
          await cacheUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  /**
   * Update user profile data
   */
  const updateUser = async (updates) => {
    const updatedUser = {
      ...user,
      ...updates
    };
    setUser(updatedUser);
    await cacheUserProfile(updatedUser);
  };

  /**
   * Refresh user profile from database
   */
  const refreshUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      await loadUserProfile(user.id);
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update profile picture
   */
  const updateProfilePicture = async (avatarUrl) => {
    await updateUser({
      avatar_url: avatarUrl
    });
  };

  /**
   * Sign out user and clear cache
   */
  const signOut = async () => {
    try {
      console.log('👋 Signing out and clearing cache...');
      await authSignOut();
      await clearAuthCache();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  /**
   * Sign in user (called after successful authentication)
   */
  const signIn = async (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    await cacheUserProfile(userData);
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    updateUser,
    refreshUserProfile,
    updateProfilePicture,
    signOut,
    signIn,
    loadUserProfile,
    clearAuthCache // Expose for debugging
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 