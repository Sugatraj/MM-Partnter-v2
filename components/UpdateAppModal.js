import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_VERSION } from '../apiConfig';

const UpdateAppModal = ({ visible, onClose, websiteUrl }) => {
  const handleUpdate = async () => {
    // Open website in browser for APK download
    if (websiteUrl) {
      try {
        await Linking.openURL(websiteUrl);
      } catch (error) {
        console.error('Error opening website:', error);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Ionicons name="arrow-up-circle" size={48} color="#67B279" />
            <Text style={styles.title}>Update Available!</Text>
          </View>
          
          <Text style={styles.message}>
            A new version of MenuMitra Partner App is available. Update now to get the latest features, improvements, and bug fixes.
          </Text>

          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Current version: {APP_VERSION}</Text>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What's new:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#67B279" />
              <Text style={styles.featureText}>Performance improvements</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#67B279" />
              <Text style={styles.featureText}>Bug fixes and stability</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#67B279" />
              <Text style={styles.featureText}>Enhanced user experience</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Ionicons name="cloud-download" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.laterButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.laterButtonText]}>Remind Me Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  versionInfo: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: 14,
    width: '100%',
  },
  buttonIcon: {
    marginRight: 8,
  },
  updateButton: {
    backgroundColor: '#67B279',
  },
  laterButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#67B279',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  laterButtonText: {
    color: '#67B279',
  },
});

export default UpdateAppModal; 