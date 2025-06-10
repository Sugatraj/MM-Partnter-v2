import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Header from '../components/Header';

export default function BulkUploadScreen({ route, navigation }) {
  const { restaurantId } = route.params;
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], // for xlsx/xls files
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        setSelectedFile(result);
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement your file upload logic here
      console.log('Uploading file:', selectedFile);
      // After successful upload
      alert('File uploaded successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Bulk Upload" showBack={true} showMenu={true} />
      <View style={styles.content}>
        <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
          <FontAwesome name="file-excel-o" size={50} color="#67B279" />
          <Text style={styles.uploadText}>
            {selectedFile ? selectedFile.name : "Select Excel File"}
          </Text>
          {selectedFile && (
            <Text style={styles.fileInfo}>
              Size: {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            !selectedFile && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!selectedFile || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome
                name="upload"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Upload File</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBox: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: '#67B279',
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  fileInfo: {
    marginTop: 5,
    fontSize: 14,
    color: '#888',
  },
  uploadButton: {
    backgroundColor: '#67B279',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 