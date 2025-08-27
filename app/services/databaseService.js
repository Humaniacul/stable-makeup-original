import { supabase } from '../config/supabase';

/**
 * Database Service for Beautify AI App
 * Handles all Supabase database operations
 */

// ===== USER MANAGEMENT =====

/**
 * Create or update user profile
 */
export const createUserProfile = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          points: userData.points || 0,
          member_since: userData.member_since || new Date().toISOString(),
          preferences: userData.preferences || {},
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// ===== MAKEUP LOOKS MANAGEMENT =====

/**
 * Save a makeup transformation
 */
export const saveMakeupLook = async (lookData) => {
  try {
    const { data, error } = await supabase
      .from('makeup_looks')
      .insert([
        {
          user_id: lookData.user_id,
          original_image_url: lookData.original_image_url,
          transformed_image_url: lookData.transformed_image_url,
          makeup_style: lookData.makeup_style,
          products_used: lookData.products_used || [],
          ai_confidence: lookData.ai_confidence,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving makeup look:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's makeup history
 */
export const getUserMakeupHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('makeup_looks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching makeup history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a makeup look
 */
export const deleteMakeupLook = async (lookId) => {
  try {
    const { error } = await supabase
      .from('makeup_looks')
      .delete()
      .eq('id', lookId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting makeup look:', error);
    return { success: false, error: error.message };
  }
};

// ===== FAVORITES MANAGEMENT =====

/**
 * Add item to favorites
 */
export const addToFavorites = async (favoriteData) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: favoriteData.user_id,
          item_type: favoriteData.item_type, // 'makeup_look' or 'product'
          item_id: favoriteData.item_id,
          item_data: favoriteData.item_data,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's favorites
 */
export const getUserFavorites = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove from favorites
 */
export const removeFromFavorites = async (favoriteId) => {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

// ===== POINTS MANAGEMENT =====

/**
 * Add points to user account
 */
export const addPoints = async (userId, points, reason) => {
  try {
    // First, get current points
    const userResult = await getUserProfile(userId);
    if (!userResult.success) throw new Error('User not found');

    const currentPoints = userResult.data.points || 0;
    const newPoints = currentPoints + points;

    // Update user points
    const updateResult = await updateUserProfile(userId, { points: newPoints });
    if (!updateResult.success) throw new Error('Failed to update points');

    // Record points transaction
    const { data, error } = await supabase
      .from('points_history')
      .insert([
        {
          user_id: userId,
          points_added: points,
          reason: reason,
          total_points_after: newPoints,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: { newTotal: newPoints, transaction: data[0] } };
  } catch (error) {
    console.error('Error adding points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's points history
 */
export const getPointsHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching points history:', error);
    return { success: false, error: error.message };
  }
};

// ===== AUTHENTICATION HELPERS =====

/**
 * Sign up with email and password
 */
export const signUp = async (email, password, userData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user session
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { success: true, data: user };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error: error.message };
  }
};

// ===== REAL-TIME SUBSCRIPTIONS =====

/**
 * Subscribe to user profile changes
 */
export const subscribeToUserProfile = (userId, callback) => {
  return supabase
    .channel('user-profile-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users',
      filter: `id=eq.${userId}`
    }, callback)
    .subscribe();
};

/**
 * Subscribe to makeup looks changes
 */
export const subscribeToMakeupLooks = (userId, callback) => {
  return supabase
    .channel('makeup-looks-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'makeup_looks',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}; 