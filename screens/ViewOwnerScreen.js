import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ownerService } from "../services/ownerService";
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to format date in DD-MMM-YYYY format
const formatDateForAPI = (date) => {
  if (!date) return "";
  const d = new Date(date);
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
  const day = d.getDate().toString().padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper function to format dates for display
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = [
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
    ][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return "-";
  }
};

// Helper function to format date time for display
const formatDateTime = (dateString) => {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const day = date.getDate().toString().padStart(2, "0");
    const month = [
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
    ][date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    return "Invalid Date";
  }
};

export default function ViewOwnerScreen({ route, navigation }) {
  const { ownerData } = route.params;
  const [owner, setOwner] = useState(ownerData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOwner = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      const response = await axios.post(
        `${PARTNER_BASE_URL}/owner/view`,
        {
          owner_id: ownerData.ownerId || ownerData.owner_id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        }
      );

      console.log("View API Response:", response.data);

      if (response.data.data) {
        const ownerDetails = response.data.data.owner_obj;
        const subscriptionDetails = response.data.data.subscription_outlet || [];
        console.log("---------------Owner Details:-----------", ownerDetails);
        console.log("---------------Subscription Details:-----------", subscriptionDetails);

        // Transform the data while preserving existing fields
        const transformedData = {
          // Keep all existing data
          ...ownerData,

          // Update with new data from API
          name: ownerDetails.name || ownerData.name,
          mobile: ownerDetails.mobile || ownerData.mobile,
          email: ownerDetails.email || ownerData.email,
          role: ownerDetails.role || ownerData.role,
          address: ownerDetails.address || ownerData.address,
          dob: ownerDetails.dob || ownerData.dob,
          aadhar_number: ownerDetails.aadhar_number || ownerData.aadhar_number,
          updated_on: ownerDetails.updated_on || ownerData.updated_on,
          outlet_status: ownerDetails.outlet_status ?? ownerData.outlet_status,
          last_login: ownerDetails.last_login,
          created_on: ownerDetails.created_on,
          created_by: ownerDetails.created_by,
          updated_by: ownerDetails.updated_by,

          // Add subscription details
          subscriptions: subscriptionDetails.map(sub => ({
            ...sub,
            // Ensure dates are in the correct format if needed
            subscription_date: sub.subscription_date,
            expiry_date: sub.expiry_date,
            days_until_expiry: parseInt(sub.days_until_expiry)
          })),

          // Preserve IDs
          id: ownerData.user_id,
          user_id: ownerDetails.user_id,
        };

        console.log("Transformed Owner Data:", transformedData);
        setOwner(transformedData);
      } else {
        throw new Error("Failed to load owner details - Invalid response format");
      }
    } catch (err) {
      console.error("View API Error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = "Failed to load owner details";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [ownerData]);

  useFocusEffect(
    useCallback(() => {
      loadOwner();
    }, [loadOwner])
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Owner",
      "Are you sure you want to delete this owner?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);

              // Get the correct owner_id from the owner object
              const ownerId = owner?.owner_id || owner?.id;

              // Log the request data
              console.log("Delete Request Data:", {
                owner_id: ownerId,
              });

              const response = await axios.post(
                `${PARTNER_BASE_URL}/owner/delete`,
                {
                  owner_id: ownerId, // Use the correct owner_id
                },
                {
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                }
              );

              // Detailed logging of response
              console.log("Delete API Response Status:", response.status);
              console.log("Delete API Response Headers:", response.headers);
              console.log("Delete API Response Data:", response.data);

              if (response.data.status === 1) {
                console.log("Owner deleted successfully");
                Alert.alert("Success", "Owner deleted successfully", [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                console.warn("Delete API Error Response:", response.data);
                setError(response.data.message || "Failed to delete owner");
                Alert.alert(
                  "Error",
                  response.data.message || "Failed to delete owner"
                );
              }
            } catch (err) {
              // Detailed error logging
              console.error("Delete API Error Details:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                headers: err.response?.headers,
              });
              setError(err.response?.data?.message || "Failed to delete owner");
              Alert.alert("Error", "Failed to delete owner. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              "Delete Owner",
              "Are you sure you want to delete this owner?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: handleDelete, style: "destructive" },
              ]
            );
          }}
        >
          <FontAwesome name="trash" size={24} color="red" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, owner]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="View Owner" showBack={true} showMenu={true} />
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="View Owner" showBack={true} showMenu={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadOwner}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="View Owner" showBack={true} showMenu={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Profile Header Section */}
        {/* <View style={styles.profileHeader}>
          <View style={styles.imageContainer}>
            {owner?.photo ? (
              <Image
                source={{ uri: owner.photo }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <FontAwesome name="user-circle" size={80} color="#D1D5DB" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{owner?.name}</Text>
          <Text style={styles.profileRole}>{owner?.role}</Text>
        </View> */}

        {/* Contact Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="user" size={20} color="#4B5563" />
            <Text style={styles.cardTitle}>Basic Information</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow icon="user-circle" label="Name" value={owner?.name} />
            <InfoRow
              icon="id-badge"
              label="Role"
              value={owner?.role?.toUpperCase()}
            />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FontAwesome name="circle" size={16} color="#4B5563" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <StatusBadge active={owner?.outlet_status === true} />
              </View>
            </View>
          </View>

          <View style={styles.cardHeader}>
            <FontAwesome name="address-card" size={20} color="#4B5563" />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow icon="phone" label="Mobile" value={owner?.mobile} />
            <InfoRow icon="envelope" label="Email" value={owner?.email} />
            <InfoRow icon="map-marker" label="Address" value={owner?.address} />
          </View>
        </View>

        {/* Personal Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="user" size={20} color="#4B5563" />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow
              icon="calendar"
              label="Date of Birth"
              value={formatDate(owner?.dob)}
            />
            <InfoRow
              icon="id-card"
              label="Aadhar Number"
              value={owner?.aadhar_number}
              // monospace
            />
          </View>
        </View>

        {/* Subscription Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="star" size={20} color="#4B5563" />
            <Text style={styles.cardTitle}>Subscription Details</Text>
          </View>
          {owner?.subscriptions && owner.subscriptions.length > 0 ? (
            owner.subscriptions.map((subscription, index) => (
              <View key={index} style={[styles.cardContent, index > 0 && styles.subscriptionDivider]}>
                <View style={styles.outletHeader}>
                  <FontAwesome name="building" size={16} color="#4B5563" />
                  <Text style={styles.outletTitle}>{subscription.outlet_name || `Outlet ${index + 1}`}</Text>
                </View>
                <InfoRow
                  icon="tag"
                  label="Plan"
                  value={subscription.subscription_name || 'Basic'}
                />
                <InfoRow
                  icon="calendar-check-o"
                  label="Start Date"
                  value={subscription.subscription_date || '-'}
                />
                <InfoRow
                  icon="calendar-times-o"
                  label="Expiry Date"
                  value={subscription.expiry_date || '-'}
                />
                <View style={styles.daysProgressSection}>
                  <View style={styles.daysProgressLabel}>
                    <FontAwesome name="hourglass-half" size={16} color="#4B5563" />
                    <Text style={styles.infoLabel}>Days Until Expiry</Text>
                  </View>
                  <DaysProgressBar 
                    daysRemaining={parseInt(subscription.days_until_expiry || '0')} 
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.cardContent}>
              <Text style={styles.noSubscriptionText}>No subscription information available</Text>
            </View>
          )}
        </View>

        {/* Account Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="info-circle" size={20} color="#4B5563" />
            <Text style={styles.cardTitle}>Account Status</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow
              icon="clock-o"
              label="Created On"
              value={owner?.created_on || "-"}
            />
            <InfoRow
              icon="user"
              label="Created By"
              value={owner?.created_by || "-"}
            />
            <InfoRow
              icon="refresh"
              label="Updated On"
              value={owner?.updated_on || "-"}
            />
            <InfoRow
              icon="user"
              label="Updated By"
              value={owner?.updated_by || "-"}
            />
            <InfoRow
              icon="clock-o"
              label="Last Login"
              value={owner?.last_login || "-"}
            />
            {/* <StatusBadge active={owner?.outlet_status} /> */}
          </View>
        </View>

       

        {/* Delete Button */}
        {/* <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <FontAwesome name="trash" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete Owner</Text>
        </TouchableOpacity> */}
      </ScrollView>

      {/* Edit FAB */}
      {/* <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("UpdateOwner", {
            user_id: owner.user_id, // Only pass user_id instead of whole ownerData
          })
        }
      >
        <FontAwesome name="edit" size={24} color="white" />
      </TouchableOpacity> */}
    </SafeAreaView>
  );
}

// InfoRow Component
const InfoRow = ({ icon, label, value, monospace }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <FontAwesome name={icon} size={16} color="#6B7280" />
    </View>
    <View style={styles.infoContent}>
      <Text style={[styles.infoValue, monospace && styles.monospaceText]}>
        {value || "-"}
      </Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  </View>
);

// StatusBadge Component
const StatusBadge = ({ active }) => (
  <View
    style={[
      styles.statusBadge,
      active ? styles.statusActive : styles.statusInactive,
    ]}
  >
    <Text
      style={[
        styles.statusText,
        active ? styles.statusTextActive : styles.statusTextInactive,
      ]}
    >
      {active ? "Active" : "Inactive"}
    </Text>
  </View>
);

// DaysProgressBar Component
const DaysProgressBar = ({ daysRemaining }) => {
  const totalDays = 365;
  const progress = Math.min(daysRemaining / totalDays, 1);
  const progressWidth = `${progress * 100}%`;
  
  // Determine color based on remaining days
  const getProgressColor = () => {
    if (daysRemaining > 180) return '#22C55E'; // Green for > 6 months
    if (daysRemaining > 90) return '#F59E0B';  // Yellow for 3-6 months
    return '#EF4444';  // Red for < 3 months
  };

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {daysRemaining} days remaining
        </Text>
        <Text style={styles.totalDaysText}>
          of {totalDays} days
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { 
              width: progressWidth,
              backgroundColor: getProgressColor()
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  subscriptionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
    paddingTop: 16,
  },
  outletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
  },
  outletTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  noSubscriptionText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  totalDaysText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  daysProgressSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  daysProgressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom:10,
  },

  // New styles for enhanced UI
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  imageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#374151',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    width: 32,
    alignItems: "center",
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#6B7280",
  },
  monospaceText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#67B279",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tableScrollContent: {
    paddingBottom: 8,
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerCell: {
    backgroundColor: '#F3F4F6',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left',
  },
  cellText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'left',
  },
  noDataText: {
    textAlign: 'center',
    width: '100%',
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
