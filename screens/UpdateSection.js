import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UpdateSection({ route, navigation }) {
  const { sectionId, restaurantId } = route.params;
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Handle unauthorized access (401)
  const handleUnauthorized = async () => {
    try {
      // Clear all auth-related data from storage
      await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
      
      // Reset navigation stack to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    loadSectionData();
  }, []);

  const loadSectionData = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataStr);
      
      setLoading(true);
      console.log('Loading section data:', { sectionId, restaurantId });

      const response = await axios({
        method: 'POST',
        url: `${COMMON_BASE_URL}/section_view`,
        data: {
          outlet_id: restaurantId,
          section_id: parseInt(sectionId),
          device_token:deviceToken,
          user_id: userData.user_id
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });

      console.log('Section View API Response:', response.data);

      if (response.data.st === 1) {
        setSectionName(response.data.data.section_name);
      } else {
        throw new Error(response.data.Msg || 'Invalid section data received');
      }
    } catch (error) {
      console.error('Error loading section:', {
        message: error.message,
        response: error.response?.data
      });

      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      Alert.alert('Error', 'Failed to load section details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataStr);
      if (!sectionName.trim()) {
        Alert.alert('Error', 'Please enter section name');
        return;
      }

      setUpdating(true);
      console.log('Updating section:', {
        outlet_id: restaurantId,
        section_id: sectionId,
        section_name: sectionName.trim(),
        device_token:deviceToken,
        user_id: userData.user_id
      });

      const response = await axios({
        method: 'POST',
        url: `${COMMON_BASE_URL}/section_update`,
        data: {
          outlet_id: parseInt(restaurantId),
          section_id: parseInt(sectionId),
          section_name: sectionName.trim(),
          device_token:deviceToken,
          user_id: userData.user_id
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });

      console.log('Section Update API Response:', response.data);

      if (response.data.st === 1) {
        Alert.alert(
          'Success',
          response.data.msg || 'Section updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('SectionDetails', {
                  sectionId,
                  restaurantId,
                  refresh: true
                });
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.msg || 'Failed to update section');
      }
    } catch (error) {
      console.error('Error updating section:', {
        message: error.message,
        response: error.response?.data
      });

      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      Alert.alert('Error', error.response?.data?.msg || 'Failed to update section');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Update Section" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Update Section" showBack={true} showMenu={true} />
      <View style={styles.form}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}> <Text style={styles.required}>* </Text>Section Name</Text>
          
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              error ? styles.inputError : null
            ]}
            value={sectionName}
            onChangeText={(text) => {
              setSectionName(text);
              if (!text.trim()) {
                setError('Please enter section name');
              } else {
                setError('');
              }
            }}
            placeholder="Enter section name"
            maxLength={50}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity 
          style={[
            styles.updateButton,
            updating && styles.updateButtonDisabled
          ]}
          onPress={handleUpdate}
          disabled={updating || !!error}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Update Section</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  required: {
    color: '#DC3545',
    marginLeft: 4,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  updateButton: {
    backgroundColor: '#67B279',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#a5d6b0',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 