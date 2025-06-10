import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import { generateAndStoreTokens } from "../utils/tokenManager";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import SocialFooter from "../components/SocialFooter";


const generateRandomFCMToken = () => {
  // Generate a random string of numbers
  const randomNum = Math.floor(Math.random() * 10000000000);
  return randomNum.toString();
};

export default function VerifyOTPScreen({ route, navigation }) {
  const { mobile } = route.params;
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(15);
  const inputRefs = useRef([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [errors, setErrors] = useState({ message: '' });

  useEffect(() => {
    // Only handle resend timer
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const content = await Clipboard.getStringAsync();
        const otpMatch = content.match(/(?:otp|code|pin)[^\d]*(\d{4})/i);
        
        if (otpMatch && otpMatch[1] && !isNavigating) {
          const extractedOTP = otpMatch[1];
          console.log('Found OTP:', extractedOTP);
          
          // Fill OTP fields
          const otpArray = extractedOTP.split('');
          setOtp(otpArray);
          
          // Clear clipboard
          await Clipboard.setStringAsync('');
          
          // Verify OTP only if it's complete
          if (otpArray.length === 4 && otpArray.every(digit => /^\d$/.test(digit))) {
            setTimeout(() => handleVerifyOTP(), 500);
          }
        }
      } catch (error) {
        console.log('Error checking clipboard:', error);
      }
    };

    const interval = setInterval(checkClipboard, 1000);
    return () => clearInterval(interval);
  }, [handleVerifyOTP, isNavigating]);

  const handleOtpChange = (value, index) => {
    // Only allow numbers
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input if value is entered and not the last input
      if (value && index < 3) {
        inputRefs.current[index + 1].focus();
      }

      // If all digits are filled, trigger verification automatically
      if (index === 3 && value) {
        const completeOtp = [...newOtp.slice(0, 3), value].join("");
        if (completeOtp.length === 4) {
          setTimeout(() => handleVerifyOTP(), 200);
        }
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace") {
      const newOtp = [...otp];

      // If current input is empty and we're not at the first input,
      // clear previous input and move focus back
      if (!otp[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      } else {
        // Clear current input
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    try {
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      if (!deviceToken) {
        Alert.alert("Error", "Device token not found. Please try again.");
        return;
      }

      const response = await axios.post(
        `${COMMON_BASE_URL}/resend_otp`,
        {
          mobile: mobile,
          role: "partner",
          device_token: deviceToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.st === 1) {
        setResendTimer(15);
        Alert.alert("Success", response.data.msg || "OTP resent successfully");
      } else {
        Alert.alert("Error", response.data.msg || "Failed to resend OTP");
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const handleVerifyOTP = async () => {
    // Prevent multiple simultaneous verification attempts
    if (isNavigating) return;
    
    const enteredOTP = otp.join("");
    
    // Validate OTP format
    if (!enteredOTP || enteredOTP.length !== 4) {
      setErrors({ message: "Please enter complete OTP" });
      return;
    }

    // Validate that all characters are numbers
    if (!/^\d{4}$/.test(enteredOTP)) {
      setErrors({ message: "Invalid OTP format" });
      return;
    }

    setLoading(true);
    setIsNavigating(true);

    try {
      // Get device info
      const deviceModel = Platform.OS === 'ios' ? 'iPhone' : 'Android';
      const deviceId = await AsyncStorage.getItem('deviceId') || Date.now().toString();
      
      // Generate random FCM token
      const fcmToken = generateRandomFCMToken();
      
      // Store FCM token for future use
      await AsyncStorage.setItem('fcmToken', fcmToken);

      // Clear any previous errors
      setErrors({ message: '' });

      // Prepare the request body according to the API specification
      const requestBody = {
        mobile: mobile,
        otp: enteredOTP,
        fcm_token: fcmToken,
        device_id: deviceId,
        device_model: deviceModel,
        role: "partner"
      };

      const apiUrl = `${PARTNER_BASE_URL}/check_otp`;
      console.log('API URL:', apiUrl);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log('Response Status:', response.status);
      console.log('Response Headers:', response.headers);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));

      if (!response || !response.data) {
        console.error('No response data received');
        throw new Error('Server not responding. Please try again.');
      }

      console.log('Received response:', response.data);

      if (response.data.st === 2) {
        setErrors({ message: "The Mobile number or OTP you entered is incorrect" });
        return;
      }

      if (response.data.st === 1) {
        // Check if we have user data
        if (response.data.data) {
          const userData = response.data.data;
          
          // Store user data
          await AsyncStorage.setItem("userData", JSON.stringify(userData));
          
          // Store tokens
          if (userData.access) {
            await AsyncStorage.setItem("accessToken", userData.access);
          }
          if (userData.refresh) {
            await AsyncStorage.setItem("refreshToken", userData.refresh);
          }
          
          // Store device token
          if (userData.device_token) {
            await AsyncStorage.setItem("devicePushToken", userData.device_token);
            console.log('Device token stored:', userData.device_token);
          }
          
          // Navigate to MainApp
          navigation.reset({
            index: 0,
            routes: [{ name: "MainApp" }],
          });
          return;
        } else {
          throw new Error('No user data received');
        }
      } else {
        // Handle case where response format doesn't match expected structure
        setErrors({ message: response.data.msg || "Invalid OTP. Please try again." });
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      console.error('Error Response:', error.response);
      console.error('Error Request:', error.request);
      console.error('Error Config:', error.config);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setErrors({ message: error.response.data?.Msg || `Server error: ${error.response.status}` });
      } else if (error.request) {
        // The request was made but no response was received
        setErrors({ message: 'No response from server. Please check your internet connection.' });
      } else {
        // Something happened in setting up the request that triggered an Error
        setErrors({ message: error.message || 'Failed to verify OTP. Please try again.' });
      }
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        // behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/menumitra-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>MenuMitra</Text>
              <Text style={styles.subtitle}>Partner</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.verifyTitle}>Verify OTP</Text>
            <Text style={styles.verifySubtitle}>
              Enter the verification code sent to
            </Text>
            <Text style={styles.mobileNumber}>+91 {mobile}</Text>

            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    loading && styles.inputDisabled,
                    otp[index] && styles.otpInputFilled,
                  ]}
                  maxLength={1}
                  keyboardType="numeric"
                  value={otp[index]}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  editable={!loading}
                  selectTextOnFocus
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  importantForAutofill="yes"
                />
              ))}
            </View>

            <View style={styles.validationContainer}>
              <Text style={styles.validationMessage}>
                {errors.message || " "}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled,
                !isOtpComplete && styles.buttonInactive,
                isOtpComplete && styles.buttonActive,
              ]}
              onPress={handleVerifyOTP}
              disabled={loading || !isOtpComplete}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={resendTimer > 0}
            >
              <Text style={styles.resendText}>
                Didn't receive the code?{" "}
                <Text style={styles.resendTimer}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              style={styles.backToLoginContainer}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          
        </View>
       
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
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
  verifyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  verifySubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
    textAlign: "center",
  },
  mobileNumber: {
    fontSize: 16,
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    width: "100%",
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#67B279",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    marginHorizontal: 5,
    backgroundColor: "#fff",
  },
  otpInputFilled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#67B279",
    borderWidth: 2,
  },
  button: {
    backgroundColor: "#A7D2B2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  buttonActive: {
    backgroundColor: "#67B279",
  },
  buttonInactive: {
    backgroundColor: "#A7D2B2",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 34, // Reduced margin as Back to Login will be below
  },
  resendTimer: {
    color: "#67B279",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 20,
  },
  footerLogo: {
    width: 50,
    height: 50,
    marginBottom: 0,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 0,
  },
  socialContainer: {
    flexDirection: "row",
    marginBottom: 0,
  },
  socialIcon: {
    marginHorizontal: 10,
  },
  poweredBy: {
    fontSize: 14,
    color: "#666",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#67B279",
    marginVertical: 5,
  },
  version: {
    fontSize: 12,
    color: "#666",
  },
  inputDisabled: {
    opacity: 0.7,
  },
  backToLoginContainer: {
    marginTop: 0,
    marginBottom: 0, // Add margin to create space between Back to Login and social footer
  },
  backToLoginText: {
    color: "#67B279",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  validationContainer: {
    height: 20,
    marginTop: -15,
    marginBottom: 5,
    width: "100%",
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  validationMessage: {
    color: "#FF0000",
    fontSize: 12,
    textAlign: 'center',
    alignSelf: 'center',
  },
});