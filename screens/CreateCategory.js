import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Header from "../components/Header";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from '../apiConfig';
import { formatCategoryName, validateCategoryName } from '../utils/inputValidation';


export default function CreateCategory({ route, navigation }) {
  const { restaurantId } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: null,
  });
  const [errors, setErrors] = useState({
    name: false,
    nameFormat: false,
    specialChar: false,
    hasNumbers: false
  });

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

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setFormData({ ...formData, image: result.assets[0].uri });
        setErrors({ ...errors, image: false });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = () => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove this image?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: () => setFormData({ ...formData, image: null }),
          style: "destructive"
        }
      ]
    );
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
        Alert.alert('Error', 'User data not found. Please login again.');
        return;
      }

      const userData = JSON.parse(userDataString);
      const userId = userData.user_id;

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please login again.');
        return;
      }

      // Validate fields - only name is required
      const newErrors = {
        name: !formData.name.trim(),
        nameFormat: !validateCategoryName(formData.name),
        specialChar: /[^a-zA-Z\s]/.test(formData.name),
        hasNumbers: /\d/.test(formData.name)
      };
      setErrors(newErrors);

      if (Object.values(newErrors).some((error) => error)) {
        return;
      }

      setLoading(true);

      // Create form data
      const apiFormData = new FormData();
      apiFormData.append("user_id", userId);
      apiFormData.append("outlet_id", restaurantId.toString());
      apiFormData.append("category_name", formData.name.trim());
      apiFormData.append("device_token", deviceToken);

      // Append image only if selected
      if (formData.image) {
        const imageUri = formData.image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        apiFormData.append("image", {
          uri: imageUri,
          name: filename || 'image.jpg',
          type,
        });
      }

      console.log("Sending category data:", {
        outlet_id: restaurantId.toString(),
        category_name: formData.name.trim(),
        image: formData.image ? "Image attached" : "No image"
      });

      console.log('Sending form data:', JSON.stringify(apiFormData));

      const response = await axios({
        method: 'POST',
        url: `${COMMON_BASE_URL}/menu_category_create`,
        data: apiFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000, // 60 seconds timeout
      });

      console.log("Create Category Response:", response.data);

      if (response.data.st === 1) {
        Alert.alert(
          "Success",
          "Category created successfully",
          [
            {
              text: "OK",
              onPress: () => {
                if (route.params?.onUpdate) {
                  route.params.onUpdate();
                }
                navigation.goBack();
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        throw new Error(response.data.Msg || "Failed to create category");
      }
    } catch (err) {
      console.error("Create Category Error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
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
      
      Alert.alert(
        "Error",
        err.response?.data?.Msg || err.message || "Failed to create category"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Create Category" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
              <Text style={styles.required}>*</Text> Category Name 
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  (errors.name || errors.nameFormat || errors.specialChar || errors.hasNumbers) && styles.inputError
                ]}
                value={formData.name}
                onChangeText={(text) => {
                  // Check for special characters and numbers before sanitizing
                  const hasSpecialChars = /[^a-zA-Z\s]/.test(text);
                  const hasNumbers = /\d/.test(text);
                  const sanitizedText = formatCategoryName(text);
                  setFormData({ ...formData, name: sanitizedText });
                  setErrors({
                    name: !sanitizedText.trim(),
                    nameFormat: !validateCategoryName(sanitizedText),
                    specialChar: hasSpecialChars && !hasNumbers,
                    hasNumbers: hasNumbers
                  });
                }}
                placeholder="Enter category name"
              />
              {errors.name && (
                <Text style={styles.errorText}>Category name is required</Text>
              )}
              {errors.hasNumbers && (
                <Text style={styles.errorText}>Numbers are not allowed in category name</Text>
              )}
              {errors.specialChar && !errors.hasNumbers && (
                <Text style={styles.errorText}>Special characters are not allowed</Text>
              )}
              {errors.nameFormat && !errors.specialChar && !errors.hasNumbers && (
                <Text style={styles.errorText}>Name must contain only letters and spaces</Text>
              )}
            </View>
          </View>

          {/* Image Upload - now optional */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Category Image
            </Text>
            <View style={styles.imageContainer}>
              {formData.image ? (
                <>
                  <Image
                    source={{ uri: formData.image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton} 
                    onPress={removeImage}
                  >
                    <FontAwesome name="times" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    <FontAwesome name="camera" size={20} color="#666" />
                    <Text style={styles.imageButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="image" size={50} color="#666" />
                  <Text style={styles.placeholderText}>No image selected</Text>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    <FontAwesome name="camera" size={20} color="#666" />
                    <Text style={styles.imageButtonText}>Select Image (Optional)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Category</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#666",
  },
  required: {
    color: "#ff0000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ff0000",
  },
  errorText: {
    color: "#ff0000",
    fontSize: 12,
    marginTop: 5,
  },
  imageContainer: {
    width: "50%",
    aspectRatio: 1,
    alignSelf: "center",
    marginVertical: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  placeholderText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#67B279",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  imageButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
  },
  imageButtonText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
