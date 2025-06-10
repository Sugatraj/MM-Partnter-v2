import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
} from 'react-native';
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import axios from 'axios';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import SocialFooter from '../components/SocialFooter';

export default function LoginScreen({ navigation }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const handleMobileNumberChange = (text) => {
    const formattedNumber = text.replace(/[^0-9]/g, '').slice(0, 10);
    

    // Check if the first digit is between 1 and 5
    if (formattedNumber.length > 0) {
      const firstDigit = parseInt(formattedNumber[0]);
      if (firstDigit >= 0 && firstDigit <= 5) {
        // Alert.alert('Invalid Number', 'Mobile number must start with digits 6,7,8 or 9');
        setValidationMessage('Mobile number must start with digits 6,7,8 or 9');
        return;
      }
    }
    
    // Add validation for length
    if (formattedNumber.length > 0 && formattedNumber.length < 10) {
      setValidationMessage('Please enter a valid 10-digit mobile number');
    } else {
      setValidationMessage('');
    }
    
    setMobileNumber(formattedNumber);
  };

  const handleSendOTP = async () => {
    // Input validation
    if (mobileNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.post(
        `${COMMON_BASE_URL}/user_login`,
        {
          mobile: mobileNumber,
          role: "partner",
        }
      );

      console.log('API Response:', response.data); // Debug log

      if (response.data.st === 1) {
        // Check if the user has partner role
        if (response.data.role === "partner") {
          navigation.navigate("VerifyOTP", { 
            mobile: mobileNumber,
            message: response.data.msg // This contains the OTP
          });
        } else {
          // User exists but doesn't have partner role
          Alert.alert("Access Denied", "This mobile number is not registered as a partner.");
        }
      } else if (response.data.msg && response.data.msg.toLowerCase().includes("not registered")) {
        // User doesn't exist
        Alert.alert("Access Denied", "This mobile number is not registered in our system. Please contact support to register as a partner.");
      } else {
        Alert.alert("Error", response.data.msg || "Login failed");
      }
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle network or server errors
      if (error.response) {
        // Server responded with error status
        Alert.alert('Error', error.response.data?.msg || 'Server error occurred');
      } else if (error.request) {
        // Request made but no response received
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        // Other errors
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.keyboardAvoidingView, { backgroundColor: '#fff' }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContent}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/menumitra-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.title}>MenuMitra</Text>
                <Text style={styles.subtitle}>Partner Login</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.phoneInput,
                  validationMessage ? styles.phoneInputError : null,
                ]}
              >
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.input}
                  value={mobileNumber}
                  onChangeText={handleMobileNumberChange}
                  placeholder="Enter Mobile Number"
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!loading}
                />
              </View>

              <View style={styles.validationContainer}>
                <Text style={styles.validationMessage}>
                  {validationMessage || " "}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  mobileNumber.length === 10 && styles.buttonActive,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSendOTP}
                disabled={loading || mobileNumber.length !== 10}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <SocialFooter version="1.0.0" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 180 : 140, // Adjusted padding
  },
  mainContent: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  validationContainer: {
    height: 20,
    marginTop: -15,
    marginBottom: 5,
    width: "100%",
    paddingHorizontal: 15,
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#67B279",
    borderRadius: 8,
    marginBottom: 20,
    height: 50,
    width: "100%",
  },
  phoneInputError: {
    borderColor: "#FF0000",
  },
  countryCode: {
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 10,
  },
  button: {
    backgroundColor: "#A7D2B2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  buttonActive: {
    backgroundColor: "#67B279",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  validationMessage: {
    color: "#FF0000",
    fontSize: 12,
    alignSelf: "flex-start",
  },
});