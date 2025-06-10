import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function ManageSections({ route, navigation }) {
  const { restaurantId, outlet_id, outlet_code, owner_id } = route.params;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      loadSections();
    }, [restaurantId])
  );

  const loadSections = async () => {
    console.log('Loading sections with restaurantId:', restaurantId);
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      if (!deviceToken) {
        throw new Error("Device token not found");
      }
      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/section_listview`,
        data: {
          outlet_id: parseInt(restaurantId),
          device_token: deviceToken
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Sections Response:", response.data);

      if (response.data.st === 1) {
        setSections(response.data.data);
      } else {
        throw new Error(response.data.Msg || "Failed to load sections");
      }
    } catch (error) {
      console.error("Error loading sections:", error);
      
      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      Alert.alert("Error", "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (item) => {
    Alert.alert(
      "Delete Section",
      `Are you sure you want to delete "${item.section_name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("Deleting section:", item);
            const url = `${COMMON_BASE_URL}/section_delete`;

            const deviceToken = await AsyncStorage.getItem("devicePushToken");
            if (!deviceToken) {
              Alert.alert("Error", "Device token not found");
              return;
            }

            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = JSON.parse(userData);
            if (!parsedUserData?.user_id) {
              Alert.alert("Error", "User data not found");
              return;
            }

            const data = {
              user_id: parsedUserData.user_id,
              outlet_id: parseInt(restaurantId),
              section_id: parseInt(item.section_id),
              device_token: deviceToken
            };

            try {
              const token = await AsyncStorage.getItem("accessToken");
              const response = await axios.post(url, data, {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                 
                },
              });

              console.log("Response Data:", response.data);

              if (response.data.st === 1) {
                Alert.alert("Success", "Section deleted successfully!");
                loadSections();
              } else {
                const errorMessage = response.data.message || "Failed to delete section";
                Alert.alert("Error", errorMessage);
              }
            } catch (error) {
              console.error("Error deleting section:", error);
              
              // Check for 401 unauthorized
              if (
                error.response?.status === 401 || 
                error.response?.data?.code === 'token_not_valid' ||
                error.response?.data?.detail?.includes('token not valid')
              ) {
                await handleUnauthorized();
                return;
              }

              if (error.response) {
                if (error.response.status === 400) {
                  alert(`Error: ${error.response.data.Msg}`);
                } else {
                  alert(`Error: ${error.response.status} - ${error.response.data.Msg || 'Unknown error'}`);
                }
              } else {
                alert('Error: ' + error.message);
              }
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const sectionTableCount = item.tables?.length || 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            console.log("Navigating to SectionDetails:", {
              sectionId: item.section_id,
              outlet_id: outlet_id,
              outlet_code: item.outlet_code,
              owner_id: owner_id,
            });
            navigation.navigate("SectionDetails", {
              section_name: item.section_name,
              restaurantId: restaurantId,
              sectionId: item.section_id,
              outlet_id: outlet_id,
              outlet_code: item.outlet_code,
              owner_id: owner_id,
            });
          }}
        >
          <View style={styles.leftContent}>
            <Text style={styles.sectionName}>{item.section_name}</Text>
            <Text style={styles.createdDate}>
              Table Count: {item.table_count}
            </Text>
          </View>
          <View style={styles.rightContent}>
            {/* Add Delete Button on the Right Side */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteSection(item)}
            >
              <FontAwesome name="trash" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadSections().finally(() => setRefreshing(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Manage Sections" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Manage Sections" showBack={true} showMenu={true} />
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.section_id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#67B279"]}
            tintColor="#67B279"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sections found</Text>
            <Text style={styles.emptySubText}>
              Tap the + button to create one
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("CreateSection", {
            restaurantId,
            outlet_id,
            outlet_code,
            owner_id,
          })
        }
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  rightContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: "#666",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
  },
});
