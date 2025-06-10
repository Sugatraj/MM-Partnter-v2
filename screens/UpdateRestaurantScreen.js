import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function UpdateRestaurantScreen({ route, navigation }) {
  const { restaurantId, outlet_code, owner_id } = route.params;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  // Removed owners state
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  

  // Modified useEffect to handle the data fetching sequence
  useEffect(() => {

    const fetchRestaurantDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching restaurant details with:", {
          outlet_id: restaurantId,
          user_id: owner_id
        });

        // Get authentication token and device token
        const userData = await AsyncStorage.getItem('userData');
        const parsedUserData = JSON.parse(userData);
        const accessToken = parsedUserData?.access_token;
        const deviceToken = await AsyncStorage.getItem('devicePushToken');

        if (!accessToken) {
          throw new Error("Access token not found");
        }

        if (!deviceToken) {
          throw new Error("Device token not found");
        }

        const response = await axios.post(
          `${COMMON_BASE_URL}/view_outlet`,
          {
            outlet_id: restaurantId?.toString(),
            user_id: owner_id?.toString(),
            device_token: deviceToken,
            app_source: "partner"
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            }
          }
        );

        console.log("Restaurant API Response:", response.data);

        // Check if we have data in the response
        if (response.data.data) {
          const restaurantData = response.data.data;

          setFormData({
            name: restaurantData.name || "",
            fssainumber: restaurantData.fssainumber || "",
            gstnumber: restaurantData.gstnumber || "",
            mobile: restaurantData.mobile || "",
            address: restaurantData.address || "",
            outlet_type: restaurantData.outlet_type || "outlet",
            veg_nonveg: restaurantData.veg_nonveg || "veg",
            service_charges: restaurantData.service_charges?.toString() || "",
            gst: restaurantData.gst?.toString() || "",
            upi_id: restaurantData.upi_id || "",
            outlet_status: restaurantData.outlet_status === 1 || restaurantData.outlet_status === true,
            is_open: restaurantData.is_open === 1 || restaurantData.is_open === true,
            whatsapp: restaurantData.whatsapp || "",
            instagram: restaurantData.instagram || "",
            facebook: restaurantData.facebook || "",
            website: restaurantData.website || "",
            google_review: restaurantData.google_review?.toString() || "",
            google_business_link: restaurantData.google_business_link || "",
            opening_time: restaurantData.opening_time || "",
            closing_time: restaurantData.closing_time || "",
            owner_id: restaurantData.owner_id?.toString() || "",
            owner_name: restaurantData.owner_name || "",
            image: restaurantData.image || null,
          });
        } else {
          throw new Error("No restaurant data found");
        }
      } catch (error) {
        console.error("Error fetching restaurant details:", error);
        const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch restaurant details";
        setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const initializeData = async () => {
      await fetchRestaurantDetails();
    };

    initializeData();
  }, [restaurantId, owner_id]);

  const validateFSSAI = (number) => {
    if (!number) return false; // FSSAI is required
    return /^\d{14}$/.test(number);
  };

  const validateMobile = (number) => {
    return /^\d{10}$/.test(number);
  };

  const validateGST = (number) => {
    if (!number) return true; // GST is optional
    // GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + Z + 1 digit
    return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}\d{1}$/.test(number);
  };

  const validateWebURL = (url) => {
    if (!url) return true; // URLs are optional
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return pattern.test(url);
  };

  const validateTime = (time) => {
    // Accepts formats: "HH:MM AM/PM" or "HH AM/PM"
    const pattern = /^(0?[1-9]|1[0-2])(?::[0-5][0-9])?\s*(?:AM|PM)$/i;
    return pattern.test(time);
  };

  const validatePercentage = (value) => {
    if (!value) return true; // Optional
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  const formatPhoneNumber = (text) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Limit to 10 digits
    return cleaned.slice(0, 10);
  };

  const validateWhatsApp = (value) => {
    // Allow either a 10-digit number or text with numbers
    return /^[a-zA-Z0-9\s]+$/.test(value) || /^\d{10}$/.test(value);
  };

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setFormData({ ...formData, image: result.assets[0].uri });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image");
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate required fields and GST number
      const validationErrors = {
        name: !formData.name?.trim()
          ? "Outlet name is required"
          : formData.name.length < 3
          ? "Name must be at least 3 characters"
          : "",

        mobile: !formData.mobile
          ? "Mobile number is required"
          : !validateMobile(formData.mobile)
          ? "Mobile number must be 10 digits"
          : "",

        veg_nonveg: !formData.veg_nonveg
          ? "Please select whether the outlet is veg or non-veg"
          : "",

        fssainumber: !formData.fssainumber
          ? "FSSAI number is required"
          : !validateFSSAI(formData.fssainumber)
          ? "FSSAI number must be exactly 14 digits"
          : "",

        gstnumber: formData.gstnumber && !validateGST(formData.gstnumber)
          ? "Please enter a valid GST number (e.g., 29ABCDE1234F1Z5)"
          : ""
      };

      // Filter out empty error messages
      const errors = Object.entries(validationErrors)
        .filter(([_, value]) => value !== "")
        .map(([field, message]) => ({ field, message }));

      if (errors.length > 0) {
        setErrors(
          errors.reduce(
            (acc, { field }) => ({
              ...acc,
              [field]: true,
            }),
            {}
          )
        );

        Alert.alert("Validation Error", errors[0].message);
        setSubmitting(false);
        return;
      }

      // Get authentication token
      const userData = await AsyncStorage.getItem('userData');
      const parsedUserData = JSON.parse(userData);
      const accessToken = parsedUserData?.access_token;

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      // Get device token
      const deviceToken = await AsyncStorage.getItem('devicePushToken');
      if (!deviceToken) {
        throw new Error("Device token not found");
      }
      
      // Prepare the request data according to the new API format
      const requestData = {
        outlet_id: restaurantId?.toString(),
        user_id: owner_id?.toString(),
        name: formData.name?.trim(),
        outlet_type: formData.outlet_type,
        fssainumber: formData.fssainumber?.trim() || "",
        gstnumber: formData.gstnumber?.trim() || "",
        mobile: formData.mobile?.trim(),
        veg_nonveg: formData.veg_nonveg,
        service_charges: formData.service_charges || "0",
        gst: formData.gst || "0",
        address: formData.address?.trim() || "",
        is_open: formData.is_open ? 1 : 0,
        outlet_status: formData.outlet_status ? 1 : 0,
        upi_id: formData.upi_id?.trim() || "",
        website: formData.website?.trim() || "",
        whatsapp: formData.whatsapp?.trim() || "",
        facebook: formData.facebook?.trim() || "",
        instagram: formData.instagram?.trim() || "",
        google_business_link: formData.google_business_link?.trim() || "",
        google_review: formData.google_review?.toString() || "",
        app_source: "partner",
        device_token: deviceToken
      };

      console.log("Sending update request with data:", requestData);

      const response = await axios({
        method: 'PATCH',
        url: `${COMMON_BASE_URL}/update_outlet`,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log("Update API Response:", response.data);

      // Handle the new response format
      if (response.data.detail) {
        Alert.alert(
          "Success",
          response.data.detail,
          [
            {
              text: "OK",
              onPress: () => navigation.navigate('ViewRestaurant', {
                restaurantId,
                outlet_code,
                owner_id,
                timestamp: new Date().getTime() // Add timestamp to force refresh
              }),
            },
          ],
          { cancelable: false }
        );
      } else {
        throw new Error("Unexpected response format");
      }

    } catch (err) {
      console.error("Update Error:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to update restaurant";
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getInputStyle = (fieldName) => [
    styles.input,
    errors[fieldName] && styles.inputError,
  ];

  const validateMobileStart = (number) => {
    if (number.length > 0) {
      const firstDigit = parseInt(number[0]);
      return !(firstDigit >= 1 && firstDigit <= 5);
    }
    return true;
  };

  React.useEffect(() => {
    const handleBackPress = () => {
      // Replace current screen with ViewRestaurant
      navigation.replace('ViewRestaurant', {
        restaurantId,
        timestamp: new Date().getTime()
      });
      return true; // Prevent default back behavior
    };

    // Override the back button behavior
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackPress}>
          <FontAwesome name="arrow-left" size={24} color="#000" style={{ marginLeft: 15 }} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, restaurantId]);

  if (loading || !formData) {
    return (
      <View style={styles.container}>
        <Header title="Update Restaurant" showBack={true} showMenu={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#67B279" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Update Restaurant" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Update Restaurant" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner Name</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{formData.owner_name || '-'}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Outlet Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("name")}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  setErrors({ ...errors, name: false });
                }}
                placeholder="Enter outlet name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                FSSAI Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[getInputStyle("fssainumber"), !validateFSSAI(formData.fssainumber) && styles.inputError]}
                value={formData.fssainumber}
                onChangeText={(text) => {
                  // Only allow numbers and limit to 14 digits
                  const numericValue = text.replace(/[^0-9]/g, '').slice(0, 14);
                  setFormData({ ...formData, fssainumber: numericValue });
                  setErrors({ ...errors, fssainumber: false });
                }}
                placeholder="Enter 14 digit FSSAI number"
                keyboardType="numeric"
                maxLength={14}
              />
              {formData.fssainumber && !validateFSSAI(formData.fssainumber) && (
                <Text style={styles.errorText}>
                  Please enter a valid 14-digit FSSAI number
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Number</Text>
              <TextInput
                style={getInputStyle("gstnumber")}
                value={formData.gstnumber}
                onChangeText={(text) => {
                  // Convert to uppercase and remove any spaces
                  const upperText = text.replace(/\s/g, '').toUpperCase();
                  setFormData({ ...formData, gstnumber: upperText });
                  setErrors({ ...errors, gstnumber: false });
                }}
                placeholder="Enter GST number (e.g., 29ABCDE1234F1Z5)"
                autoCapitalize="characters"
                maxLength={15}
              />
              {formData.gstnumber && !validateGST(formData.gstnumber) && (
                <Text style={styles.errorText}>
                  Please enter a valid GST number (e.g., 29ABCDE1234F1Z5)
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Restaurant Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  style={styles.picker}
                  selectedValue={formData.outlet_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, outlet_type: value })
                  }
                >
                  <Picker.Item label="Outlet" value="outlet" />
                  <Picker.Item label="Hotel" value="hotel" />
                  <Picker.Item label="Mess" value="mess" />
                  <Picker.Item label="Canteen" value="canteen" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  style={styles.picker}
                  selectedValue={formData.outlet_status ? "True" : "False"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, outlet_status: value === "True" })
                  }
                >
                  <Picker.Item label="Active" value="True" />
                  <Picker.Item label="Inactive" value="False" />
                </Picker>
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Restaurant open</Text>
              <Switch
                value={formData.is_open}
                onValueChange={(value) => {
                  console.log("Switch toggled to:", value);
                  setFormData(prevData => ({
                    ...prevData,
                    is_open: value
                  }));
                }}
                trackColor={{ false: "#767577", true: "#67B279" }}
                thumbColor={formData.is_open ? "#fff" : "#f4f3f4"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mobile Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  getInputStyle("mobile"),
                  !validateMobileStart(formData.mobile) && styles.inputError
                ]}
                placeholder="Enter 10 digit mobile number"
                value={formData.mobile}
                onChangeText={(text) => {
                  const formattedNumber = formatPhoneNumber(text);
                  if (formattedNumber.length > 0) {
                    const firstDigit = parseInt(formattedNumber[0]);
                    if (firstDigit >= 1 && firstDigit <= 5) {
                      setErrors((prev) => ({
                        ...prev,
                        mobile: true,
                        mobileStartError:
                          "Mobile number must start with digits 6 to 9",
                      }));
                      return;
                    }
                  }
                  setFormData({ ...formData, mobile: formattedNumber });
                  setErrors(prev => ({
                    ...prev,
                    mobile: false,
                    mobileStartError: null
                  }));
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.mobileStartError ? (
                <Text style={styles.errorText}>{errors.mobileStartError}</Text>
              ) : errors.mobile && (
                <Text style={styles.errorText}>
                  Please enter a valid 10-digit mobile number
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Address
              </Text>
              <TextInput
                style={[getInputStyle("address"), styles.textArea]}
                value={formData.address}
                onChangeText={(text) => {
                  setFormData({ ...formData, address: text });
                  setErrors({ ...errors, address: false });
                }}
                placeholder="Enter address"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Veg/Non-veg</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  style={styles.picker}
                  selectedValue={formData.veg_nonveg}
                  onValueChange={(value) =>
                    setFormData({ ...formData, veg_nonveg: value })
                  }
                >
                  <Picker.Item label="Veg" value="veg" />
                  <Picker.Item label="Non-veg" value="nonveg" />
                  {/* <Picker.Item label="Both" value="Both" /> */}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Charges (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Service Charges"
                value={formData.service_charges}
                keyboardType="numeric"
                onChangeText={(text) =>
                  setFormData({ ...formData, service_charges: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter GST"
                value={formData.gst}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, gst: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>UPI ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter UPI ID"
                value={formData.upi_id}
                onChangeText={(text) =>
                  setFormData({ ...formData, upi_id: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter WhatsApp Number or Username"
                value={formData.whatsapp}
                onChangeText={(text) => {
                  // Remove any special characters except spaces
                  const sanitizedText = text.replace(/[^a-zA-Z0-9\s]/g, '');
                  setFormData({ ...formData, whatsapp: sanitizedText });
                }}
                keyboardType="default"
                maxLength={30}
              />
              {formData.whatsapp && !validateWhatsApp(formData.whatsapp) && (
                <Text style={styles.errorText}>
                  Please enter a valid WhatsApp number or username
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Instagram URL"
                value={formData.instagram}
                onChangeText={(text) =>
                  setFormData({ ...formData, instagram: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Facebook URL"
                value={formData.facebook}
                onChangeText={(text) =>
                  setFormData({ ...formData, facebook: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Website URL"
                value={formData.website}
                onChangeText={(text) =>
                  setFormData({ ...formData, website: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Google Review</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Google Review URL"
                value={formData.google_review}
                onChangeText={(text) =>
                  setFormData({ ...formData, google_review: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Google Business Link</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Google Business URL"
                value={formData.google_business_link}
                onChangeText={(text) =>
                  setFormData({ ...formData, google_business_link: text })
                }
              />
            </View>
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Restaurant Image</Text>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleImagePick}
            >
              <FontAwesome name="image" size={24} color="#666" />
              <Text style={styles.imageButtonText}>Choose Image</Text>
            </TouchableOpacity>
            {formData.image && (
              <Image
                source={{ uri: formData.image }}
                style={styles.previewImage}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Update Restaurant</Text>
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
    backgroundColor: '#fff',
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
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: 200,
    marginTop: 10,
    borderRadius: 5,
  },
  submitButton: {
    backgroundColor: "#67B279",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "#fff",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  required: {
    color: "#DC2626",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#DC2626",
    borderWidth: 1,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: 'rgba(245, 245, 245, 0.5)',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#000',
    padding: 10,
  },
});
