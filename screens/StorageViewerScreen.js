import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { FontAwesome } from '@expo/vector-icons';

export default function StorageViewerScreen({ navigation }) {
  const [storageData, setStorageData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = {};
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          result[key] = value;
        } catch (error) {
          result[key] = `Error reading value: ${error.message}`;
        }
      }
      
      setStorageData(result);
    } catch (error) {
      console.error('Error loading storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadStorageData();
  };

  const formatValue = (value) => {
    try {
      // Try to parse JSON if the value is a JSON string
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, return as is
      return value;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#67B279" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Storage Viewer"
        showBack={true}
        showMenu={false}
        rightComponent={
          <TouchableOpacity onPress={refreshData} style={styles.refreshButton}>
            <FontAwesome name="refresh" size={24} color="#67B279" />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.scrollView}>
        {Object.entries(storageData).map(([key, value]) => (
          <View key={key} style={styles.storageItem}>
            <Text style={styles.keyText}>{key}</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>
                {formatValue(value)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  storageItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  keyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#67B279',
    marginBottom: 8,
  },
  valueContainer: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  valueText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  refreshButton: {
    padding: 8,
  },
}); 