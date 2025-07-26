import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImageFromGallery, takePhotoWithCamera, updateProfilePicture } from '../services/imageService-simple';
import { updateUserProfile } from '../services/databaseService';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import ImagePickerModal from '../components/ImagePickerModal';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, updateProfilePicture: updateContextProfilePicture, signOut } = useUser();
  const { showSuccess, showError, showWarning } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Handle profile picture change
  const handleImagePickerOptions = () => {
    setShowImagePicker(true);
  };

  const handlePickFromGallery = async () => {
    try {
      setIsUploadingImage(true);
      const result = await pickImageFromGallery();
      
      if (result.success) {
        await uploadAndUpdateProfile(result.data.uri);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to pick image from gallery');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploadingImage(true);
      const result = await takePhotoWithCamera();
      
      if (result.success) {
        await uploadAndUpdateProfile(result.data.uri);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to take photo');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadAndUpdateProfile = async (imageUri) => {
    try {
      console.log('🚀 Starting profile picture upload process...');
      console.log('Image URI:', imageUri);
      console.log('User ID:', user.id);
      
      // Upload image to Supabase Storage
      const uploadResult = await updateProfilePicture(
        imageUri, 
        user.id, 
        null // No current image path needed for new uploads
      );

      console.log('Upload result:', uploadResult);

      if (uploadResult.success) {
        // Update user profile in database
        const updateResult = await updateUserProfile(user.id, {
          avatar_url: uploadResult.data.url
        });

        console.log('Database update result:', updateResult);

        if (updateResult.success) {
          // Update context state
          updateContextProfilePicture(uploadResult.data.url);
          
          showSuccess('Profile picture updated successfully! 🎉');
        } else {
          console.error('Database update failed:', updateResult.error);
          showError(`Failed to update profile in database: ${updateResult.error}`);
        }
      } else {
        console.error('Upload failed:', uploadResult.error);
        showError(uploadResult.error);
      }
    } catch (error) {
      console.error('Upload process error:', error);
      showError(`Failed to upload profile picture: ${error.message}`);
    }
  };



  const ProfileOption = ({ icon, title, subtitle, onPress, rightComponent, showArrow = true }) => (
    <TouchableOpacity style={styles.optionItem} onPress={onPress}>
      <View style={styles.optionLeft}>
        <View style={styles.optionIcon}>
          <Ionicons name={icon} size={22} color="#FF6B9D" />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.optionRight}>
        {rightComponent}
        {showArrow && !rightComponent && (
          <Ionicons name="chevron-forward" size={20} color="#b0b0b0" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handleImagePickerOptions}
            disabled={isUploadingImage}
          >
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.defaultProfileLarge}>
                <Ionicons name="person" size={50} color="#FF6B9D" />
              </View>
            )}
            <View style={styles.cameraButton}>
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{user.full_name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <Text style={styles.memberSince}>Member since January 2024</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>23</Text>
            <Text style={styles.statLabel}>Makeup Looks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1,240</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <ProfileOption
              icon="person-outline"
              title="Personal Information"
              subtitle="Update your details"
              onPress={() => {}}
            />
            <ProfileOption
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage cards and billing"
              onPress={() => {}}
            />
            <ProfileOption
              icon="location-outline"
              title="Addresses"
              subtitle="Shipping and billing addresses"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <ProfileOption
              icon="notifications-outline"
              title="Notifications"
              subtitle="Push notifications, emails"
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#4d4d4d', true: '#FF6B9D' }}
                  thumbColor={notificationsEnabled ? '#fff' : '#b0b0b0'}
                />
              }
              showArrow={false}
            />
            <ProfileOption
              icon="moon-outline"
              title="Dark Mode"
              subtitle="App appearance"
              rightComponent={
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: '#4d4d4d', true: '#FF6B9D' }}
                  thumbColor={darkModeEnabled ? '#fff' : '#b0b0b0'}
                />
              }
              showArrow={false}
            />
            <ProfileOption
              icon="location"
              title="Location Services"
              subtitle="For better recommendations"
              rightComponent={
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: '#4d4d4d', true: '#FF6B9D' }}
                  thumbColor={locationEnabled ? '#fff' : '#b0b0b0'}
                />
              }
              showArrow={false}
            />
          </View>
        </View>

        {/* AI & Beauty Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI & Beauty</Text>
          <View style={styles.sectionContent}>
            <ProfileOption
              icon="eye-outline"
              title="Makeup History"
              subtitle="View all your AI transformations"
              onPress={() => {}}
            />
            <ProfileOption
              icon="color-palette-outline"
              title="Beauty Preferences"
              subtitle="Set your style preferences"
              onPress={() => {}}
            />
            <ProfileOption
              icon="star-outline"
              title="Rate Our App"
              subtitle="Help us improve"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <ProfileOption
              icon="help-circle-outline"
              title="Help Center"
              subtitle="FAQs and tutorials"
              onPress={() => {}}
            />
            <ProfileOption
              icon="chatbubble-outline"
              title="Contact Support"
              subtitle="Get help from our team"
              onPress={() => {}}
            />
            <ProfileOption
              icon="document-text-outline"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => {}}
            />
          </View>
        </View>



        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B9D" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Beautify v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onCamera={handleTakePhoto}
        onGallery={handlePickFromGallery}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4d4d4d',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#2d2d2d',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF6B9D',
  },
  defaultProfileLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF6B9D',
    backgroundColor: '#3d3d3d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2d2d2d',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#b0b0b0',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#808080',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#3d3d3d',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#4d4d4d',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#4d4d4d',
    marginVertical: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#3d3d3d',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4d4d4d',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4d4d4d',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4d4d4d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3d3d3d',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
    marginLeft: 8,
  },
  versionSection: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#808080',
  },
});

export default ProfileScreen; 