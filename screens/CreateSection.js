import React, { useState } from 'react';
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

export default function CreateSection({ route, navigation }) {
  const { restaurantId, outlet_id, outlet_code, owner_id, section_id } = route.params;
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataString = await AsyncStorage.getItem('userData');

      if (!deviceToken) {
        Alert.alert('Error', 'Device token not found');
        return;
      }

      if (!userDataString) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      const userData = JSON.parse(userDataString);
      const userId = userData.user_id;

      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      if (!sectionName.trim()) {
        setError('Please enter section name');
        return;
      }

      setLoading(true);

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/section_create`,
        data: {
          section_name: sectionName.trim(),
          outlet_id: parseInt(restaurantId),
          device_token: deviceToken,
          user_id: userId
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Create section response:', response.data);

      if (response.data.st === 1) {
        Alert.alert(
          'Success',
          'Section created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(response.data.Msg || 'Failed to create section');
      }
    } catch (err) {
      console.error('Error creating section:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      // Check for 401 unauthorized
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      Alert.alert('Error', err.response?.data?.Msg || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Create Section" showBack={true} showMenu={true} />
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
            autoFocus
            maxLength={50}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity 
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Section</Text>
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
  form: {
    padding: 20,
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
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
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
  submitButton: {
    backgroundColor: '#67B279',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6b0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 