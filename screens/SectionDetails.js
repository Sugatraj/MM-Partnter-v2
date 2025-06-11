import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SectionDetails({ route, navigation }) {
  const { sectionId, outlet_id, section_name } = route.params;
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [sectionDetails, setSectionDetails] = useState(null);
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
      fetchSectionDetails();
      fetchTables();
    }, [sectionId])
  );

  const fetchSectionDetails = async () => {
    console.log('-----------Fetching section details for sectionId--------:', sectionId);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const userData = await AsyncStorage.getItem("userData");
      const parsedUserData = JSON.parse(userData);

      if (!parsedUserData?.user_id) {
        throw new Error("User ID not found");
      }

      const response = await axios({
        method: 'POST',
        url: `${COMMON_BASE_URL}/section_view`,
        data: {
          outlet_id: route.params.restaurantId,
          section_id: parseInt(sectionId),
          app_source: "partner_app",
          user_id: parsedUserData.user_id,
          app_source: "partner_app"
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });

      // New V2 API response handling
      if (response.data.data) {
        // Format the response to match what the UI expects
        const formattedSectionDetails = {
          ...response.data.data,
          // Add any additional fields that your UI might need
          // If your UI components expect certain fields, add them here with default values
          tables: [], // If your UI expects a tables array
          outlet_code: route.params.outlet_code
        };
        
        setSectionDetails(formattedSectionDetails);
      } else {
        throw new Error('Failed to load section details');
      }
    } catch (err) {
      console.error('Error loading section details:', err);
      
      // Check for 401 unauthorized
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      setError('Failed to load section details');
    }
  };

  const fetchTables = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      setLoading(true);
      setError(null);

      const { restaurantId } = route.params;

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/get_table_list`,
        data: {
          outlet_id: restaurantId.toString(),
          section_id: sectionId.toString(),
          app_source: "partner_app"
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle V2 API response
      if (response.data.data) {
        const transformedData = response.data.data.map(table => ({
          table_id: table.table_number?.toString(), // Use table_number as table_id since it's unique
          table_number: table.table_number,
          outlet_code: route.params.outlet_code // Get outlet_code from route params since it's not in API response
        }));

        // Sort tables by table number
        const sortedTables = transformedData.sort((a, b) => {
          if (a.table_number === null) return 1;
          if (b.table_number === null) return -1;
          return parseInt(a.table_number) - parseInt(b.table_number);
        });
        
        setTables(sortedTables);
      } else {
        throw new Error('Failed to load tables');
      }
    } catch (err) {
      console.error('Error loading tables:', err);
      
      // Check for 401 unauthorized
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      setError('Failed to load tables');
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewTable = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataStr);
      const { restaurantId } = route.params;

      if (!deviceToken) {
        throw new Error('Device token not found');
      }

      if (!userData?.user_id) {
        throw new Error('User ID not found');
      }

      console.log(
        `Attempting to create table: outlet_id=${restaurantId}, section_id=${sectionId}`
      );

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/table_create`,
        data: {
          outlet_id: parseInt(restaurantId),
          section_id: parseInt(sectionId),
          device_token: deviceToken,
          user_id: userData.user_id,
          app_source: "partner_app"
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Create table response:', JSON.stringify(response.data));

      if (response.data.st === 1) {
        fetchTables();
      } else {
        throw new Error(response.data.Msg || "Failed to create table");
      }
    } catch (err) {
      console.error("Error creating table:", err);
      
      // Check for 401 unauthorized
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      Alert.alert("Error", err.response?.data?.Msg || "Failed to create table");
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchSectionDetails(),
      fetchTables()
    ]).finally(() => setRefreshing(false));
  }, [sectionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Section Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={sectionDetails?.section_name || section_name || "Section Details"} showBack={true} showMenu={true} />
      <View style={styles.tablesContainer}>
        <View style={styles.tablesHeader}>
          {/* <Text style={styles.sectionName}>{sectionDetails?.section_name || section_name}</Text> */}
          <View style={styles.tablesHeaderLeft}>
            <Text style={styles.tablesTitle}>Tables ({tables.length})</Text>
          </View>
          <TouchableOpacity 
            style={styles.addTableButton}
            onPress={() => createNewTable(outlet_id)}
          >
            <FontAwesome name="plus" size={16} color="#fff" />
            <Text style={styles.addTableButtonText}>Add Table</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={tables}
          keyExtractor={(item) => item.table_id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.tableCard}
              onPress={() => navigation.navigate('TableDetails', {
                tableId: item.table_id,
                sectionId: sectionId,
                restaurantId: route.params.restaurantId,
                outletCode: item.outlet_code,
              })}
            >
              <View style={styles.tableInfo}>
                <Text style={styles.tableNumber}>
                  Table {item.table_number || '-'}
                </Text>
                {/* <Text style={styles.tableCode}>
                  {item.outlet_code || 'No code assigned'}
                </Text> */}
              </View>
              <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.tablesList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {error || 'No tables found'}
            </Text>
          }
          refreshControl={
            <RefreshControl 
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#67B279"]}
              tintColor="#67B279"
            />
          }
        />
      </View>

      {/* Add FAB for updating section */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('UpdateSection', {
          sectionId: sectionId,
          restaurantId: route.params.restaurantId
        })}
      >
        <FontAwesome name="edit" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tablesContainer: {
    flex: 1,
  },
  tablesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tablesHeaderLeft: {
    flex: 1,
  },
  tablesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#67B279',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTableButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  tableCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableInfo: {
    flex: 1,
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tableCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  tablesList: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 24,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#67B279',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 



