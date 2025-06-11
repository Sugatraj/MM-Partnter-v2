import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Header from "../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from '../apiConfig';
import { formatPriceInput, validatePrice } from '../utils/inputValidation';

export default function CreateMenu({ route, navigation }) {
  const { restaurantId, categoryId } = route.params;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    food_type: "",
    menu_cat_id: categoryId?.toString(),
    spicy_index: "",
    offer: "0",
    ratings: "",
    description: "",
    ingredients: "",
    is_special: "False",
    portions: [
      {
        portion_name: "",
        price: "",
        unit_value: "",
        unit_type: "",
        flag: 0
      }
    ]
  });
  const [errors, setErrors] = useState({});
  const [foodTypes, setFoodTypes] = useState([]);
  const [spicyLevels, setSpicyLevels] = useState([
    { value: "", label: "Select Spicy Index" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
  ]);
  const [ratingOptions, setRatingOptions] = useState([]);

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
        const token = await AsyncStorage.getItem("accessToken");
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
    loadCategories();
    loadFoodTypes();
    loadSpicyLevels();
    loadRatingOptions();
  }, []);

  const loadCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const userDataString = await AsyncStorage.getItem("userData");
      
      if (!userDataString) {
        console.error("User data not found");
        return;
      }

      const userData = JSON.parse(userDataString);
      const userId = userData.user_id;

      console.log("Loading categories for restaurant:", restaurantId);

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_category_list`,
        data: {
          outlet_id: parseInt(restaurantId),
          user_id: parseInt(userId),
          app_source: "partner"
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Category List API Response:", response.data);

      if (
        response.data?.data?.menucat_details &&
        Array.isArray(response.data.data.menucat_details)
      ) {
        // Filter out categories with null menu_cat_id and transform the data
        const validCategories = response.data.data.menucat_details
          .filter((cat) => cat.menu_cat_id !== null && cat.is_active === 1)
          .map((cat) => ({
            menu_cat_id: cat.menu_cat_id.toString(),
            name: cat.category_name,
          }));
        setCategories(validCategories);
      } else {
        console.error("Unexpected API response format:", response.data);
        throw new Error("Invalid category data received");
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      
      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      Alert.alert("Error", "Failed to load categories");
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

      const response = await axios.get(
        `${COMMON_BASE_URL}/get_food_type_list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log('Food types response:', response.data);
      
      const { food_type_list } = response.data;
      
      if (!food_type_list || typeof food_type_list !== 'object') {
        console.error('Invalid food_type_list format:', food_type_list);
        Alert.alert('Error', 'Invalid food types data received');
        return;
      }

      // Transform the object into the required format for the picker
      const formattedTypes = Object.entries(food_type_list).map(([value, label]) => ({
        value: value,
        label: label.charAt(0).toUpperCase() + label.slice(1) // Capitalize first letter
      }));

      console.log('Formatted food types:', formattedTypes);
      setFoodTypes(formattedTypes);
      
    } catch (error) {
      console.error("Error loading food types:", error);
      
      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      if (error.response?.status === 502) {
        Alert.alert('Error', 'Server is temporarily unavailable. Please try again in a few moments.');
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('Error', 'Request timed out. Please check your internet connection.');
      } else {
        Alert.alert("Error", "Failed to load food types. Please try again.");
      }
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

      const response = await axios.get(
        `${COMMON_BASE_URL}/get_spicy_index_list`,
        
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
      
      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      if (error.response?.status === 502) {
        Alert.alert('Error', 'Server is temporarily unavailable. Please try again in a few moments.');
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('Error', 'Request timed out. Please check your internet connection.');
      } else {
        Alert.alert("Error", "Failed to load spicy levels. Please try again.");
      }
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

      const response = await axios.get(
        `${COMMON_BASE_URL}/get_rating_list`,
        
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('Rating options response:', response.data);

      const { rating_list } = response.data;

      if (!rating_list || typeof rating_list !== 'object') {
        console.error('Invalid rating_list format:', rating_list);
        Alert.alert('Error', 'Invalid rating data received');
        return;
      }

      // Transform the object into array format for picker
      const formattedRatings = Object.entries(rating_list)
        .map(([value, label]) => ({
          value: value,
          label: label
        }))
        .sort((a, b) => parseFloat(a.value) - parseFloat(b.value)); // Sort by numeric value

      console.log('Formatted rating options:', formattedRatings);
      setRatingOptions(formattedRatings);

    } catch (error) {
      console.error("Error loading ratings:", error);
      
      if (error.response?.status === 502) {
        Alert.alert('Error', 'Server is temporarily unavailable. Please try again in a few moments.');
        return;
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('Error', 'Request timed out. Please check your internet connection.');
        return;
      }
      
      // Check for 401 unauthorized
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
        error.response?.data?.detail || "Failed to load rating options"
      );
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 images allowed");
      return;
    }

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
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Menu name is required';
    }
    
    if (!formData.food_type) {
      newErrors.food_type = 'Food type is required';
    }
    
    if (!formData.menu_cat_id) {
      newErrors.menu_cat_id = 'Please select a category';
    }
    
    // Spicy index is optional
    
    // if (!formData.ratings) {
    //   newErrors.ratings = 'Please select rating';
    // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      const newErrors = {};
      
      if (!formData.name.trim()) {
        newErrors.name = 'Menu name is required';
      }
      if (!/^[a-zA-Z0-9\s]*$/.test(formData.name)) {
        newErrors.nameFormat = 'Menu name can only contain letters, numbers, and spaces';
      }
      if (!formData.menu_cat_id) {
        newErrors.menu_cat_id = 'Please select a category';
      }
      if (!formData.food_type) {
        newErrors.food_type = 'Food type is required';
      }

      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Create form data
      const apiFormData = new FormData();
      
      // Basic menu information
      apiFormData.append("user_id", userId.toString());
      apiFormData.append("outlet_id", restaurantId.toString());
      apiFormData.append("menu_cat_id", formData.menu_cat_id);
      apiFormData.append("name", formData.name.trim());
      apiFormData.append("food_type", formData.food_type);
      apiFormData.append("description", formData.description.trim());
      apiFormData.append("spicy_index", formData.spicy_index ? formData.spicy_index.toString() : "");
      apiFormData.append("ingredients", formData.ingredients.trim());
      apiFormData.append("offer", formData.offer.toString());
      apiFormData.append("rating", formData.ratings.toString());
      apiFormData.append("app_source", "partner_app");
      apiFormData.append("device_token", deviceToken);

      // Create portion data array
      const portionData = formData.portions
        .filter(portion => portion.portion_name && portion.price && portion.unit_value && portion.unit_type)
        .map(portion => ({
          portion_name: portion.portion_name,
          price: parseFloat(portion.price),
          unit_value: portion.unit_value,
          unit_type: portion.unit_type,
          flag: portion.flag
        }));

      // Add validation for portions
      if (portionData.length === 0) {
        Alert.alert("Error", "At least one portion with complete details is required");
        setLoading(false);
        return;
      }

      // Append portion_data as JSON string
      apiFormData.append("portion_data", JSON.stringify(portionData));

      // Handle multiple images
      if (images.length > 0) {
        images.forEach((imageUri, index) => {
          const filename = imageUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          apiFormData.append('images', {
            uri: imageUri,
            type: type,
            name: filename || `image${index}.jpg`,
          });
        });
      }

      console.log("Sending menu data:", {
        outlet_id: restaurantId.toString(),
        menu_cat_id: formData.menu_cat_id,
        name: formData.name.trim(),
        food_type: formData.food_type,
        description: formData.description.trim(),
        spicy_index: formData.spicy_index,
        ingredients: formData.ingredients.trim(),
        offer: formData.offer,
        rating: formData.ratings,
        portion_data: portionData,
        images: images.length > 0 ? "Images attached" : "No images"
      });

      const response = await axios({
        method: 'POST',
        url: 'https://men4u.xyz/v2/common/menu_create',
        data: apiFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        transformRequest: (data, headers) => {
          return data;
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000 // 60 seconds timeout
      });

      // V2 API success handling
      Alert.alert(
        "Success",
        response.data.detail || "Menu item created successfully",
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

    } catch (err) {
      console.error("Create Menu Error:", {
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
      
      // V2 API error handling
      Alert.alert(
        "Error",
        err.response?.data?.detail || err.message || "Failed to create menu item"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Create Menu" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Menu Name 
              </Text>
              <TextInput
                style={[
                  styles.input,
                  (errors.name || errors.nameFormat) && styles.inputError,
                ]}
                value={formData.name}
                onChangeText={(text) => {
                  // Only allow letters, numbers, and spaces
                  const sanitizedText = text.replace(/[^a-zA-Z0-9\s]/g, '');
                  setFormData({ ...formData, name: sanitizedText });
                  setErrors({
                    ...errors,
                    name: !sanitizedText.trim() ? "Menu name is required" : null,
                    nameFormat: null, // No need for format error since we prevent special characters
                  });
                }}
                placeholder="Enter menu item name"
                maxLength={50}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
              {errors.nameFormat && (
                <Text style={styles.errorText}>{errors.nameFormat}</Text>
              )}
            </View>
          </View>

          {/* Category and Type */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
               <Text style={styles.required}>*</Text> Menu Category 
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  errors.menu_cat_id && styles.inputError,
                ]}
              >
                <Picker
                  selectedValue={formData.menu_cat_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, menu_cat_id: value });
                    if (errors.menu_cat_id)
                      setErrors({ ...errors, menu_cat_id: null });
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
              {errors.menu_cat_id && (
                <Text style={styles.errorText}>{errors.menu_cat_id}</Text>
              )}
            </View>

            {/* Food Type Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Food Type 
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  errors.food_type && styles.inputError,
                ]}
              >
                <Picker
                  selectedValue={formData.food_type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, food_type: value });
                    if (errors.food_type)
                      setErrors({ ...errors, food_type: null });
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
              {errors.food_type && (
                <Text style={styles.errorText}>{errors.food_type}</Text>
              )}
            </View>

            {/* Spicy Index Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Spicy Index</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.spicy_index}
                  onValueChange={(value) => {
                    setFormData({ ...formData, spicy_index: value });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Spicy Index" value="" />
                  <Picker.Item label="1" value="1" />
                  <Picker.Item label="2" value="2" />
                  <Picker.Item label="3" value="3" />
                </Picker>
              </View>
              {/* Spicy index is optional */}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Ratings
            </Text>
            <View style={[
              styles.pickerContainer,
              errors.ratings && styles.inputError
            ]}>
              <Picker
                selectedValue={formData.ratings}
                onValueChange={(value) => {
                  setFormData({ ...formData, ratings: value });
                  if (value) {
                    setErrors({ ...errors, ratings: null });
                  } else {
                    setErrors({ ...errors, ratings: 'Please select rating' });
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select Rating" value="" />
                {ratingOptions.map((rating) => (
                  <Picker.Item
                    key={rating.value}
                    label={rating.label}
                    value={rating.value}
                  />
                ))}
              </Picker>
            </View>
            {errors.ratings && (
              <Text style={styles.errorText}>{errors.ratings}</Text>
            )}
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Offer (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.offer}
                onChangeText={(text) =>
                  setFormData({ ...formData, offer: text })
                }
                keyboardType="numeric"
                placeholder="Enter offer percentage"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.description && styles.inputError,
                ]}
                value={formData.description}
                onChangeText={(text) => {
                  setFormData({ ...formData, description: text });
                  setErrors({ ...errors, description: false });
                }}
                placeholder="Enter menu item description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ingredients</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.ingredients && styles.inputError,
                ]}
                value={formData.ingredients}
                onChangeText={(text) => {
                  setFormData({ ...formData, ingredients: text });
                  setErrors({ ...errors, ingredients: false });
                }}
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
                  thumbColor={
                    formData.is_special === "True" ? "#fff" : "#f4f3f4"
                  }
                  ios_backgroundColor="#ddd"
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      is_special: value ? "True" : "False",
                    })
                  }
                  value={formData.is_special === "True"}
                />
              </View>
            </View>
          </View>

          {/* Portion Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portion Details</Text>
            {formData.portions.map((portion, index) => (
              <View key={index} style={styles.portionContainer}>
                <View style={styles.portionHeader}>
                  <Text style={styles.portionTitle}>Portion {index + 1}</Text>
                  {index > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        const newPortions = formData.portions.filter((_, i) => i !== index);
                        setFormData({ ...formData, portions: newPortions });
                      }}
                      style={styles.removePortionButton}
                    >
                      <FontAwesome name="trash" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Portion Name
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={portion.portion_name}
                    onChangeText={(text) => {
                      const newPortions = [...formData.portions];
                      newPortions[index].portion_name = text;
                      setFormData({ ...formData, portions: newPortions });
                    }}
                    placeholder="e.g., Full, Half, Regular"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Price
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={portion.price}
                    onChangeText={(text) => {
                      const formattedPrice = formatPriceInput(text);
                      const newPortions = [...formData.portions];
                      newPortions[index].price = formattedPrice;
                      setFormData({ ...formData, portions: newPortions });
                    }}
                    keyboardType="numeric"
                    placeholder="Enter price"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>
                      <Text style={styles.required}>*</Text> Unit Value
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={portion.unit_value}
                      onChangeText={(text) => {
                        const newPortions = [...formData.portions];
                        newPortions[index].unit_value = text.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, portions: newPortions });
                      }}
                      keyboardType="numeric"
                      placeholder="e.g., 250"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>
                      <Text style={styles.required}>*</Text> Unit Type
                    </Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={portion.unit_type}
                        onValueChange={(value) => {
                          const newPortions = [...formData.portions];
                          newPortions[index].unit_type = value;
                          setFormData({ ...formData, portions: newPortions });
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Unit" value="" />
                        <Picker.Item label="gm" value="gm" />
                        <Picker.Item label="ml" value="ml" />
                        <Picker.Item label="pieces" value="pieces" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {formData.portions.length < 3 && (
              <TouchableOpacity
                style={styles.addPortionButton}
                onPress={() => {
                  if (formData.portions.length < 3) {
                    setFormData({
                      ...formData,
                      portions: [
                        ...formData.portions,
                        {
                          portion_name: "",
                          price: "",
                          unit_value: "",
                          unit_type: "",
                          flag: formData.portions.length
                        }
                      ]
                    });
                  }
                }}
              >
                <FontAwesome name="plus" size={16} color="#fff" />
                <Text style={styles.addPortionButtonText}>Add Portion</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Menu Image (Max 5)</Text>
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
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
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Menu Item</Text>
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
    backgroundColor: "#fff",
  },
  form: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputWrapper: {
    minHeight: 70,
  },
  label: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 5,
  },
  picker: {
    // height: 50,
  },
  required: {
    color: "red",
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  section: {
    marginBottom: 20,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 10,
    color: "#666",
  },
  imageButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: {
    color: "#fff",
    marginLeft: 10,
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
  validationContainer: {
    height: 20,
    marginTop: 5,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    lineHeight: 16,
  },
  portionContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  portionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  removePortionButton: {
    padding: 5,
  },
  addPortionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#67B279',
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
  },
  addPortionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
});
