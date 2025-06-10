import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import Header from "../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from '../apiConfig';

export default function CreateOwnerScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    dob: "",
    aadhar_number: "",
    address: "",
    // photo: "",
    otp: 1234, // Default OTP for testing
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [errors, setErrors] = useState({
    name: false,
    mobile: false,
    email: false,
    dob: false,
    aadhar_number: false,
    address: false,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) {
        setUserData(JSON.parse(data));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const formatDateForAPI = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        dob: selectedDate.toISOString().split("T")[0], // Store in YYYY-MM-DD format internally
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: !formData.name?.trim(),
      mobile: !formData.mobile || formData.mobile.length !== 10,
      email: !formData.email?.trim() || !formData.email.includes("@"),
      dob: !formData.dob,
      aadhar_number: !formData.aadhar_number || formData.aadhar_number.length !== 12,
      address: !formData.address?.trim(),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const getInputStyle = (field) => [
    styles.input,
    errors[field] && styles.inputError
  ];

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({
        name: false,
        mobile: false,
        email: false,
        dob: false,
        aadhar_number: false,
        address: false,
      });

      const requestData = {
        partner_id: userData?.user_id.toString(),
        name: String(formData.name).trim(),
        mobile: String(formData.mobile).trim(),
        address: String(formData.address).trim(),
        dob: formatDateForAPI(formData.dob),
        aadhar_number: String(formData.aadhar_number).trim(),
        // photo: formData.photo || "",
        email: String(formData.email).trim().toLowerCase(),
        otp: 1234,
      };

      console.log("Sending request with data:", requestData);

      const response = await axios.post(
        `${PARTNER_BASE_URL}/owner/create`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      // Check for st=2 first, then check for success
      if (response.data.st === 2) {
        Alert.alert("Validation Error", response.data.msg);
      } else if (response.data.st === 1) {
        Alert.alert(
          "Success",
          `${response.data.Msg}\nOwner ID: ${response.data.data?.user_id}`,
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(response.data.Msg || "Failed to create owner");
      }
    } catch (err) {
      console.error("API Error Details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = "Failed to create owner. Please try again.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.Msg) {
        errorMessage = err.response.data.Msg;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }

      // Launch image picker with 1:1 aspect ratio
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Changed to 1:1 ratio
        quality: 1,
      });

      if (!result.canceled) {
        setFormData({ ...formData, photo: result.assets[0].uri });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Create Owner" showBack={true} showMenu={true} />
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
          <Text style={styles.required}>*</Text> Name 
          </Text>
          <TextInput
            style={getInputStyle("name")}
            placeholder="Enter Name"
            value={formData.name}
            onChangeText={(text) => {
              setFormData({ ...formData, name: text });
              setErrors({ ...errors, name: false });
            }}
          />
          {errors.name && (
            <Text style={styles.errorText}>Name is required</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Mobile <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={getInputStyle("mobile")}
            placeholder="Enter Mobile"
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.mobile}
            onChangeText={(text) => {
              setFormData({ ...formData, mobile: text.replace(/[^0-9]/g, "") });
              setErrors({ ...errors, mobile: false });
            }}
          />
          {errors.mobile && (
            <Text style={styles.errorText}>Valid 10-digit mobile number is required</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={getInputStyle("email")}
            placeholder="Enter Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => {
              setFormData({ ...formData, email: text.toLowerCase() });
              setErrors({ ...errors, email: false });
            }}
          />
          {errors.email && (
            <Text style={styles.errorText}>Valid email is required</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Date of Birth <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={formData.dob ? styles.dateText : styles.placeholderText}>
              {formData.dob ? formatDateForDisplay(formData.dob) : "Select Date of Birth"}
            </Text>
            <FontAwesome name="calendar" size={20} color="#666" />
          </TouchableOpacity>
          {errors.dob && (
            <Text style={styles.errorText}>Date of birth is required</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Aadhar Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={getInputStyle("aadhar_number")}
            placeholder="Enter 12-digit Aadhar Number"
            keyboardType="numeric"
            maxLength={12}
            value={formData.aadhar_number}
            onChangeText={(text) => {
              setFormData({
                ...formData,
                aadhar_number: text.replace(/[^0-9]/g, ""),
              });
              setErrors({ ...errors, aadhar_number: false });
            }}
          />
          {errors.aadhar_number && (
            <Text style={styles.errorText}>Valid 12-digit Aadhar number is required</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[getInputStyle("address"), styles.textArea]}
            placeholder="Enter Address"
            multiline
            numberOfLines={4}
            value={formData.address}
            onChangeText={(text) => {
              setFormData({ ...formData, address: text });
              setErrors({ ...errors, address: false });
            }}
          />
          {errors.address && (
            <Text style={styles.errorText}>Address is required</Text>
          )}
        </View>

        {/* <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo</Text>
          <View style={styles.photoContainer}>
            {formData.photo ? (
              <Image
                source={{ uri: formData.photo }}
                style={styles.photoPreview}
              />
            ) : null}
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <FontAwesome name="camera" size={20} color="#666" />
              <Text style={styles.photoButtonText}>
                {formData.photo ? "Change Photo" : "Select Photo"}
              </Text>
            </TouchableOpacity>
          </View>
        </View> */}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.createButtonText}>Create Owner</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={formData.dob ? new Date(formData.dob) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: 8,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
  },
  required: {
    color: "red",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    backgroundColor: "white",
  },
  dateText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  createButton: {
    backgroundColor: "#67B279",
    padding: 16,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  photoContainer: {
    alignItems: "center",
  },
  photoPreview: {
    width: 200,
    height: 200, // Same as width for square
    borderRadius: 8,
    marginBottom: 10,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  photoButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },
  inputError: {
    borderColor: "#DC2626",
    borderWidth: 1,
  },
});
