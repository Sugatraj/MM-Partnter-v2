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
import { useOwners } from "../hooks/useOwners";
import { useRestaurants } from "../hooks/useRestaurants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function CreateRestaurant({ navigation }) {
  const { createRestaurant } = useRestaurants();
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    fssainumber: "",
    gstnumber: "",
    mobile: "",
    address: "",
    outlet_type: "outlet",
    veg_nonveg: "Veg",
    service_charges: "",
    gst: "",
    upi_id: "",
    outlet_status: "True",
    is_open: true,
    whatsapp: "",
    instagram: "",
    facebook: "",
    website: "",
    google_review: "",
    google_business_link: "",
    opening_time: "10:00 AM",
    closing_time: "10:00 PM",
    owner_id: "",
  });
  const [errors, setErrors] = useState({
    name: false,
    fssainumber: false,
    mobile: false,
    address: false,
    outlet_type: false,
    veg_nonveg: false,
    outlet_status: false,
    owner_id: false,
    time: null,
  });

  // Load owners from AsyncStorage
  useEffect(() => {
    const loadOwners = async () => {
      try {
        setLoadingOwners(true);
        const ownersData = await AsyncStorage.getItem("owners");
        const parsedOwners = ownersData ? JSON.parse(ownersData) : [];
        setOwners(parsedOwners);
      } catch (error) {
        console.error("Error loading owners:", error);
      } finally {
        setLoadingOwners(false);
      }
    };

    loadOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoadingOwners(true);
      const response = await axios.get(`${PARTNER_BASE_URL}/owner/list`);
      if (response.data.status === 1) {
        setOwners(response.data.data);
      } else {
        console.error('Failed to fetch owners');
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
      Alert.alert('Error', 'Failed to load owners list');
    } finally {
      setLoadingOwners(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleImagePick = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

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

  const validateFSSAI = (number) => {
    // Check if it's exactly 14 digits
    return /^\d{14}$/.test(number);
  };

  const formatFSSAINumber = (text) => {
    // Remove any non-digit characters
    return text.replace(/[^0-9]/g, '');
  };

  const validateMobile = (number) => {
    return /^\d{10}$/.test(number);
  };

  const validateGST = (number) => {
    if (!number) return true; // GST is optional
    return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[\d|A-Z]{1}$/.test(number);
  };

  const validateWebURL = (url) => {
    if (!url) return true; // URLs are optional
    const pattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
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

  const showTimePicker = (timeType) => {
    if (Platform.OS === 'web') {
      // Web platforms will use the time input directly
      return;
    }
    
    // Android/iOS platforms will use the native picker
    const currentDate = new Date();
    
    DateTimePickerAndroid.open({
      value: currentDate,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          const formattedTime = selectedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).toUpperCase();
          
          // Update the form data with the new time
          setFormData(prev => {
            const newFormData = {
              ...prev,
              [timeType]: formattedTime
            };
            
            // Immediately validate if both times are set
            if (newFormData.opening_time && newFormData.closing_time) {
              if (newFormData.opening_time === newFormData.closing_time) {
                setErrors(prev => ({
                  ...prev,
                  time: "Opening and closing time cannot be the same"
                }));
              } else {
                setErrors(prev => ({
                  ...prev,
                  time: null
                }));
              }
            }
            
            return newFormData;
          });
        }
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const validateTimes = () => {
    if (formData.opening_time === formData.closing_time) {
      setErrors(prev => ({
        ...prev,
        time: "Opening and closing time cannot be the same"
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, time: null }));
    return true;
  };

  const handleSubmit = async () => {
    // Validate times before proceeding
    if (!validateTimes()) {
      Alert.alert("Validation Error", "Opening and closing time cannot be the same");
      return;
    }

    try {
      setLoading(true);

      // Comprehensive validation
      const validationErrors = {
        // Required fields with specific formats
        name: !formData.name?.trim()
          ? "Outlet name is required"
          : formData.name.length < 3
          ? "Name must be at least 3 characters"
          : "",

        fssainumber: !formData.fssainumber
          ? "FSSAI number is required"
          : !validateFSSAI(formData.fssainumber)
          ? "FSSAI number must be 14 digits"
          : "",

        mobile: !formData.mobile
          ? "Mobile number is required"
          : !validateMobile(formData.mobile)
          ? "Mobile number must be 10 digits"
          : "",

        address: !formData.address?.trim()
          ? "Address is required"
          : formData.address.length < 5
          ? "Address must be at least 5 characters"
          : "",

        opening_time: !formData.opening_time
          ? "Opening time is required"
          : !validateTime(formData.opening_time)
          ? "Invalid time format (e.g., 10:00 AM)"
          : "",

        closing_time: !formData.closing_time
          ? "Closing time is required"
          : !validateTime(formData.closing_time)
          ? "Invalid time format (e.g., 11:00 PM)"
          : "",

        // Optional fields with format validation
        gstnumber:
          formData.gstnumber && !validateGST(formData.gstnumber)
            ? "Invalid GST number format"
            : "",

        service_charges: !validatePercentage(formData.service_charges)
          ? "Service charges must be between 0 and 100"
          : "",

        gst: !validatePercentage(formData.gst)
          ? "GST percentage must be between 0 and 100"
          : "",

        // website:
        //   formData.website && !validateWebURL(formData.website)
        //     ? "Invalid website URL"
        //     : "",

        // facebook:
        //   formData.facebook && !validateWebURL(formData.facebook)
        //     ? "Invalid Facebook URL"
        //     : "",

        // instagram:
        //   formData.instagram && !validateWebURL(formData.instagram)
        //     ? "Invalid Instagram URL"
        //     : "",

        // google_business_link:
        //   formData.google_business_link &&
        //   !validateWebURL(formData.google_business_link)
        //     ? "Invalid Google Business URL"
        //     : "",

        // google_review:
        //   formData.google_review &&
        //   (isNaN(formData.google_review) ||
        //     parseFloat(formData.google_review) < 0 ||
        //     parseFloat(formData.google_review) > 5)
        //     ? "Review rating must be between 0 and 5"
        //     : "",

        owner_id: !formData.owner_id
          ? "Please select an owner"
          : "",
      };

      // Filter out empty error messages
      const errors = Object.entries(validationErrors)
        .filter(([_, value]) => value !== "")
        .map(([field, message]) => ({ field, message }));

      if (errors.length > 0) {
        setErrors(
          errors.reduce(
            (acc, { field, message }) => ({
              ...acc,
              [field]: true,
            }),
            {}
          )
        );

        Alert.alert("Validation Error", errors[0].message, [{ text: "OK" }]);
        return;
      }

      // Format data according to API contract exactly
      const restaurantData = {
        user_id: formData.owner_id.toString(),
        name: formData.name.trim(),
        fssainumber: formData.fssainumber.trim(),
        gstnumber: formData.gstnumber?.trim() || "",
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        outlet_type: formData.outlet_type,
        veg_nonveg: formData.veg_nonveg,
        service_charges: formData.service_charges?.toString() || "0",
        gst: formData.gst?.toString() || "0",
        upi_id: formData.upi_id?.trim() || "",
        outlet_status: formData.outlet_status,
        is_open: formData.is_open,
        whatsapp: formData.whatsapp?.trim() || "",
        instagram: formData.instagram?.trim() || "",
        facebook: formData.facebook?.trim() || "",
        website: formData.website?.trim() || "",
        google_review: formData.google_review?.toString() || "0",
        google_business_link: formData.google_business_link?.trim() || "",
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
      };

      console.log("Creating restaurant with data:", restaurantData);

      const response = await axios.post(
        `${PARTNER_BASE_URL}/manage/restaurant/create`,
        restaurantData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Create restaurant response:", response.data);

      if (response.data.st === 1) {
        Alert.alert(
          "Success",
          response.data.Msg || "Restaurant created successfully",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Handle API error response
        throw new Error(response.data.msg || response.data.Msg || "Failed to create restaurant");
      }
    } catch (err) {
      console.error("Create Restaurant Error:", {
        message: err.message,
        response: err.response?.data || err.response,
      });
      Alert.alert(
        "Error",
        err.message || "Failed to create restaurant"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
  };

  const getInputStyle = (fieldName) => [
    styles.input,
    errors[fieldName] && styles.inputError,
  ];

  const handleTimeChange = (type, time) => {
    setFormData(prev => ({
      ...prev,
      [type]: time
    }));
    // Validate times whenever either time changes
    validateTimes();
  };

  if (loadingOwners) {
    return (
      <View style={styles.container}>
        <Header title="Create Restaurant" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Create Restaurant" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

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
              {errors.name && (
                <Text style={styles.errorText}>
                  Outlet name is required
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                FSSAI Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("fssainumber")}
                value={formData.fssainumber}
                onChangeText={(text) => {
                  const formattedNumber = formatFSSAINumber(text);
                  setFormData({ ...formData, fssainumber: formattedNumber });
                  setErrors({ ...errors, fssainumber: false });
                }}
                placeholder="Enter FSSAI number"
                keyboardType="numeric"
                maxLength={14}
              />
              {errors.fssainumber && (
                <Text style={styles.errorText}>
                  FSSAI number must be 14 digits
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                GST Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("gstnumber")}
                value={formData.gstnumber}
                onChangeText={(text) => {
                  // Remove any special characters and convert to uppercase
                  const formattedGST = text
                    .replace(/[^A-Z0-9]/gi, "")
                    .toUpperCase();
                  setFormData({ ...formData, gstnumber: formattedGST });
                  setErrors({ ...errors, gstnumber: false });
                }}
                placeholder="Enter GST number"
                autoCapitalize="characters"
                maxLength={15} // Limit to 15 characters
              />
              {errors.gstnumber && (
                <Text style={styles.errorText}>
                  GST number must be 15 characters
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Select Owner <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  style={styles.picker}
                  selectedValue={formData.owner_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, owner_id: value })
                  }
                >
                  <Picker.Item label="Select an owner" value="" />
                  {owners.map((owner) => (
                    <Picker.Item
                      key={owner.user_id}
                      label={owner.name}
                      value={owner.user_id}
                    />
                  ))}
                </Picker>
              </View>
              {errors.owner_id && (
                <Text style={styles.errorText}>Please select an owner</Text>
              )}
            </View>

            <View style={styles.timeContainer}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.label}>
                  Opening Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.timeInput,
                    errors.time && styles.inputError,
                  ]}
                  onPress={() => showTimePicker("opening_time")}
                >
                  <Text
                    style={
                      formData.opening_time
                        ? styles.timeText
                        : styles.placeholderText
                    }
                  >
                    {formData.opening_time || "Select time"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.label}>
                  Closing Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.timeInput,
                    errors.time && styles.inputError,
                  ]}
                  onPress={() => showTimePicker("closing_time")}
                >
                  <Text
                    style={
                      formData.closing_time
                        ? styles.timeText
                        : styles.placeholderText
                    }
                  >
                    {formData.closing_time || "Select time"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.time && (
              <Text style={[styles.errorText, styles.timeErrorText]}>
                Opening and closing time cannot be the same
              </Text>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Restaurant Type <Text style={styles.required}>*</Text>
              </Text>
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
              <Text style={styles.label}>
                Status <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  style={styles.picker}
                  selectedValue={formData.outlet_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, outlet_status: value })
                  }
                >
                  <Picker.Item label="Active" value="True" />
                  <Picker.Item label="Inactive" value="False" />
                </Picker>
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Is Open</Text>
              <Switch
                value={formData.is_open}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_open: value })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mobile Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("mobile")}
                placeholder="Enter 10 digit mobile number"
                value={formData.mobile}
                onChangeText={(text) => {
                  const formattedNumber = formatPhoneNumber(text);
                  setFormData({ ...formData, mobile: formattedNumber });
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.mobile && (
                <Text style={styles.errorText}>
                  Please enter a valid 10-digit mobile number
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Address <Text style={styles.required}>*</Text>
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
              {errors.address && (
                <Text style={styles.errorText}>Address is required</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Veg/Non-veg <Text style={styles.required}>*</Text>
              </Text>
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
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Service Charges <Text style={styles.required}>*</Text>
              </Text>
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
              <Text style={styles.label}>
                GST <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter GST"
                value={formData.gst}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, gst: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                UPI ID <Text style={styles.required}>*</Text>
              </Text>
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
                placeholder="Enter WhatsApp Number"
                value={formData.whatsapp}
                onChangeText={(text) => {
                  const formattedNumber = formatPhoneNumber(text);
                  setFormData({ ...formData, whatsapp: formattedNumber });
                }}
                keyboardType="numeric"
                maxLength={10}
              />
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
            <View style={styles.imageUploadContainer}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleImagePick}
              >
                <FontAwesome name="image" size={24} color="#666" />
                <Text style={styles.imageButtonText}>
                  {formData.image ? "Change Image" : "Choose Image"}
                </Text>
              </TouchableOpacity>

              {formData.image && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <FontAwesome name="trash" size={20} color="#DC2626" />
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {formData.image && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: formData.image }}
                  style={styles.previewImage}
                />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Restaurant</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
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
  picker: {
    height: 50,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  addOwnerButton: {
    marginTop: 8,
    padding: 8,
  },
  addOwnerButtonText: {
    color: "#67B279",
    fontSize: 14,
    fontWeight: "500",
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
    color: '#FF0000',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  timeInputContainer: {
    flex: 0.48, // Takes up slightly less than half the width to account for spacing
    marginBottom: 0, // Override the default marginBottom from inputGroup
  },
  timeInput: {
    justifyContent: 'center',
    height: 45,
    ...(Platform.OS === 'web' && {
      appearance: 'none',
      paddingRight: 10,
      cursor: 'pointer',
    }),
  },
  timeText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  removeImageText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  timeErrorText: {
    textAlign: 'left',
    width: '100%',
    marginTop: -10,
    marginBottom: 15,
  },
});
