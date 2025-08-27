import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const ImagePickerModal = ({ visible, onClose, onCamera, onGallery }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => onClose()}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurContainer}>
          <TouchableOpacity 
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => onClose()}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
              >
                <View style={styles.modal}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.title}>Change Profile Picture</Text>
                    <TouchableOpacity onPress={() => onClose()} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color="#b0b0b0" />
                    </TouchableOpacity>
                  </View>

                  {/* Options */}
                  <View style={styles.optionsContainer}>
                    <TouchableOpacity 
                      style={styles.option}
                      onPress={() => {
                        onCamera();
                        onClose();
                      }}
                    >
                      <View style={styles.optionIconContainer}>
                        <Ionicons name="camera" size={28} color="#FF6B9D" />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>Camera</Text>
                        <Text style={styles.optionSubtitle}>Take a new photo</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#b0b0b0" />
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity 
                      style={styles.option}
                      onPress={() => {
                        onGallery();
                        onClose();
                      }}
                    >
                      <View style={styles.optionIconContainer}>
                        <Ionicons name="images" size={28} color="#FF6B9D" />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>Gallery</Text>
                        <Text style={styles.optionSubtitle}>Choose from library</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#b0b0b0" />
                    </TouchableOpacity>
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => onClose()}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    width: width - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3d3d3d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  separator: {
    height: 1,
    backgroundColor: '#3d3d3d',
    marginLeft: 66,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#3d3d3d',
  },
  cancelText: {
    fontSize: 17,
    color: '#FF6B9D',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ImagePickerModal; 