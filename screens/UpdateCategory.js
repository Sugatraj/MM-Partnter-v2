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
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import { formatCategoryName, validateCategoryName } from '../utils/inputValidation';

export default function UpdateCategory({ route, navigation }) {
  const { menu_cat_id, categoryDetails } = route.params;
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(categoryDetails || null);
  const [formData, setFormData] = useState({
    category_name: categoryDetails?.name || "",
    image: categoryDetails?.image || null,
  });
  const [errors, setErrors] = useState({
    category_name: false,
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

  const loadCategoryDetails = async () => {
    try {
      setLoading(true);

      // Get outlet_id from AsyncStorage
      const userData = await AsyncStorage.getItem("userData");
      const { outlet_id } = JSON.parse(userData);

      if (!outlet_id || !menu_cat_id) {
        console.error("❌ Missing required IDs:", { outlet_id, menu_cat_id });
        Alert.alert("Error", "Required data is missing");
        return;
      }

      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const requestBody = {
        outlet_id: Number(outlet_id),
        menu_cat_id: Number(menu_cat_id),
        device_token:deviceToken
      };

      console.log("📤 Fetching category details with:", requestBody);

      const response = await fetch(
        `${PARTNER_BASE_URL}/manage/category/detail`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();
      console.log("📥 Category details response:", responseData);

      // Check for 401 unauthorized first
      if (response.status === 401 || 
          responseData.code === 'token_not_valid' || 
          (responseData.detail && responseData.detail.includes('token not valid'))) {
        await handleUnauthorized();
        return;
      }

      if (responseData.st === 1 && responseData.data) {
        const categoryData = {
          menu_cat_id: responseData.data.menu_cat_id,
          name: responseData.data.name,
          image: responseData.data.image,
          outlet_id: responseData.data.outlet_id,
          menu_count: responseData.data.menu_count || 0,
        };

        console.log("✅ Setting category data:", categoryData);

        setCategory(categoryData);
        setFormData({
          category_name: categoryData.name || "",
          image: categoryData.image || null,
        });

        console.log("📝 Form Data Updated:", {
          category_name: categoryData.name,
          image: categoryData.image,
        });
      } else {
        throw new Error(responseData.Msg || "Failed to load category details");
      }
    } catch (err) {
      console.error("❌ Load Category Error:", {
        message: err.message,
        details: err,
      });
      
      // Check for 401 in error response
      if (err.response?.status === 401 || 
          err.response?.data?.code === 'token_not_valid' ||
          err.response?.data?.detail?.includes('token not valid')) {
        await handleUnauthorized();
      } else {
        Alert.alert("Error", "Failed to load category details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera roll is required!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData((prev) => ({
          ...prev,
          image: result.assets[0].uri,
        }));
        setErrors((prev) => ({
          ...prev,
          image: false,
        }));
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleRemoveImage = () => {
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
          onPress: () => {
            setFormData(prev => ({ ...prev, image: null }));
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!category || !category.outlet_id || !category.menu_cat_id) {
        console.error("❌ Category details not loaded:", category);
        Alert.alert("Error", "Please wait for category details to load");
        return;
      }

      // Validate fields
      const newErrors = {
        category_name: !formData.category_name.trim(),
        nameFormat: !validateCategoryName(formData.category_name),
        specialChar: /[^a-zA-Z\s]/.test(formData.category_name),
        hasNumbers: /\d/.test(formData.category_name)
      };
      setErrors(newErrors);

      if (Object.values(newErrors).some((error) => error)) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      setLoading(true);

      const apiFormData = new FormData();
      // Get user_id from AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        Alert.alert('Error', 'User data not found. Please login again.');
        return;
      }

      const userData = JSON.parse(userDataString);
      const userId = userData.user_id;

      apiFormData.append("user_id", userId);
      apiFormData.append("outlet_id", String(category.outlet_id));
      apiFormData.append("menu_cat_id", String(category.menu_cat_id));
      apiFormData.append("category_name", formData.category_name.trim());

      if (formData.image && !formData.image.startsWith("http")) {
        const imageUri = formData.image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : "jpg";

        apiFormData.append("image", {
          uri: Platform.OS === "ios" ? imageUri.replace("file://", "") : imageUri,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
          name: `category_image.${ext}`,
        });
      }

      console.log("📤 Sending update request with data:", {
        outlet_id: category.outlet_id,
        menu_cat_id: category.menu_cat_id,
        category_name: formData.category_name.trim(),
        hasNewImage: formData.image && !formData.image.startsWith("http"),
      });

      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      if (!deviceToken) {
        throw new Error('Device token not found');
      }

      apiFormData.append("device_token", deviceToken);

      const response = await fetch(`${COMMON_BASE_URL}/menu_category_update`, {
        method: "POST",
        body: apiFormData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
          "Device-Token": deviceToken
        },
      });

      const responseData = await response.json();
      console.log("📥 Update response:", responseData);

      // Check for 401 unauthorized first
      if (response.status === 401 || 
          responseData.code === 'token_not_valid' || 
          (responseData.detail && responseData.detail.includes('token not valid'))) {
        await handleUnauthorized();
        return;
      }

      if (responseData.st === 1) {
        Alert.alert(
          "Success",
          responseData.Msg || "Category updated successfully",
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
          ]
        );
      } else {
        throw new Error(responseData.Msg || "Failed to update category");
      }
    } catch (err) {
      console.error("❌ Update Category Error:", {
        message: err.message,
        details: err,
      });
      
      // Check for 401 in error response
      if (err.response?.status === 401 || 
          err.response?.data?.code === 'token_not_valid' ||
          err.response?.data?.detail?.includes('token not valid')) {
        await handleUnauthorized();
      } else {
        Alert.alert("Error", err.message || "Failed to update category");
      }
    } finally {
      setLoading(false);
    }
  };

  // Monitor state changes
  useEffect(() => {
    if (category) {
      console.log("Category State Updated:", category);
    }
  }, [category]);

  useEffect(() => {
    if (formData.category_name || formData.image) {
      console.log("Form Data State Updated:", formData);
    }
  }, [formData]);

  // Load category details when screen is focused
  useEffect(() => {
    if (isFocused && menu_cat_id && !categoryDetails) {
      loadCategoryDetails();
    }
  }, [isFocused, menu_cat_id]);

  // Add this validation helper
  const validateImage = (uri) => {
    if (!uri) return true; // Image is optional
    if (uri.startsWith("http")) return true; // Existing image URL
    const extension = uri.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png"].includes(extension);
  };

  return (
    <View style={styles.container}>
      <Header title="Update Category" showBack={true} showMenu={true} />
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
                  (errors.category_name || errors.nameFormat || errors.specialChar || errors.hasNumbers) && styles.inputError
                ]}
                value={formData.category_name}
                onChangeText={(text) => {
                  // Check for special characters and numbers before sanitizing
                  const hasSpecialChars = /[^a-zA-Z\s]/.test(text);
                  const hasNumbers = /\d/.test(text);
                  const sanitizedText = formatCategoryName(text);
                  setFormData({ ...formData, category_name: sanitizedText });
                  setErrors({
                    category_name: !sanitizedText.trim(),
                    nameFormat: !validateCategoryName(sanitizedText),
                    specialChar: hasSpecialChars && !hasNumbers,
                    hasNumbers: hasNumbers
                  });
                }}
                placeholder="Enter category name"
              />
              {errors.category_name && (
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

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Category Image</Text>
            <View style={styles.imageContainer}>
              {formData.image ? (
                <>
                  <Image
                    source={{ uri: formData.image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  {/* <TouchableOpacity 
                    style={styles.removeImageButton} 
                    onPress={handleRemoveImage}
                  >
                    <FontAwesome name="times" size={20} color="#fff" />
                  </TouchableOpacity> */}
                  <TouchableOpacity style={styles.imageButton} onPress={handleImagePick}>
                    <FontAwesome name="camera" size={20} color="#666" />
                    <Text style={styles.imageButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="image" size={50} color="#666" />
                  <Text style={styles.placeholderText}>No image selected</Text>
                  <TouchableOpacity style={styles.imageButton} onPress={handleImagePick}>
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
              <Text style={styles.submitButtonText}>Update Category</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#666",
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
  required: {
    color: "red",
  },
});
