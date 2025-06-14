import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TableDetails({ route, navigation }) {
  const { tableId, sectionId, restaurantId, outletCode } = route.params;
  const [table, setTable] = useState(null);
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

  useEffect(() => {
    loadTableDetails();
  }, [tableId]);

  const loadTableDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const userData = await AsyncStorage.getItem("userData");
      const parsedUserData = JSON.parse(userData);

      if (!parsedUserData?.user_id) {
        throw new Error("User ID not found");
      }

      setLoading(true);
      console.log('Loading table details:', { tableId, restaurantId });

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/table_view`,
        data: {
          table_number: parseInt(tableId),
          outlet_id: parseInt(restaurantId),
          section_id: parseInt(sectionId),
          app_source: "partner_app",
          user_id: parsedUserData.user_id
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Table View API Response:', response.data);

      // Handle V2 API response
      if (response.data.data) {
        // Transform the data to match UI expectations if needed
        const formattedTableData = {
          ...response.data.data,
          // Add any additional fields that your UI might expect
          // Convert section_id to section_name if UI expects it that way
          section_name: response.data.data.section_id, // since V2 sends section name in section_id field
          // Add any other fields your UI components might expect
        };
        
        setTable(formattedTableData);
      } else {
        throw new Error('Invalid table data received');
      }
    } catch (error) {
      console.error('Error loading table details:', {
        message: error.message,
        response: error.response?.data
      });
      
      // Check for 401 unauthorized
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      Alert.alert('Error', error.message || 'Failed to load table details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    console.log('Restaurant ID:', restaurantId);

    Alert.alert(
      'Delete Table',
      'Are you sure you want to delete this table? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("accessToken");
              const userData = await AsyncStorage.getItem("userData");
              const parsedUserData = JSON.parse(userData);

              if (!parsedUserData?.user_id) {
                throw new Error("User ID not found");
              }

              console.log('Attempting to delete table:', { tableId: table.table_id, restaurantId });

              const response = await axios({
                method: "DELETE",
                url: `${COMMON_BASE_URL}/table_delete`,
                data: {
                  table_id: parseInt(table.table_id),
                  outlet_id: parseInt(restaurantId),
                  section_id: parseInt(sectionId),
                  user_id: parsedUserData.user_id,
                  app_source: "partner_app"
                },
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              console.log('Delete table response:', response.data);

              // V2 API success response handling
              if (response.status === 200) {
                Alert.alert(
                  'Success',
                  response.data.detail || 'Table deleted successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.navigate('SectionDetails', {
                          sectionId,
                          restaurantId,
                          refresh: true
                        });
                      }
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Error deleting table:', {
                message: error.message,
                response: error.response?.data
              });

              // Check for 401 unauthorized
              if (
                error.response?.status === 401 || 
                error.response?.data?.code === 'token_not_valid' ||
                error.response?.data?.detail?.includes('token not valid')
              ) {
                await handleUnauthorized();
                return;
              }

              // Handle specific error messages from V2 API
              const errorMessage = error.response?.data?.detail || 'Failed to delete table';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTableDetails().finally(() => setRefreshing(false));
  }, [tableId, restaurantId, sectionId]);

  return (
    <View style={styles.container}>
      <Header title="Table Details" showBack={true} showMenu={true} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67B279" />
        </View>
      ) : !table ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Table not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#67B279"]}
              tintColor="#67B279"
            />
          }
        >
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: table.qr_code_url }}
              style={styles.qrCode}
              resizeMode="contain"
            />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.tableNumber}>Table {table.table_number}</Text>
            <Text style={styles.sectionName}>Section: {table.section_name}</Text>
            {/* <Text style={styles.outletCode}>Code: {table.outlet_code}</Text> */}
          </View>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <FontAwesome name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Table</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 24,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  infoContainer: {
    alignItems: 'center',
  },
  tableNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  outletCode: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 