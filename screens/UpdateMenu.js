import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import { preventSpecialCharacters, validateCharacters, formatPriceInput, validatePrice } from '../utils/inputValidation';

export default function UpdateMenu({ route, navigation }) {
  const { menuId, restaurantId } = route.params;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [userId, setUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    fullPrice: "",
    halfPrice: "",
    foodType: "veg",
    categoryId: "",
    spicyIndex: "",
    offer: "",
    rating: "",
    description: "",
    ingredients: "",
    isSpecial: false,
  });

  const [foodTypes, setFoodTypes] = useState([]);
  const [spicyLevels, setSpicyLevels] = useState([]);
  const [ratingOptions, setRatingOptions] = useState([]);

  const [errors, setErrors] = useState({
    name: null,
    nameFormat: null,
    food_type: null,
    full_price: null,
    menu_cat_id: null,
    spicy_index: null,
    ratings: null
  });

  // Add state for tracking removed image IDs
  const [removedImageIds, setRemovedImageIds] = useState([]);

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
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserId(userData.user_id);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    
    loadUserData();
    loadMenuData();
    loadCategories();
    loadFoodTypes();
    loadSpicyLevels();
    loadRatingOptions();
  }, []);

  const loadCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      console.log("Loading categories for restaurant:", restaurantId);

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_category_listview`,
        data: {
          outlet_id: parseInt(restaurantId),
          device_token:deviceToken
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Category List API Response:", response.data);

      if (
        response.data.st === 1 &&
        Array.isArray(response.data.menucat_details)
      ) {
        // Transform and filter the categories
        const validCategories = response.data.menucat_details
          .filter((cat) => cat.menu_cat_id !== null) // Remove categories with null ID
          .map((cat) => ({
            menu_cat_id: cat.menu_cat_id,
            name: cat.category_name,
            menu_count: cat.menu_count,
          }));
        setCategories(validCategories);
      } else {
        throw new Error("Invalid category data received");
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      alert("Failed to load categories");
    }
  };

  const loadMenuData = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      setLoading(true);

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_view`,
        data: {
          menu_id: parseInt(menuId),
          outlet_id: parseInt(restaurantId),
          device_token: deviceToken
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Menu View API Response:", response.data);

      if (response.data.st === 1 && response.data.data) {
        const menuData = response.data.data;
        console.log("Setting form data with rating:", menuData.rating);

        setFormData((prevState) => ({
          name: menuData.name || "",
          fullPrice: menuData.full_price?.toString() || "",
          halfPrice: menuData.half_price?.toString() || "",
          foodType: menuData.food_type || "veg",
          categoryId: menuData.menu_cat_id?.toString() || "",
          spicyIndex: menuData.spicy_index?.toString() || "",
          offer: menuData.offer?.toString() || "",
          rating: menuData.rating || "1.0",
          description: menuData.description || "",
          ingredients: menuData.ingredients || "",
          isSpecial: menuData.is_special === true,
        }));

        // Reset both images and newImages when loading menu data
        setNewImages([]);
        setRemovedImageIds([]);
        
        // Set image if exists
        if (menuData.images && menuData.images.length > 0) {
          console.log('Processing menu images:', menuData.images);
          // Convert image objects to URIs if needed
          const processedImages = menuData.images.map(img => {
            console.log('Processing image:', img);
            let imageUrl = '';
            let imageId = null;

            try {
              // Handle different image object formats
              if (typeof img === 'string') {
                imageUrl = img;
              } else if (img && typeof img === 'object') {
                if (img.uri) {
                  imageUrl = img.uri;
                  imageId = img.id;
                } else if (img.URL || img.url) {
                  imageUrl = img.URL || img.url;
                  imageId = img.id;
                } else if (img.image) {
                  imageUrl = img.image;
                  imageId = img.image_id;
                }
              }

              // Ensure the URL is a string and not empty
              if (typeof imageUrl !== 'string' || !imageUrl) {
                console.log('Invalid image URL:', imageUrl);
                return null;
              }

              // Ensure the URL is properly formatted
              if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('file://')) {
                imageUrl = `https://${imageUrl}`;
              }

              return {
                url: imageUrl,
                id: imageId
              };
            } catch (error) {
              console.error('Error processing image:', error);
              return null;
            }
          }).filter(img => img !== null && img.url); // Remove any null or invalid images
          
          console.log('Final processed images:', processedImages);
          setImages(processedImages);
        } else {
          console.log('No images found in menu data');
          setImages([]);
        }
      } else {
        throw new Error("Failed to load menu details");
      }
    } catch (error) {
      console.error("Error loading menu:", error);
      
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      alert("Failed to load menu details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadFoodTypes = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      if (!deviceToken) {
        console.error('Device token not found');
        Alert.alert('Error', 'Device token not found. Please try again.');
        return;
      }

      const response = await axios.post(
        `${COMMON_BASE_URL}/get_food_type_list`,
        {
          device_token: deviceToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log('Food types response:', response.data);
      if (response.data.st === 1) {
        const types = response.data.food_type_list;
        const formattedTypes = Object.entries(types).map(([value, label]) => ({
          value,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        }));
        setFoodTypes(formattedTypes);
      }
    } catch (error) {
      console.error("Error loading food types:", error);
      Alert.alert("Error", "Failed to load food types");
    }
  };

  const loadSpicyLevels = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      if (!deviceToken) {
        console.error('Device token not found');
        Alert.alert('Error', 'Device token not found. Please try again.');
        return;
      }

      const response = await axios.post(
        `${COMMON_BASE_URL}/get_spicy_index_list`,
        {
          device_token: deviceToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      if (response.data.st === 1) {
        const levels = response.data.spicy_index_list;
        const formattedLevels = Object.entries(levels).map(
          ([value, label]) => ({
            value,
            label: `${label}`,
          })
        );
        setSpicyLevels(formattedLevels);
      }
    } catch (error) {
      console.error("Error loading spicy levels:", error);
      Alert.alert("Error", "Failed to load spicy levels");
    }
  };

  const loadRatingOptions = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      if (!deviceToken) {
        console.error('Device token not found');
        Alert.alert('Error', 'Device token not found. Please try again.');
        return;
      }

      const response = await axios.post(
        `${COMMON_BASE_URL}/rating_list`,
        {
          device_token: deviceToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      if (response.data.st === 1) {
        const ratings = response.data.rating_list;
        const formattedRatings = Object.entries(ratings).map(
          ([value, label]) => ({
            value,
            label: label.toString(),
          })
        );
        setRatingOptions(formattedRatings);
      } 
    } catch (error) {
      console.error("Error loading ratings:", error);
      Alert.alert("Error", "Failed to load rating options");
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 images allowed");
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

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
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri;
        
        // Ensure the URI is a string
        if (typeof newImageUri !== 'string') {
          throw new Error('Invalid image URI format');
        }

        // Add the new image with proper formatting
        setNewImages(prev => [...prev, newImageUri]);
        setImages(prev => [...prev, { url: newImageUri, id: null }]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index) => {
    const imageToRemove = images[index];
    
    // If the image has an ID (existing image), add it to removedImageIds
    if (imageToRemove && imageToRemove.id) {
      setRemovedImageIds(prev => [...prev, imageToRemove.id]);
    }
    
    // Remove from images array
    setImages(prev => prev.filter((_, i) => i !== index));
    // Also remove from newImages if it exists there
    setNewImages(prev => prev.filter(img => img !== imageToRemove.url));
  };

  const validateForm = () => {
    const newErrors = {
      name: !formData.name.trim() ? 'Menu name is required' : null,
      nameFormat: !validateCharacters(formData.name) ? 'Menu name can only contain letters, numbers, and spaces' : null,
      food_type: !formData.foodType ? 'Food type is required' : null,
      full_price: !formData.fullPrice ? 'Full price is required' : null,
      menu_cat_id: !formData.categoryId ? 'Category is required' : null,
      // spicy index is optional
      ratings: !formData.rating ? 'Rating is required' : null
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      setLoading(true);
      const formDataToSend = new FormData();

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Append basic form fields
      formDataToSend.append("user_id", userId.toString());
      formDataToSend.append("menu_id", menuId);
      formDataToSend.append("outlet_id", restaurantId);
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("full_price", formData.fullPrice);
      formDataToSend.append("half_price", formData.halfPrice || "0");
      formDataToSend.append("food_type", formData.foodType);
      formDataToSend.append("menu_cat_id", formData.categoryId);
      formDataToSend.append("spicy_index", formData.spicyIndex ? formData.spicyIndex.toString() : "");
      formDataToSend.append("offer", formData.offer || "0");
      formDataToSend.append("rating", formData.rating || "");
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("ingredients", formData.ingredients.trim());
      formDataToSend.append("is_special", formData.isSpecial ? "True" : "False");
      formDataToSend.append("device_token", deviceToken || "");

      // Handle new images
      if (newImages.length > 0) {
        newImages.forEach((imageUri, index) => {
          const filename = imageUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          formDataToSend.append('images', {
            uri: imageUri,
            type: type,
            name: filename || `image${index}.jpg`,
          });
        });
      }

      // Handle removed images
      if (removedImageIds.length > 0) {
        formDataToSend.append('remove_image_flag', 'True');
        formDataToSend.append('existing_image_ids', JSON.stringify(removedImageIds));
      }

      // Send list of remaining existing images
      const remainingImages = images.filter(img => !newImages.includes(img) && !removedImageIds.includes(img.id));
      formDataToSend.append('existing_images', JSON.stringify(remainingImages));

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_update`,
        data: formDataToSend,
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.st === 1) {
        Alert.alert("Success", "Menu updated successfully");
        navigation.goBack();
      } else {
        throw new Error(response.data.msg || "Failed to update menu");
      }
    } catch (error) {
      console.error("Error updating menu:", error);
      
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      Alert.alert(
        "Error",
        error.response?.data?.msg || "Failed to update menu"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Update Menu" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Update Menu" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Menu Name
              </Text>
              <TextInput
                style={[styles.input, (errors.name || errors.nameFormat) && styles.inputError]}
                value={formData.name}
                onChangeText={(text) => {
                  const sanitizedText = preventSpecialCharacters(text);
                  setFormData({ ...formData, name: sanitizedText });
                  setErrors({
                    ...errors,
                    name: !sanitizedText.trim() ? 'Menu name is required' : null,
                    nameFormat: !validateCharacters(sanitizedText) ? 'Menu name can only contain letters, numbers, and spaces' : null
                  });
                }}
                placeholder="Enter menu name"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              {errors.nameFormat && <Text style={styles.errorText}>{errors.nameFormat}</Text>}
            </View>

            {/* Prices Row */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 5 }]}>
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Price
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.full_price && styles.inputError
                    ]}
                    value={formData.fullPrice}
                    onChangeText={(text) => {
                      const formattedPrice = formatPriceInput(text);
                      setFormData({ ...formData, fullPrice: formattedPrice });
                      setErrors({
                        ...errors,
                        full_price: !validatePrice(formattedPrice) ? 'Price must be greater than zero' : null
                      });
                    }}
                    keyboardType="numeric"
                    placeholder="Enter price"
                  />
                  {errors.full_price && <Text style={styles.errorText}>{errors.full_price}</Text>}
                </View>

                {/* <View style={[styles.inputGroup, { flex: 1, marginLeft: 5 }]}>
                  <Text style={styles.label}>Half Price</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.halfPrice}
                    onChangeText={(text) => {
                      const formattedPrice = formatPriceInput(text);
                      setFormData({ ...formData, halfPrice: formattedPrice });
                    }}
                    keyboardType="numeric"
                    placeholder="Enter half price"
                  />
                </View> */}
              </View>
            </View>
          </View>

          {/* Category and Type */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Menu Category
              </Text>
              <View style={[styles.pickerContainer, errors.menu_cat_id && styles.inputError]}>
                <Picker
                  selectedValue={formData.categoryId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, categoryId: value });
                    if (errors.menu_cat_id) setErrors({ ...errors, menu_cat_id: null });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.menu_cat_id.toString()}
                      label={category.name}
                      value={category.menu_cat_id.toString()}
                    />
                  ))}
                </Picker>
              </View>
              {errors.menu_cat_id && <Text style={styles.errorText}>{errors.menu_cat_id}</Text>}
            </View>

            {/* Food Type Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={styles.required}>* </Text> 
                Food Type   
              </Text>
              <View style={[styles.pickerContainer, errors.food_type && styles.inputError]}>
                <Picker
                  selectedValue={formData.foodType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, foodType: value });
                    if (errors.food_type) setErrors({ ...errors, food_type: null });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Food Type" value="" />
                  {foodTypes.map((type) => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </Picker>
              </View>
              {errors.food_type && <Text style={styles.errorText}>{errors.food_type}</Text>}
            </View>

            {/* Spicy Level Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Spicy Index</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.spicyIndex}
                  onValueChange={(value) => setFormData({ ...formData, spicyIndex: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Spicy Index" value="" />
                  {spicyLevels.map((level) => (
                    <Picker.Item
                      key={level.value}
                      label={level.label}
                      value={level.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Offer (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.offer}
                onChangeText={(text) => setFormData({ ...formData, offer: text })}
                keyboardType="numeric"
                placeholder="Enter offer percentage"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rating</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.rating}
                  onValueChange={(value) => setFormData({ ...formData, rating: value })}
                  style={styles.picker}
                >
                  {ratingOptions.map((rating) => (
                    <Picker.Item
                      key={rating.value}
                      label={rating.label}
                      value={rating.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Description and Ingredients */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter menu item description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ingredients</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.ingredients}
                onChangeText={(text) => setFormData({ ...formData, ingredients: text })}
                placeholder="Enter ingredients"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Special Item</Text>
                <Switch
                  trackColor={{ false: "#ddd", true: "#67B279" }}
                  thumbColor={formData.isSpecial ? "#fff" : "#f4f3f4"}
                  ios_backgroundColor="#ddd"
                  onValueChange={(value) => setFormData({ ...formData, isSpecial: value })}
                  value={formData.isSpecial}
                />
              </View>
            </View>
          </View>

          {/* Images */}
          <View style={styles.section}>
            <Text style={styles.label}>Menu Images</Text>
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image 
                    source={{ uri: typeof image === 'string' ? image : image.url }} 
                    style={styles.imagePreview} 
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <FontAwesome name="times" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={pickImage}
                >
                  <FontAwesome name="plus" size={24} color="#666" />
                </TouchableOpacity>
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
              <Text style={styles.submitButtonText}>Update Menu Item</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  required: {
    color: "red",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#dc3545",
    borderWidth: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 5,
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    minHeight: 100,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#f8f8f8",
  },
  removeImageButton: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: "#dc3545",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
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
  submitButtonDisabled: {
    opacity: 0.7,
  }
});
