import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Switch,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from 'expo-image-picker';
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function UpdateOwnerScreen({ route, navigation }) {
  const { user_id } = route.params;
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    owner_id: user_id,
    name: "",
    mobile: "",
    email: "",
    dob: "",
    aadhar_number: "",
    address: "",
    photo: "",
    role: "owner",
    created_by: null,
    created_on: "",
    updated_by: null,
    updated_on: "",
    outlet_status: false,
  });
  const [errors, setErrors] = useState({
    name: false,
    mobile: false,
    email: false,
    dob: false,
    aadhar_number: false,
    address: false,
  });

  const parseAndFormatDate = (dateString) => {
    if (!dateString) return "";
    
    // Handle date format like "23 Jan 2025"
    const parts = dateString.split(" ");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${day.padStart(2, '0')}-${month}-${year}`;
    }
    
    // Fallback for other formats
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return "";
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await axios.post(
          `${PARTNER_BASE_URL}/owner/view`,
          { owner_id: user_id },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.st === 1) {
          const ownerData = response.data.data.owner_obj;
          console.log("Owner Data from API:", ownerData);
          
          setFormData(prev => ({
            ...prev,
            name: ownerData.name || "",
            mobile: ownerData.mobile || "",
            email: ownerData.email || "",
            address: ownerData.address || "",
            dob: ownerData.dob ? parseAndFormatDate(ownerData.dob) : "",
            aadhar_number: ownerData.aadhar_number || "",
            outlet_status: ownerData.outlet_status || false,
            created_on: ownerData.created_on || "",
            updated_on: ownerData.updated_on || "",
            created_by: ownerData.created_by || null,
            updated_by: ownerData.updated_by || null,
          }));
        } else {
          throw new Error(response.data.Msg || "Failed to load profile details");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        Alert.alert("Error", "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user_id]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForAPI = (dateString) => {
    if (!dateString) return "";
    try {
      // Handle date format like "29-Dec-2024"
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day} ${month} ${year}`;  // Convert to "29 Dec 2024" format
      }
      return "";
    } catch (error) {
      console.error("Date formatting error:", error);
      return "";
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[selectedDate.getMonth()];
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      
      setFormData(prev => ({
        ...prev,
        dob: formattedDate
      }));
    }
  };

  const validateMobile = (mobile) => {
    // Check if number is 10 digits and starts with 6,7,8, or 9
    return /^[6-9]\d{9}$/.test(mobile);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateAadhar = (aadhar) => {
    return /^\d{12}$/.test(aadhar);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    let newErrors = { ...errors };
    
    switch (field) {
      case "name":
        newErrors.name = !value.trim();
        break;
      case "mobile":
        if (value.length > 0) {
          if (value.length !== 10) {
            newErrors.mobile = true;
          } else if (!/^[6-9]/.test(value)) {
            newErrors.mobile = true;
          } else {
            newErrors.mobile = false;
          }
        } else {
          newErrors.mobile = true;
        }
        break;
      case "email":
        newErrors.email = value.length > 0 && !validateEmail(value);
        break;
      case "aadhar_number":
        newErrors.aadhar_number = value.length > 0 && !validateAadhar(value);
        break;
      case "address":
        newErrors.address = !value.trim();
        break;
    }
    
    setErrors(newErrors);
  };

  const validateForm = () => {
    console.log("=== Starting Form Validation ===");
    console.log("Validating Form Data:", {
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      dob: formData.dob,
      aadhar: formData.aadhar_number,
      address: formData.address,
    });

    let newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = true;
      isValid = false;
    }
    if (!formData.mobile || !validateMobile(formData.mobile)) {
      newErrors.mobile = true;
      isValid = false;
    }
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      newErrors.email = true;
      isValid = false;
    }
    if (!formData.dob) {
      newErrors.dob = true;
      isValid = false;
    }
    if (!formData.aadhar_number || !validateAadhar(formData.aadhar_number)) {
      newErrors.aadhar_number = true;
      isValid = false;
    }
    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters long";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStatusToggle = (value) => {
    setFormData(prev => ({
      ...prev,
      outlet_status: value
    }));
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Format the date before sending
      const dobFormatted = formatDateForAPI(formData.dob);
      if (!dobFormatted) {
        Alert.alert("Error", "Invalid date format. Please select a valid date.");
        return;
      }

      const formDataToSend = new FormData();
      const updateData = {
        user_id: user_id.toString(),
        name: formData.name.trim(),
        mobile_number: formData.mobile.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        dob: dobFormatted,
        aadhar_number: formData.aadhar_number.trim(),
        outlet_status: formData.outlet_status ? "true" : "false",
        created_on: formData.created_on || "",
        updated_on: formData.updated_on || "",
        created_by: formData.created_by || null,
        updated_by: formData.updated_by || null,
      };

      console.log("Sending update data:", updateData);

      Object.keys(updateData).forEach(key => {
        formDataToSend.append(key, updateData[key]);
      });

      const response = await axios.post(
        `${COMMON_BASE_URL}/update_profile_detail`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.st === 1) {
        console.log("--- update_profile_detail ---", response.data);
        Alert.alert("Success", "Profile updated successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(response.data.Msg || "Failed to update profile");
      }
    } catch (err) {
      console.error("Update Error:", err);
      const errorMessage = err.response?.data?.msg || err.message || "Failed to update profile";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setFormData(prev => ({
          ...prev,
          photo: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const getInputStyle = (field) => [
    styles.input,
    errors[field] && styles.inputError
  ];

  const StatusToggle = () => (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleLabel}>
        <Text style={styles.label}>Outlet Status</Text>
        <Text style={styles.statusText}>
          {formData.outlet_status ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Switch
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={formData.outlet_status ? "#67B279" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
        onValueChange={handleStatusToggle}
        value={formData.outlet_status}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Update Owner" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.form}>
          {/* Profile Photo Section */}
          {/* <View style={styles.photoSection}>
            <View style={styles.photoContainer}>
              {formData.photo ? (
                <>
                  <Image
                    source={{ uri: formData.photo }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.changePhotoButton} 
                    onPress={handleImagePick}
                  >
                    <FontAwesome name="camera" size={16} color="#FFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.addPhotoButton} 
                  onPress={handleImagePick}
                >
                  <FontAwesome name="camera" size={40} color="#67B279" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View> */}

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("name")}
                value={formData.name}
                onChangeText={(text) => handleInputChange("name", text)}
                placeholder="Enter full name"
              />
              {errors.name && (
                <Text style={styles.errorText}>Name is required</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                <Text style={styles.label}>
                  Mobile <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={getInputStyle("mobile")}
                  value={formData.mobile}
                  onChangeText={(text) => handleInputChange("mobile", text.replace(/[^0-9]/g, ""))}
                  placeholder="10-digit mobile"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {errors.mobile && (
                  <Text style={styles.errorText}>
                    {formData.mobile.length === 0 
                      ? "Mobile number is required"
                      : formData.mobile.length !== 10 
                      ? "Mobile number must be 10 digits"
                      : "Mobile number should start with 6, 7, 8, or 9"}
                  </Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>
                  Date of Birth <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateInput, errors.dob && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={formData.dob ? styles.dateText : styles.placeholderText}>
                    {formData.dob || "Select Date of Birth"}
                  </Text>
                  <FontAwesome name="calendar" size={20} color="#666" />
                </TouchableOpacity>
                {errors.dob && (
                  <Text style={styles.errorText}>Date of birth is required</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("email")}
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text.toLowerCase())}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>Please enter a valid email address</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Aadhar Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={getInputStyle("aadhar_number")}
                value={formData.aadhar_number}
                onChangeText={(text) => handleInputChange("aadhar_number", text.replace(/[^0-9]/g, ""))}
                placeholder="12-digit Aadhar number"
                keyboardType="numeric"
                maxLength={12}
              />
              {errors.aadhar_number && (
                <Text style={styles.errorText}>Please enter a valid 12-digit Aadhar number</Text>
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
                  handleInputChange("address", text);
                  if (text.trim().length >= 5 && errors.address) {
                    setErrors(prev => ({ ...prev, address: null }));
                  }
                }}
                placeholder="Enter complete address"
                multiline
                numberOfLines={3}
              />
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            <StatusToggle />

            {/* Account Information Section */}
            {/* <View style={[styles.section, styles.accountInfoSection]}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>Created By</Text>
                </View>
                <View style={styles.infoValue}>
                  <Text style={styles.infoValueText}>
                    {formData.created_by || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>Created On</Text>
                </View>
                <View style={styles.infoValue}>
                  <Text style={styles.infoValueText}>
                    {formData.created_on ? formatDate(formData.created_on) : "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>Updated By</Text>
                </View>
                <View style={styles.infoValue}>
                  <Text style={styles.infoValueText}>
                    {formData.updated_by || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>Updated On</Text>
                </View>
                <View style={styles.infoValue}>
                  <Text style={styles.infoValueText}>
                    {formData.updated_on ? formatDate(formData.updated_on) : "-"}
                  </Text>
                </View>
              </View>
            </View> */}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Update Owner</Text>
            )}
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.dob ? new Date(formData.dob) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
  },
  changePhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#67B279',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#67B279',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    marginTop: 8,
    color: '#67B279',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: '#DC2626',
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  submitButton: {
    backgroundColor: '#67B279',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputError: {
    borderColor: "#DC2626",
    borderWidth: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  toggleLabel: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  accountInfoSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    flex: 1,
  },
  infoLabelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    flex: 2,
  },
  infoValueText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
  },
});
